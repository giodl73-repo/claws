import { chromium } from 'file:///C:/src/lobster-feeds-validation/src/lobster_web/node_modules/@playwright/test/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

const targetUrl =
  process.env.LOBSTER_302_URL ??
  'https://lobster.us-ia302.gateway.prod.island.powerapps.com/#/feeds';
const outDir =
  process.env.LOBSTER_302_ECS_OUT_DIR ??
  path.resolve(`C:/tmp/lobster-feeds-302-ecs-${timestamp()}`);
const waitMs = Number(process.env.LOBSTER_302_WAIT_MS ?? 10 * 60 * 1000);
const browserChannel = process.env.LOBSTER_302_BROWSER_CHANNEL ?? 'msedge';
const userDataDir =
  process.env.LOBSTER_302_EDGE_PROFILE ??
  path.resolve('C:/tmp/lobster-feeds-302-edge-profile');

const flags = ['scout_feeds_ux_enabled', 'scout_feeds_admin_ux_enabled'];

function timestamp() {
  return new Date().toISOString().replaceAll(':', '').replaceAll('.', '-');
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

async function enableOverrides(page) {
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
        body: parseBody(text),
      });
      if (!response.ok) {
        if (response.status === 404 && key === 'scout_feeds_admin_ux_enabled') {
          continue;
        }
        throw new Error(`Failed to set ${key}: ${response.status} ${text}`);
      }
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
        body: parseBody(featureText),
      },
    };

    function parseBody(text) {
      if (text.trim().length === 0) return null;
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
  }, { keys: flags, token });
}

await fs.mkdir(outDir, { recursive: true });

const context = await chromium.launchPersistentContext(userDataDir, {
  channel: browserChannel,
  headless: false,
  args: ['--start-maximized'],
  viewport: null,
});

let page = context.pages()[0] ?? (await context.newPage());
console.log(`Opening ${targetUrl}`);
console.log(`Browser channel: ${browserChannel}`);
console.log(`Persistent Edge profile: ${userDataDir}`);
console.log(`Artifacts: ${outDir}`);

await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
await page.screenshot({ path: path.join(outDir, '00-before-enable.png'), fullPage: true }).catch(() => {});

const deadline = Date.now() + waitMs;
await waitForRuntimeTokenProvider(page, deadline);

let result;
try {
  result = await enableOverrides(page);
} catch (error) {
  await page.screenshot({ path: path.join(outDir, '01-enable-failed.png'), fullPage: true }).catch(() => {});
  await fs.writeFile(
    path.join(outDir, 'enable-result.json'),
    JSON.stringify({ ok: false, error: String(error) }, null, 2),
    'utf8',
  );
  console.error(String(error));
  await context.close();
  process.exitCode = 1;
  process.exit();
}

await fs.writeFile(
  path.join(outDir, 'enable-result.json'),
  JSON.stringify({ ok: true, ...result }, null, 2),
  'utf8',
);

await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(outDir, '02-after-enable.png'), fullPage: true }).catch(() => {});
const bodyText = await page.locator('body').innerText().catch(() => '<body unavailable>');
await fs.writeFile(path.join(outDir, 'page-text.txt'), bodyText, 'utf8');

console.log(JSON.stringify({ ok: true, outDir, result }, null, 2));
await context.close();
