import { chromium } from "file:///C:/src/lobster-feeds-validation/src/lobster_web/node_modules/@playwright/test/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";

const targetUrl =
  process.env.LOBSTER_302_URL ??
  "https://lobster.eus-ia302.gateway.prod.island.powerapps.com/?gateway=prod-302eus#/feeds";
const outDir =
  process.env.LOBSTER_302_RECORDING_DIR ??
  path.resolve(`C:/tmp/lobster-feeds-302-live-${timestamp()}`);
const waitMs = Number(process.env.LOBSTER_302_WAIT_MS ?? 30 * 60 * 1000);
const browserChannel = process.env.LOBSTER_302_BROWSER_CHANNEL ?? "msedge";
const userDataDir =
  process.env.LOBSTER_302_EDGE_PROFILE ?? path.resolve("C:/tmp/lobster-feeds-302-edge-profile");

function timestamp() {
  return new Date().toISOString().replaceAll(":", "").replaceAll(".", "-");
}

function isFeedUrl(url) {
  return /\/v1\/scout\/feeds\//.test(url);
}

function sanitizeUrl(raw) {
  const url = new URL(raw);
  url.search = "";
  url.hash = "";
  return url.toString();
}

await fs.mkdir(outDir, { recursive: true });

const feedEvents = [];
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: browserChannel,
  headless: false,
  args: ["--start-maximized"],
  viewport: null,
  recordVideo: { dir: outDir, size: { width: 1440, height: 960 } },
});

let page = context.pages()[0] ?? (await context.newPage());

page.on("request", (request) => {
  const url = request.url();
  if (!isFeedUrl(url)) return;
  feedEvents.push({
    kind: "request",
    method: request.method(),
    url: sanitizeUrl(url),
    at: new Date().toISOString(),
  });
});

page.on("response", async (response) => {
  const url = response.url();
  if (!isFeedUrl(url)) return;

  const event = {
    kind: "response",
    url: sanitizeUrl(url),
    status: response.status(),
    at: new Date().toISOString(),
    contentType: response.headers()["content-type"] ?? "",
  };

  try {
    const text = await response.text();
    event.preview = text.slice(0, 2000);
    try {
      const json = JSON.parse(text);
      event.feedId = json.feedId;
      event.scope = json.scope;
      event.entryCount = Array.isArray(json.entries) ? json.entries.length : undefined;
    } catch {
      // Keep the text preview only.
    }
  } catch (error) {
    event.preview = `<body unavailable: ${String(error)}>`;
  }

  feedEvents.push(event);
});

console.log(`Opening ${targetUrl}`);
console.log(`Browser channel: ${browserChannel}`);
console.log(`Persistent Edge profile: ${userDataDir}`);
console.log("Sign in in the visible browser window if prompted.");
console.log(`Artifacts: ${outDir}`);

await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
await page
  .screenshot({ path: path.join(outDir, "00-initial.png"), fullPage: true })
  .catch(() => {});

let state = "unknown";
const signInButton = page.getByRole("button", { name: /^Sign in$/i }).first();
if (await signInButton.isVisible().catch(() => false)) {
  state = "sign-in-required";
  await page
    .screenshot({ path: path.join(outDir, "01-sign-in-required.png"), fullPage: true })
    .catch(() => {});
  await signInButton.click().catch(() => {});
  await page.waitForTimeout(2000);
}

try {
  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    for (const candidate of context.pages()) {
      if (candidate.isClosed()) continue;
      if (
        await candidate
          .getByRole("heading", { name: /^Feeds$/i })
          .isVisible()
          .catch(() => false)
      ) {
        page = candidate;
        throw new Error("__FEEDS_RENDERED__");
      }
    }
    await page.waitForTimeout(1000).catch(() => {});
  }
  state = state === "sign-in-required" ? "sign-in-timeout" : "timeout";
} catch (error) {
  if (String(error).includes("__FEEDS_RENDERED__")) {
    state = "feeds-rendered";
  } else {
    throw error;
  }
}

await page
  .screenshot({ path: path.join(outDir, "01-after-wait.png"), fullPage: true })
  .catch(() => {});

if (state === "feeds-rendered") {
  const tabs = [
    ["Personal", "02-personal.png"],
    ["Tenant approved", "03-tenant-approved.png"],
    ["Marketplace", "04-marketplace.png"],
  ];

  for (const [name, file] of tabs) {
    const tab = page.getByRole("tab", { name: new RegExp(name, "i") });
    if (await tab.isVisible().catch(() => false)) {
      await tab.click().catch(() => {});
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(outDir, file), fullPage: true }).catch(() => {});
    }
  }
}

await fs.writeFile(
  path.join(outDir, "feed-network-events.json"),
  JSON.stringify({ targetUrl, state, feedEvents }, null, 2),
  "utf8",
);

const bodyText = await page
  .locator("body")
  .innerText()
  .catch(() => "<body unavailable>");
await fs.writeFile(path.join(outDir, "page-text.txt"), bodyText, "utf8");

const video = page.video();
await context.close();

const videoPath = video === null ? null : await video.path();
if (videoPath !== null) {
  const finalVideo = path.join(outDir, "lobster-302-live-feeds.webm");
  await fs.copyFile(videoPath, finalVideo);
  console.log(`video=${finalVideo}`);
}

console.log(`state=${state}`);
console.log(`artifacts=${outDir}`);
