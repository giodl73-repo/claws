import { chromium } from 'file:///C:/src/lobster-feeds-validation/src/lobster_web/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const environments = {
  'prod-301eus': {
    skillsUrl: 'https://lobster.eus-ia301.gateway.prod.island.powerapps.com/?gateway=prod-301eus#/skills',
    profileDir: 'C:/tmp/lobster-feeds-301-edge-profile',
  },
  'prod-302us': {
    skillsUrl: 'https://lobster.us-ia302.gateway.prod.island.powerapps.com/#/skills',
    profileDir: 'C:/tmp/lobster-feeds-302-edge-profile',
  },
};

const envName = process.env.LOBSTER_FEEDS_LIVE_ENV ?? 'prod-301eus';
const env = environments[envName];
if (env === undefined) {
  throw new Error(`Unknown LOBSTER_FEEDS_LIVE_ENV=${envName}`);
}

const skillsUrl = process.env.LOBSTER_FEEDS_LIVE_SKILLS_URL ?? env.skillsUrl;
const userDataDir = process.env.LOBSTER_FEEDS_LIVE_EDGE_PROFILE ?? path.resolve(env.profileDir);
const browserChannel = process.env.LOBSTER_FEEDS_LIVE_BROWSER_CHANNEL ?? 'msedge';
const waitMs = Number(process.env.LOBSTER_FEEDS_LIVE_WAIT_MS ?? 180_000);
const query = process.env.LOBSTER_FEEDS_SKILL_QUERY ?? 'billing';
const installTitle = process.env.LOBSTER_FEEDS_INSTALL_TITLE ?? 'billing-info-lookup';
const enableFeedOverrides = process.env.LOBSTER_FEEDS_ENABLE_ECS_OVERRIDES !== '0';
const flags = ['scout_feeds_ux_enabled', 'scout_feeds_admin_ux_enabled'];
const outDir =
  process.env.LOBSTER_FEEDS_LIVE_OUT_DIR ??
  path.resolve(`C:/tmp/lobster-skills-marketplace-install-${envName}-${timestamp()}`);

function timestamp() {
  return new Date().toISOString().replaceAll(':', '').replaceAll('.', '-');
}

function parseBody(text) {
  if (text.trim().length === 0) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function sanitizeUrl(raw) {
  const url = new URL(raw);
  url.search = '';
  url.hash = '';
  return url.toString();
}

function isRelevantUrl(url) {
  return (
    /\/v1\/scout\/feeds\//.test(url) ||
    /\/v1\/skills\b/.test(url) ||
    /\/v1\/dev\/ecs-settings\//.test(url) ||
    /\/v1\/me\/web-feature-flags\b/.test(url)
  );
}

async function savePageProof(page, prefix) {
  await page.screenshot({ path: path.join(outDir, `${prefix}.png`), fullPage: true }).catch(() => {});
  const bodyText = await page.locator('body').innerText().catch(() => '<body unavailable>');
  await fs.writeFile(path.join(outDir, `${prefix}.txt`), bodyText, 'utf8');
  return bodyText;
}

async function waitForToken(page, deadline) {
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

    if (result.hasSignIn) {
      const button = page.getByRole('button', { name: /^Sign in$/i }).first();
      if (await button.isVisible().catch(() => false)) {
        await button.click().catch(() => {});
      } else {
        await page.evaluate(() => window.__LOBSTER_RUNTIME_CONFIG__?.signIn?.()).catch(() => {});
      }
    }
    await page.waitForTimeout(1000);
  }
  throw new Error('Timed out waiting for a Lobster bearer token.');
}

async function enableOverrides(page) {
  const token = await waitForToken(page, Date.now() + waitMs);
  return page.evaluate(async ({ flags, token }) => {
    const overrides = [];
    for (const key of flags) {
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
      overrides.push({ key, ok: response.ok, status: response.status, body: parseResponseBody(text) });
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
      overrides,
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
  }, { flags, token });
}

await fs.mkdir(outDir, { recursive: true });

const events = [];
const context = await chromium.launchPersistentContext(userDataDir, {
  channel: browserChannel,
  headless: false,
  args: ['--start-maximized'],
  viewport: null,
  recordVideo: { dir: outDir, size: { width: 1440, height: 960 } },
});

const page = context.pages()[0] ?? (await context.newPage());

page.on('request', (request) => {
  const url = request.url();
  if (!isRelevantUrl(url)) return;
  events.push({
    kind: 'request',
    method: request.method(),
    url: sanitizeUrl(url),
    at: new Date().toISOString(),
  });
});

page.on('response', async (response) => {
  const url = response.url();
  if (!isRelevantUrl(url)) return;
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
      event.entryId = body.entry?.id;
      event.entryTitle = body.entry?.title;
      event.entryType = body.entry?.type;
    }
  } catch (error) {
    event.preview = `<body unavailable: ${String(error)}>`;
  }
  events.push(event);
});

console.log(`Environment: ${envName}`);
console.log(`Skills URL: ${skillsUrl}`);
console.log(`Search query: ${query}`);
console.log(`Install title: ${installTitle}`);
console.log(`Enable ECS overrides: ${enableFeedOverrides}`);
console.log(`Persistent Edge profile: ${userDataDir}`);
console.log(`Artifacts: ${outDir}`);

await page.goto(skillsUrl, { waitUntil: 'domcontentloaded' });
let overrideResult = null;
if (enableFeedOverrides) {
  overrideResult = await enableOverrides(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
}
await page.getByRole('heading', { name: /^Skills$/i }).waitFor({ timeout: waitMs });

const search = page.getByRole('textbox', { name: /^Search available skills$/i });
await search.waitFor({ timeout: waitMs });
await search.fill(query);
await page.getByRole('button', { name: new RegExp(`^Install ${escapeRegExp(installTitle)}$`, 'i') }).waitFor({
  timeout: waitMs,
});
await savePageProof(page, '00-before-install');

const installButton = page.getByRole('button', {
  name: new RegExp(`^Install ${escapeRegExp(installTitle)}$`, 'i'),
});
await installButton.click();

const successMessage = `${installTitle} installed here.`;
let success = false;
let failureMessage = null;
try {
  await page.waitForFunction(
    ({ successMessage }) => {
      const text = document.body?.innerText ?? '';
      return text.includes(successMessage) || /We couldn't add[^\n]+/.test(text);
    },
    { successMessage },
    { timeout: waitMs },
  );
  const bodyText = await page.locator('body').innerText().catch(() => '');
  success = bodyText.includes(successMessage);
  if (!success) {
    failureMessage = bodyText.match(/We couldn't add[^\n]+/)?.[0] ?? null;
  }
} catch {
  const bodyText = await page.locator('body').innerText().catch(() => '');
  const match = bodyText.match(/We couldn't add[^\n]+/);
  failureMessage = match?.[0] ?? `Timed out waiting for "${successMessage}"`;
}

const afterText = await savePageProof(page, '01-after-install');
await fs.writeFile(path.join(outDir, 'network-events.json'), JSON.stringify(events, null, 2), 'utf8');

const marketplaceInstallResponses = events.filter(
  (event) =>
    event.kind === 'response' &&
    event.url.endsWith('/v1/scout/feeds/marketplace/install') &&
    typeof event.status === 'number',
);

const summary = {
  envName,
  outDir,
  skillsUrl,
  query,
  installTitle,
  success,
  failureMessage,
  overrideResult,
  marketplaceInstallResponses: marketplaceInstallResponses.map((event) => ({
    status: event.status,
    entryId: event.entryId,
    entryTitle: event.entryTitle,
    entryType: event.entryType,
    errorCode: event.errorCode,
  })),
  installedMessageVisible: afterText.includes(successMessage),
};

await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
const video = page.video();
await context.close();
if (video !== null) {
  const videoPath = path.join(outDir, `lobster-skills-marketplace-install-${envName}.webm`);
  await video.saveAs(videoPath).catch(() => {});
  console.log(`video=${videoPath}`);
}
console.log(JSON.stringify(summary, null, 2));

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
