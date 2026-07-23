import { chromium } from "file:///C:/src/lobster-feeds-validation/src/lobster_web/node_modules/@playwright/test/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";

const environments = {
  "prod-301eus": {
    skillsUrl:
      "https://lobster.eus-ia301.gateway.prod.island.powerapps.com/?gateway=prod-301eus#/skills",
    profileDir: "C:/tmp/lobster-feeds-301-edge-profile",
  },
  "prod-302us": {
    skillsUrl: "https://lobster.us-ia302.gateway.prod.island.powerapps.com/#/skills",
    profileDir: "C:/tmp/lobster-feeds-302-edge-profile",
  },
};

const envName = process.env.LOBSTER_FEEDS_E2E_ENV ?? "prod-301eus";
const env = environments[envName];
if (env === undefined) throw new Error(`Unknown LOBSTER_FEEDS_E2E_ENV=${envName}`);

const waitMs = Number(process.env.LOBSTER_FEEDS_E2E_WAIT_MS ?? 240_000);
const browserChannel = process.env.LOBSTER_FEEDS_E2E_BROWSER_CHANNEL ?? "msedge";
const headless = process.env.LOBSTER_FEEDS_E2E_HEADLESS === "1";
const userDataDir = process.env.LOBSTER_FEEDS_E2E_EDGE_PROFILE ?? env.profileDir;
const stamp = new Date().toISOString().replaceAll(":", "").replaceAll(".", "-");
const shortStamp = stamp.replaceAll("-", "").replace("T", "").replace("Z", "").slice(0, 14);
const testTitle = `Feeds E2E ${envName} ${shortStamp}`;
const testSkillId = testTitle
  .toLowerCase()
  .replaceAll(/[^a-z0-9]+/g, "-")
  .replaceAll(/^-|-$/g, "");
const outDir =
  process.env.LOBSTER_FEEDS_E2E_OUT_DIR ??
  path.resolve(`C:/tmp/lobster-feeds-firstrelease-e2e-${envName}-${stamp}`);

const summary = {
  envName,
  skillsUrl: env.skillsUrl,
  outDir,
  testTitle,
  testSkillId,
  initialFeedsFlag: null,
  overrideEnabled: false,
  marketplace: null,
  personalPublish: null,
  personalReadback: null,
  reloadPersistence: false,
  workspaceCleanup: [],
  overrideRestored: false,
  success: false,
  error: null,
};

await fs.mkdir(outDir, { recursive: true });
const events = [];
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: browserChannel,
  headless,
  args: ["--start-maximized"],
  viewport: null,
});
const page = context.pages()[0] ?? (await context.newPage());
let token = null;
let installedMarketplace = null;

page.on("response", async (response) => {
  const url = response.url();
  if (!/\/v1\/(?:scout\/feeds|dev\/ecs-settings|me\/web-feature-flags)/.test(url)) return;
  const event = {
    at: new Date().toISOString(),
    method: response.request().method(),
    url: sanitizeUrl(url),
    status: response.status(),
  };
  try {
    const text = await response.text();
    event.preview = text.slice(0, 3000);
  } catch (error) {
    event.preview = `<unavailable: ${String(error)}>`;
  }
  events.push(event);
});

console.log(`Environment: ${envName}`);
console.log(`Skills URL: ${env.skillsUrl}`);
console.log(`Profile: ${userDataDir}`);
console.log(`Test skill: ${testSkillId}`);
console.log(`Artifacts: ${outDir}`);

try {
  await page.goto(env.skillsUrl, { waitUntil: "domcontentloaded" });
  token = await waitForToken(page, Date.now() + waitMs);

  const initialFlags = await authenticatedJson(page, token, "/v1/me/web-feature-flags");
  summary.initialFeedsFlag = initialFlags.body?.scout_feeds_ux_enabled === true;
  if (!summary.initialFeedsFlag) {
    const enabled = await authenticatedJson(
      page,
      token,
      "/v1/dev/ecs-settings/scout_feeds_ux_enabled/override",
      { method: "POST", body: { value: true } },
    );
    if (!enabled.ok) throw new Error(`Could not enable feeds override: HTTP ${enabled.status}`);
    summary.overrideEnabled = true;
  }

  await waitForFeatureFlag(page, token, true);
  await page.goto(env.skillsUrl, { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: /^Skills$/i }).waitFor({ timeout: waitMs });
  await page
    .getByRole("textbox", { name: /^Search available skills$/i })
    .waitFor({ timeout: waitMs });

  const marketplace = await authenticatedJson(page, token, "/v1/scout/feeds/marketplace.json");
  if (!marketplace.ok || !Array.isArray(marketplace.body?.entries)) {
    throw new Error(`Marketplace feed unavailable: HTTP ${marketplace.status}`);
  }
  summary.marketplace = {
    feedId: marketplace.body.feedId ?? null,
    entryCount: marketplace.body.entries.length,
    installed: null,
  };

  const discovery = page.getByTestId("skills-feed-discovery");
  const installedIds = new Set(
    await page
      .locator('[data-testid^="skill-card-"]')
      .evaluateAll((cards) =>
        cards
          .map((card) => card.getAttribute("data-testid")?.replace(/^skill-card-/, ""))
          .filter(Boolean),
      ),
  );
  const titleCounts = new Map();
  for (const entry of marketplace.body.entries) {
    if (typeof entry.title === "string") {
      titleCounts.set(entry.title, (titleCounts.get(entry.title) ?? 0) + 1);
    }
  }
  const candidate = marketplace.body.entries.find(
    (entry) =>
      entry.type === "skill" &&
      typeof entry.id === "string" &&
      typeof entry.title === "string" &&
      titleCounts.get(entry.title) === 1 &&
      !installedIds.has(entry.id),
  );
  if (candidate === undefined) throw new Error("Marketplace had no uninstalled skill candidate.");
  const search = page.getByRole("textbox", { name: /^Search available skills$/i });
  await search.fill(candidate.title);
  const button = discovery.getByRole("button", {
    name: `Install ${candidate.title}`,
    exact: true,
  });
  await button.waitFor({ timeout: waitMs });
  await button.click();
  await page.waitForFunction(
    ({ title }) => {
      const text = document.body?.innerText ?? "";
      return text.includes(`${title} installed here.`) || text.includes(`We couldn't add ${title}`);
    },
    { title: candidate.title },
    { timeout: waitMs },
  );
  const installBody = await page.locator("body").innerText();
  if (installBody.includes(`${candidate.title} installed here.`)) {
    installedMarketplace = { title: candidate.title, id: candidate.id };
    summary.marketplace.installed = installedMarketplace;
  } else {
    throw new Error(
      installBody.match(/We couldn't add[^\n]+/)?.[0] ?? "Marketplace install did not succeed.",
    );
  }
  await screenshot(page, "01-marketplace-installed");

  await page.getByTestId("skills-create-button").click();
  await page.getByTestId("skills-create-name").fill(testTitle);
  await page
    .getByTestId("skills-create-body")
    .fill(
      `---\nname: ${testSkillId}\ndescription: FirstRelease Scout feeds E2E proof.\n---\n\n# ${testTitle}\n\nUse this temporary skill only to validate the MOS3 personal library publish and readback path.`,
    );
  await page.getByTestId("skills-create-save-library").click();
  const publishResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/v1/scout/feeds/personal/publish") &&
      response.request().method() === "POST",
    { timeout: waitMs },
  );
  await page.getByTestId("skills-create-save").click();
  const publishResponse = await publishResponsePromise;
  const publishText = await publishResponse.text();
  const publishBody = parseBody(publishText);
  summary.personalPublish = {
    status: publishResponse.status(),
    entry: publishBody?.entry ?? null,
    mos3: publishBody?.mos3 ?? null,
    responseFeedEntryCount: Array.isArray(publishBody?.feed?.entries)
      ? publishBody.feed.entries.length
      : null,
  };
  if (!publishResponse.ok()) {
    throw new Error(`Personal publish failed: HTTP ${publishResponse.status()} ${publishText}`);
  }
  if (publishBody?.mos3?.status !== "published") {
    throw new Error(
      `Personal publish did not complete synchronously: ${publishBody?.mos3?.status}`,
    );
  }
  const expectedId = publishBody?.entry?.id;
  const expectedVersion = publishBody?.entry?.version;
  if (typeof expectedId !== "string" || typeof expectedVersion !== "string") {
    throw new Error("Personal publish response did not include an exact entry id and version.");
  }
  const responseReadback = publishBody.feed.entries.some(
    (entry) => entry.id === expectedId && entry.version === expectedVersion,
  );
  if (!responseReadback)
    throw new Error("Publish response feed lacked the exact published id/version.");
  await screenshot(page, "02-personal-published");

  const personal = await authenticatedJson(page, token, "/v1/scout/feeds/personal.json");
  const exactEntry = personal.body?.entries?.find(
    (entry) => entry.id === expectedId && entry.version === expectedVersion,
  );
  summary.personalReadback = {
    status: personal.status,
    feedId: personal.body?.feedId ?? null,
    entryCount: Array.isArray(personal.body?.entries) ? personal.body.entries.length : null,
    expectedId,
    expectedVersion,
    exactEntry: exactEntry ?? null,
  };
  if (!personal.ok || exactEntry === undefined) {
    throw new Error("Independent personal.json readback lacked the exact published id/version.");
  }

  await page.goto(env.skillsUrl, { waitUntil: "domcontentloaded" });
  const testCard = page.getByTestId(`skill-card-${testSkillId}`);
  await testCard.waitFor({ timeout: waitMs });
  await testCard.getByText("In library", { exact: true }).waitFor({ timeout: waitMs });
  summary.reloadPersistence = true;
  await screenshot(page, "03-reload-persisted");

  summary.success = true;
} catch (error) {
  summary.error = String(error);
  await screenshot(page, "99-failure").catch(() => {});
  console.error(error);
} finally {
  for (const skill of [{ title: testTitle, id: testSkillId }, installedMarketplace]) {
    if (skill?.id === null || skill?.id === undefined) continue;
    try {
      const menu = page.getByTestId(`skill-menu-${skill.id}`);
      if (await menu.isVisible().catch(() => false)) {
        await menu.click();
        const deleteItem = page.getByTestId(`skill-delete-${skill.id}`);
        if (await deleteItem.isVisible().catch(() => false)) {
          await deleteItem.click();
          summary.workspaceCleanup.push({ id: skill.id, removed: true });
        }
      }
    } catch (error) {
      summary.workspaceCleanup.push({ id: skill.id, removed: false, error: String(error) });
    }
  }

  if (summary.overrideEnabled && token !== null) {
    try {
      const cleared = await authenticatedJson(
        page,
        token,
        "/v1/dev/ecs-settings/scout_feeds_ux_enabled/override",
        { method: "DELETE" },
      );
      if (!cleared.ok) throw new Error(`HTTP ${cleared.status}`);
      await waitForFeatureFlag(page, token, false);
      summary.overrideRestored = true;
    } catch (error) {
      summary.overrideRestored = false;
      summary.overrideRestoreError = String(error);
    }
  } else {
    summary.overrideRestored = true;
  }

  await fs.writeFile(path.join(outDir, "network-events.json"), JSON.stringify(events, null, 2));
  await fs.writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  await context.close().catch(() => {});
  console.log(JSON.stringify(summary, null, 2));
}

if (!summary.success || !summary.overrideRestored) process.exitCode = 1;

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

async function authenticatedJson(targetPage, bearer, route, options = {}) {
  return targetPage.evaluate(
    async ({ bearer, route, options }) => {
      const response = await fetch(route, {
        method: options.method ?? "GET",
        credentials: "same-origin",
        redirect: "error",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${bearer}`,
          ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      });
      const text = await response.text();
      let body = text;
      try {
        body = text.length === 0 ? null : JSON.parse(text);
      } catch {}
      return { ok: response.ok, status: response.status, body };
    },
    { bearer, route, options },
  );
}

async function waitForFeatureFlag(targetPage, bearer, expected) {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    const flags = await authenticatedJson(targetPage, bearer, "/v1/me/web-feature-flags");
    if (flags.body?.scout_feeds_ux_enabled === expected) return;
    await targetPage.waitForTimeout(1000);
  }
  throw new Error(`Timed out waiting for scout_feeds_ux_enabled=${expected}.`);
}

async function screenshot(targetPage, name) {
  await targetPage.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
}

function parseBody(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sanitizeUrl(raw) {
  const url = new URL(raw);
  url.search = "";
  url.hash = "";
  return url.toString();
}
