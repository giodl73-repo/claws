import { chromium } from "file:///C:/src/lobster-feeds-validation/src/lobster_web/node_modules/@playwright/test/index.mjs";

const environments = {
  "prod-301eus": {
    url: "https://lobster.eus-ia301.gateway.prod.island.powerapps.com/?gateway=prod-301eus#/skills",
    profileDir: "C:/tmp/lobster-feeds-301-edge-profile",
  },
  "prod-302us": {
    url: "https://lobster.us-ia302.gateway.prod.island.powerapps.com/#/skills",
    profileDir: "C:/tmp/lobster-feeds-302-edge-profile",
  },
};

const envName = process.env.LOBSTER_FEEDS_E2E_ENV ?? "prod-301eus";
const env = environments[envName];
if (env === undefined) throw new Error(`Unknown LOBSTER_FEEDS_E2E_ENV=${envName}`);
const waitMs = Number(process.env.LOBSTER_FEEDS_E2E_WAIT_MS ?? 180_000);
const cleanupIds = (process.env.LOBSTER_FEEDS_E2E_CLEANUP_IDS ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const context = await chromium.launchPersistentContext(env.profileDir, {
  channel: process.env.LOBSTER_FEEDS_E2E_BROWSER_CHANNEL ?? "msedge",
  headless: false,
  args: ["--start-maximized"],
  viewport: null,
});
const page = context.pages()[0] ?? (await context.newPage());

try {
  await page.goto(env.url, { waitUntil: "domcontentloaded" });
  const token = await waitForToken(page, Date.now() + waitMs);
  const cleared = await request(page, token, "DELETE");
  if (!cleared.ok) throw new Error(`Clear failed: HTTP ${cleared.status} ${cleared.text}`);
  const cleanup = [];
  if (cleanupIds.length > 0) {
    await page.goto(env.url, { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: /^Skills$/i }).waitFor({ timeout: waitMs });
    const close = page.getByTestId("skills-create-close");
    if (await close.isVisible().catch(() => false)) await close.click();
    for (const id of cleanupIds) {
      const menu = page.getByTestId(`skill-menu-${id}`);
      if (!(await menu.isVisible().catch(() => false))) {
        cleanup.push({ id, removed: false, reason: "skill menu not found" });
        continue;
      }
      await menu.click();
      await page.getByTestId(`skill-delete-${id}`).click();
      await page.getByTestId(`skill-card-${id}`).waitFor({ state: "detached", timeout: waitMs });
      cleanup.push({ id, removed: true });
    }
  }
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const flags = await page.evaluate(async (bearer) => {
      const response = await fetch("/v1/me/web-feature-flags", {
        credentials: "same-origin",
        headers: { Authorization: `Bearer ${bearer}`, Accept: "application/json" },
      });
      return { status: response.status, body: await response.json() };
    }, token);
    if (flags.body.scout_feeds_ux_enabled === false) {
      console.log(
        JSON.stringify({ envName, cleared: true, cleanup, featureFlags: flags }, null, 2),
      );
      process.exitCode = 0;
      break;
    }
    await page.waitForTimeout(1000);
  }
} finally {
  await context.close().catch(() => {});
}

async function waitForToken(targetPage, deadline) {
  let signInStarted = false;
  while (Date.now() < deadline) {
    const result = await targetPage
      .evaluate(async () => {
        const cfg = window.__LOBSTER_RUNTIME_CONFIG__ ?? {};
        if (typeof cfg.tokenProvider !== "function") return { ok: false, hasSignIn: false };
        try {
          return { ok: true, token: await cfg.tokenProvider() };
        } catch {
          return { ok: false, hasSignIn: typeof cfg.signIn === "function" };
        }
      })
      .catch(() => ({ ok: false, hasSignIn: false }));
    if (result.ok) return result.token;
    if (!signInStarted && result.hasSignIn) {
      signInStarted = true;
      const button = targetPage.getByRole("button", { name: /^Sign in$/i }).first();
      if (await button.isVisible().catch(() => false)) await button.click().catch(() => {});
      else
        await targetPage
          .evaluate(() => window.__LOBSTER_RUNTIME_CONFIG__?.signIn?.())
          .catch(() => {});
    }
    await targetPage.waitForTimeout(1000);
  }
  throw new Error("Timed out waiting for a Lobster bearer token.");
}

async function request(targetPage, bearer, method) {
  return targetPage.evaluate(
    async ({ bearer, method }) => {
      const response = await fetch("/v1/dev/ecs-settings/scout_feeds_ux_enabled/override", {
        method,
        credentials: "same-origin",
        redirect: "error",
        headers: { Authorization: `Bearer ${bearer}`, Accept: "application/json" },
      });
      return { ok: response.ok, status: response.status, text: await response.text() };
    },
    { bearer, method },
  );
}
