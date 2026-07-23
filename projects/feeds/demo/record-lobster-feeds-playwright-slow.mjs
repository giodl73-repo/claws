import { chromium } from "file:///C:/src/lobster-feeds-validation/src/lobster_web/node_modules/@playwright/test/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.LOBSTER_FEEDS_BASE_URL ?? "http://127.0.0.1:3941";
const outDir =
  process.env.LOBSTER_FEEDS_RECORDING_DIR ??
  path.resolve("C:/tmp/lobster-feeds-playwright-recording-slow");

const feed = (scope, entries) => ({
  schemaVersion: 1,
  feedId: `${scope}-feed`,
  generatedAt: "2026-06-26T00:00:00Z",
  scope: {
    kind: scope === "personal" ? "personal" : scope === "marketplace" ? "root" : "tenantApproved",
  },
  entries,
});

const personalEntry = {
  id: "meeting-notes",
  type: "skill",
  version: "0.2.0",
  title: "Meeting Notes",
  description: "Summarizes meeting transcripts into decisions and follow-ups.",
  publisher: "Gio",
  source: { registry: "lobster", package: "meeting-notes" },
  metadata: { "source.feed": "personal" },
};

const approvedEntry = {
  id: "teams",
  type: "plugin",
  version: "2.0.0",
  title: "Teams",
  description: "Tenant-approved Teams plugin from the curated feed.",
  publisher: "Microsoft",
  source: { registry: "clawhub", package: "teams" },
  metadata: { "source.feed": "reviewed" },
};

const marketplaceEntry = {
  id: "weather",
  type: "skill",
  version: "1.2.3",
  title: "Weather",
  description: "Marketplace skill with an installable MOS3 public skill path.",
  publisher: "Microsoft",
  source: { registry: "mos3", package: "title-weather" },
  metadata: {
    "source.feed": "marketplace",
    "mos3.publicSkillPath": "https://skills.example.test/weather/SKILL.md",
  },
};

async function json(route, body, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  recordVideo: { dir: outDir, size: { width: 1440, height: 960 } },
});

const page = await context.newPage();

await page.addInitScript(() => {
  window.__LOBSTER_RUNTIME_CONFIG__ = {
    ...(window.__LOBSTER_RUNTIME_CONFIG__ ?? {}),
    tenantId: "tenant-demo",
    userId: "user-demo",
    tokenProvider: async () => "playwright-feed-token",
    signIn: async () => undefined,
    signOut: async () => undefined,
  };
});

page.on("console", (message) => {
  if (message.type() === "error") {
    console.log(`[browser:${message.type()}] ${message.text()}`);
  }
});

await page.route("**/v1/me/web-feature-flags", (route) =>
  json(route, {
    scout_feeds_ux_enabled: true,
    scout_feeds_admin_ux_enabled: true,
    web_show_chat_history: true,
  }),
);
await page.route("**/v1/route", (route) =>
  json(route, {
    publicOrigin: baseUrl,
  }),
);
await page.route("**/v1/scout/feeds/personal.json", (route) =>
  json(route, feed("personal", [personalEntry])),
);
await page.route("**/v1/scout/feeds/approved.json", (route) =>
  json(route, feed("approved", [approvedEntry])),
);
await page.route("**/v1/scout/feeds/marketplace.json", (route) =>
  json(route, feed("marketplace", [marketplaceEntry])),
);
await page.route("**/v1/scout/feeds/admin/catalog", (route) =>
  json(route, {
    schemaVersion: 1,
    tenantIdHash: "sha256:tenant",
    entries: [
      {
        id: "teams",
        type: "plugin",
        version: "2.0.0",
        title: "Teams",
        source: { registry: "clawhub", package: "teams" },
        status: "submitted",
      },
    ],
  }),
);
await page.route("**/v1/scout/feeds/marketplace/install", (route) =>
  json(route, {
    entry: marketplaceEntry,
    feed: feed("personal", [personalEntry, marketplaceEntry]),
  }),
);
await page.route("**/v1/scout/feeds/admin/marketplace/entries/*/approve", (route) =>
  json(route, {
    schemaVersion: 1,
    tenantIdHash: "sha256:tenant",
    entries: [{ ...marketplaceEntry, status: "approved" }],
  }),
);
await page.route("**/v1/scout/feeds/personal/publish", (route) =>
  json(route, {
    entry: personalEntry,
    feed: feed("personal", [personalEntry]),
    mos3: { status: "published", titleId: "title-meeting-notes" },
  }),
);
await page.route("**/v1/scout/feeds/admin/publish", (route) =>
  json(route, feed("approved", [approvedEntry, marketplaceEntry])),
);
await page.route("**/v1/scout/feeds/admin/import-source", (route) =>
  json(route, { schemaVersion: 1, tenantIdHash: "sha256:tenant", entries: [] }),
);
await page.route("**/v1/scout/feeds/admin/entries/*/approve", (route) =>
  json(route, { schemaVersion: 1, tenantIdHash: "sha256:tenant", entries: [] }),
);
await page.route("**/v1/scout/feeds/admin/entries/*/deny", (route) =>
  json(route, { schemaVersion: 1, tenantIdHash: "sha256:tenant", entries: [] }),
);

await page.goto(`${baseUrl}/?mode=auto&enableScoutFeeds=1&skipteams=1#/feeds`, {
  waitUntil: "domcontentloaded",
});

try {
  await page.getByRole("tab", { name: /Personal/i }).waitFor({ timeout: 30_000 });
} catch (error) {
  await page.screenshot({ path: path.join(outDir, "00-timeout.png"), fullPage: true });
  const body = await page
    .locator("body")
    .innerText()
    .catch(() => "<body unavailable>");
  console.log(body);
  throw error;
}
await page.waitForTimeout(3500);
await page.screenshot({ path: path.join(outDir, "01-personal-feed.png"), fullPage: true });

await page.waitForTimeout(1200);
await page.getByRole("tab", { name: /Tenant approved/i }).click();
await page.getByLabel("Feed packages").getByText("Teams", { exact: true }).waitFor();
await page.waitForTimeout(3500);
await page.screenshot({ path: path.join(outDir, "02-tenant-approved-feed.png"), fullPage: true });

await page.waitForTimeout(1200);
await page.getByRole("tab", { name: /Marketplace/i }).click();
await page.getByLabel("Feed packages").getByText("Weather", { exact: true }).waitFor();
await page.waitForTimeout(3500);
await page.screenshot({ path: path.join(outDir, "03-marketplace-feed.png"), fullPage: true });

await page.waitForTimeout(1200);
await page.getByRole("button", { name: /^Add$/ }).click();
await page
  .getByText(/Added weather/i)
  .waitFor({ timeout: 10_000 })
  .catch(() => {});
await page.waitForTimeout(3500);
await page.screenshot({ path: path.join(outDir, "04-marketplace-add.png"), fullPage: true });

await page.waitForTimeout(1200);
await page.getByLabel("Skill id").fill("meeting-notes");
await page.waitForTimeout(600);
await page.getByLabel("Version").fill("0.2.0");
await page.waitForTimeout(600);
await page.getByLabel("Title").fill("Meeting Notes");
await page.waitForTimeout(1000);
await page.getByRole("button", { name: /Publish to MOS3/i }).click();
await page.getByText(/Published meeting-notes to MOS3/i).waitFor({ timeout: 10_000 });
await page.waitForTimeout(4500);
await page.screenshot({ path: path.join(outDir, "05-publish-personal.png"), fullPage: true });

const video = page.video();
await context.close();
await browser.close();

const videoPath = video === null ? null : await video.path();
if (videoPath !== null) {
  const finalVideo = path.join(outDir, "lobster-feeds-session.webm");
  await fs.copyFile(videoPath, finalVideo);
  console.log(`video=${finalVideo}`);
}
console.log(`artifacts=${outDir}`);
