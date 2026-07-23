import { chromium } from "file:///C:/src/lobster-feeds-validation/src/lobster_web/node_modules/@playwright/test/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";

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

const envName = process.env.LOBSTER_PROBE_ENV ?? "prod-301eus";
const env = environments[envName];
if (env === undefined) {
  throw new Error(`Unknown LOBSTER_PROBE_ENV=${envName}`);
}

const outDir =
  process.env.LOBSTER_PROBE_OUT_DIR ??
  path.resolve(`C:/tmp/lobster-route-admin-${envName}-${timestamp()}`);
const waitMs = Number(process.env.LOBSTER_PROBE_WAIT_MS ?? 5 * 60 * 1000);
const browserChannel = process.env.LOBSTER_PROBE_BROWSER_CHANNEL ?? "msedge";
const userDataDir = process.env.LOBSTER_PROBE_EDGE_PROFILE ?? env.profileDir;

function timestamp() {
  return new Date().toISOString().replaceAll(":", "").replaceAll(".", "-");
}

function parseJson(text) {
  if (text.trim().length === 0) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  const base64 = parts[1].replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

async function waitForToken(page, deadline) {
  let signInStarted = false;
  while (Date.now() < deadline) {
    const result = await page
      .evaluate(async () => {
        const cfg = window.__LOBSTER_RUNTIME_CONFIG__ ?? {};
        if (typeof cfg.tokenProvider !== "function") {
          return { ok: false, reason: "tokenProvider is not available" };
        }
        try {
          const token = await cfg.tokenProvider();
          return { ok: true, token };
        } catch (error) {
          return {
            ok: false,
            reason: error instanceof Error ? error.message : String(error),
            hasSignIn: typeof cfg.signIn === "function",
          };
        }
      })
      .catch((error) => ({
        ok: false,
        reason: `page navigation while checking token: ${String(error)}`,
        hasSignIn: false,
      }));

    if (result.ok) return result.token;

    if (!signInStarted && result.hasSignIn) {
      signInStarted = true;
      console.log(`Token unavailable (${result.reason}); starting sign-in in the visible browser.`);
      const button = page.getByRole("button", { name: /^Sign in$/i }).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click().catch(() => {});
      } else {
        await page.evaluate(() => window.__LOBSTER_RUNTIME_CONFIG__?.signIn?.()).catch(() => {});
      }
    }

    if (/login\.microsoftonline\.com|signin/i.test(page.url())) {
      console.log("Waiting for interactive sign-in to return to Lobster...");
    }
    await page.waitForTimeout(1500);
  }
  throw new Error("Timed out waiting for a Lobster bearer token.");
}

async function fetchJson(page, token, route) {
  return page.evaluate(
    async ({ route, token }) => {
      const response = await fetch(route, {
        method: "GET",
        credentials: "same-origin",
        redirect: "error",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const text = await response.text();
      return {
        ok: response.ok,
        status: response.status,
        body: text,
      };
    },
    { route, token },
  );
}

await fs.mkdir(outDir, { recursive: true });
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: browserChannel,
  headless: false,
  args: ["--start-maximized"],
  viewport: null,
});

const page = context.pages()[0] ?? (await context.newPage());
console.log(`Environment: ${envName}`);
console.log(`URL: ${env.url}`);
console.log(`Profile: ${userDataDir}`);
console.log(`Artifacts: ${outDir}`);
console.log("Sign in in the visible browser window if prompted.");

await page.goto(env.url, { waitUntil: "domcontentloaded" });
const token = await waitForToken(page, Date.now() + waitMs);
const payload = decodeJwtPayload(token);

const routes = {
  route: await fetchJson(page, token, "/v1/route"),
  featureFlags: await fetchJson(page, token, "/v1/me/web-feature-flags"),
  feedDiagnostics: await fetchJson(page, token, "/v1/scout/feeds/source-diagnostics"),
};

const summary = {
  envName,
  url: env.url,
  outDir,
  token: {
    tid: payload?.tid ?? null,
    oid: payload?.oid ?? null,
    upn: payload?.upn ?? payload?.preferred_username ?? null,
    wids: payload?.wids ?? [],
    hasM365TenantAdminWid: (payload?.wids ?? []).some((wid) =>
      ["62e90394-69f5-4237-9190-012177145e10", "158c047a-c907-4556-b7ef-446551a6b5f7"].some(
        (allowed) => String(wid).trim().toLowerCase() === allowed,
      ),
    ),
  },
  route: {
    ok: routes.route.ok,
    status: routes.route.status,
    body: parseJson(routes.route.body),
  },
  featureFlags: {
    ok: routes.featureFlags.ok,
    status: routes.featureFlags.status,
    body: parseJson(routes.featureFlags.body),
  },
  feedDiagnostics: {
    ok: routes.feedDiagnostics.ok,
    status: routes.feedDiagnostics.status,
    body: parseJson(routes.feedDiagnostics.body),
  },
};

await fs.writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2), "utf8");
await page.screenshot({ path: path.join(outDir, "page.png"), fullPage: true }).catch(() => {});
await context.close();

console.log(JSON.stringify(summary, null, 2));
