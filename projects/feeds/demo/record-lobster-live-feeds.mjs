import { chromium } from 'file:///C:/src/lobster-feeds-validation/src/lobster_web/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const environments = {
  'prod-301eus': {
    feedsUrl: 'https://lobster.eus-ia301.gateway.prod.island.powerapps.com/?gateway=prod-301eus#/feeds',
    skillsUrl: 'https://lobster.eus-ia301.gateway.prod.island.powerapps.com/?gateway=prod-301eus#/skills',
    profileDir: 'C:/tmp/lobster-feeds-301-edge-profile',
  },
  'prod-302us': {
    feedsUrl: 'https://lobster.us-ia302.gateway.prod.island.powerapps.com/#/feeds',
    skillsUrl: 'https://lobster.us-ia302.gateway.prod.island.powerapps.com/#/skills',
    profileDir: 'C:/tmp/lobster-feeds-302-edge-profile',
  },
};

const envName = process.env.LOBSTER_FEEDS_LIVE_ENV ?? 'prod-301eus';
const env = environments[envName];
if (env === undefined) {
  throw new Error(
    `Unknown LOBSTER_FEEDS_LIVE_ENV=${envName}. Expected one of: ${Object.keys(environments).join(', ')}`,
  );
}

const feedsUrl = process.env.LOBSTER_FEEDS_LIVE_FEEDS_URL ?? env.feedsUrl;
const skillsUrl = process.env.LOBSTER_FEEDS_LIVE_SKILLS_URL ?? env.skillsUrl;
const outDir =
  process.env.LOBSTER_FEEDS_LIVE_OUT_DIR ??
  path.resolve(`C:/tmp/lobster-feeds-${envName}-live-${timestamp()}`);
const waitMs = Number(process.env.LOBSTER_FEEDS_LIVE_WAIT_MS ?? 15 * 60 * 1000);
const browserChannel = process.env.LOBSTER_FEEDS_LIVE_BROWSER_CHANNEL ?? 'msedge';
const userDataDir = process.env.LOBSTER_FEEDS_LIVE_EDGE_PROFILE ?? path.resolve(env.profileDir);
const flags = ['scout_feeds_ux_enabled', 'scout_feeds_admin_ux_enabled'];

function timestamp() {
  return new Date().toISOString().replaceAll(':', '').replaceAll('.', '-');
}

function isFeedUrl(url) {
  return /\/v1\/scout\/feeds\//.test(url);
}

function sanitizeUrl(raw) {
  const url = new URL(raw);
  url.search = '';
  url.hash = '';
  return url.toString();
}

function parseBody(text) {
  if (text.trim().length === 0) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function waitForRuntimeTokenProvider(page, deadline) {
  while (Date.now() < deadline) {
    const state = await page.evaluate(() => {
      const cfg = window.__LOBSTER_RUNTIME_CONFIG__ ?? {};
      return {
        hasSignIn: typeof cfg.signIn === 'function',
        hasTokenProvider: typeof cfg.tokenProvider === 'function',
        href: window.location.href,
        title: document.title,
        body: document.body?.innerText?.slice(0, 1000) ?? '',
      };
    });
    if (state.hasTokenProvider) return state;

    const signInButton = page.getByRole('button', { name: /^Sign in$/i }).first();
    if (state.hasSignIn && (await signInButton.isVisible().catch(() => false))) {
      await signInButton.click().catch(() => {});
    }

    await page.waitForTimeout(1000);
  }
  throw new Error('Timed out waiting for Lobster MSAL tokenProvider.');
}

async function waitForToken(page, deadline) {
  let signInStarted = false;
  while (Date.now() < deadline) {
    const result = await page
      .evaluate(async () => {
        const cfg = window.__LOBSTER_RUNTIME_CONFIG__ ?? {};
        if (typeof cfg.tokenProvider !== 'function') {
          return { ok: false, reason: 'tokenProvider is not available' };
        }
        try {
          const token = await cfg.tokenProvider();
          return { ok: true, token };
        } catch (error) {
          return {
            ok: false,
            reason: error instanceof Error ? error.message : String(error),
            hasSignIn: typeof cfg.signIn === 'function',
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
      const button = page.getByRole('button', { name: /^Sign in$/i }).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click().catch(() => {});
      } else {
        await page.evaluate(() => window.__LOBSTER_RUNTIME_CONFIG__?.signIn?.()).catch(() => {});
      }
    }
    if (/login\.microsoftonline\.com|signin/i.test(page.url())) {
      console.log('Waiting for interactive sign-in to return to Lobster...');
    }
    await page.waitForTimeout(1500);
  }
  throw new Error('Timed out waiting for a silent Lobster bearer token after sign-in.');
}

async function tryEnableOverrides(page) {
  const token = await waitForToken(page, Date.now() + waitMs);
  return page.evaluate(async ({ keys, token }) => {
    const results = [];

    for (const key of keys) {
      const response = await fetch(`/v1/dev/ecs-settings/${encodeURIComponent(key)}/override`, {
        method: 'POST',
        credentials: 'same-origin',
        redirect: 'error',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: true }),
      });
      const text = await response.text();
      results.push({
        key,
        ok: response.ok,
        status: response.status,
        body: parseResponseBody(text),
      });
    }

    const featureResponse = await fetch('/v1/me/web-feature-flags', {
      method: 'GET',
      credentials: 'same-origin',
      redirect: 'error',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const featureText = await featureResponse.text();
    return {
      results,
      featureFlags: {
        ok: featureResponse.ok,
        status: featureResponse.status,
        body: parseResponseBody(featureText),
      },
    };

    function parseResponseBody(text) {
      if (text.trim().length === 0) return null;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  }, { keys: flags, token });
}

async function savePageProof(page, prefix) {
  await page.screenshot({ path: path.join(outDir, `${prefix}.png`), fullPage: true }).catch(() => {});
  const bodyText = await page.locator('body').innerText().catch(() => '<body unavailable>');
  await fs.writeFile(path.join(outDir, `${prefix}.txt`), bodyText, 'utf8');
  return bodyText;
}

await fs.mkdir(outDir, { recursive: true });

const feedEvents = [];
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: browserChannel,
  headless: false,
  args: ['--start-maximized'],
  viewport: null,
  recordVideo: { dir: outDir, size: { width: 1440, height: 960 } },
});

let page = context.pages()[0] ?? (await context.newPage());

page.on('request', (request) => {
  const url = request.url();
  if (!isFeedUrl(url)) return;
  feedEvents.push({
    kind: 'request',
    method: request.method(),
    url: sanitizeUrl(url),
    at: new Date().toISOString(),
  });
});

page.on('response', async (response) => {
  const url = response.url();
  if (!isFeedUrl(url)) return;

  const event = {
    kind: 'response',
    url: sanitizeUrl(url),
    status: response.status(),
    at: new Date().toISOString(),
    contentType: response.headers()['content-type'] ?? '',
  };

  try {
    const text = await response.text();
    event.preview = text.slice(0, 2000);
    const body = parseBody(text);
    if (body !== null && typeof body === 'object' && !Array.isArray(body)) {
      event.errorCode = body.errorCode;
      event.feedId = body.feedId;
      event.scope = body.scope;
      event.entryCount = Array.isArray(body.entries) ? body.entries.length : undefined;
    }
  } catch (error) {
    event.preview = `<body unavailable: ${String(error)}>`;
  }

  feedEvents.push(event);
});

console.log(`Environment: ${envName}`);
console.log(`Feeds URL: ${feedsUrl}`);
console.log(`Skills URL: ${skillsUrl}`);
console.log(`Browser channel: ${browserChannel}`);
console.log(`Persistent Edge profile: ${userDataDir}`);
console.log(`Artifacts: ${outDir}`);

await page.goto(feedsUrl, { waitUntil: 'domcontentloaded' });
await savePageProof(page, '00-feeds-before-enable');

let enableResult;
try {
  await waitForRuntimeTokenProvider(page, Date.now() + waitMs);
  enableResult = { ok: true, ...(await tryEnableOverrides(page)) };
} catch (error) {
  enableResult = { ok: false, error: String(error) };
}
await fs.writeFile(path.join(outDir, 'enable-result.json'), JSON.stringify(enableResult, null, 2), 'utf8');

await page.goto(feedsUrl, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const feedsText = await savePageProof(page, '01-feeds-after-enable');

for (const [name, file] of [
  ['Personal', '02-feeds-personal'],
  ['Tenant approved', '03-feeds-tenant-approved'],
  ['Marketplace', '04-feeds-marketplace'],
]) {
  const tab = page.getByRole('tab', { name: new RegExp(name, 'i') });
  if (await tab.isVisible().catch(() => false)) {
    await tab.click().catch(() => {});
    await page.waitForTimeout(1500);
    await savePageProof(page, file);
  }
}

await page.goto(skillsUrl, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const skillsText = await savePageProof(page, '05-skills');

await fs.writeFile(
  path.join(outDir, 'feed-network-events.json'),
  JSON.stringify({ envName, feedsUrl, skillsUrl, feedEvents }, null, 2),
  'utf8',
);

const video = page.video();
await context.close();

const videoPath = video === null ? null : await video.path();
if (videoPath !== null) {
  const finalVideo = path.join(outDir, `lobster-feeds-${envName}-live.webm`);
  await fs.copyFile(videoPath, finalVideo);
  console.log(`video=${finalVideo}`);
}

const summary = {
  envName,
  outDir,
  enableOk: enableResult.ok,
  feedsRendered: /\bFeeds\b/i.test(feedsText),
  skillsRendered: /\bSkills\b/i.test(skillsText),
  feedStatuses: feedEvents
    .filter((event) => event.kind === 'response')
    .map((event) => ({
      url: event.url,
      status: event.status,
      errorCode: event.errorCode,
      feedId: event.feedId,
      entryCount: event.entryCount,
    })),
};

await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
