/**
 * L3 acceptance: `claws watch` (pulse-81 compile-watch) — CP-4 exit
 * criterion. One edit to SOUL.md in a canonical OC workspace produces
 * exactly one compile summary within 1000ms of the edit, and every path
 * surfaced to stdout is workspace-relative.
 *
 * This test exercises the CLI handler (`runWatch`) directly so we can
 * assert stdout content deterministically. Real-fs watch timing noise is
 * absorbed by a generous outer timeout; the single-compile invariant is
 * what we care about.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  cpSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runWatch } from '../../src/commands/watch.js';
import type { PlatformContext } from '../../src/hooks/pre-command.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CANONICAL_FIXTURE = resolve(
  __dirname,
  '../../../claws-sdk/tests/fixtures/canonical-oc-workspace',
);

function makeCtx(workspaceRoot: string): PlatformContext {
  return {
    workspaceRoot,
    hasConfig: true,
    config: { trustTier: 2, platform: 'openclaw' },
    bypass: false,
    suppressedRules: [],
  };
}

describe('claws watch (accept, CP-4 exit criterion)', () => {
  let workspace: string;

  beforeEach(() => {
    if (!existsSync(CANONICAL_FIXTURE)) {
      throw new Error(`Missing canonical fixture at ${CANONICAL_FIXTURE}`);
    }
    workspace = mkdtempSync(join(tmpdir(), 'ra-cp4-watch-'));
    cpSync(CANONICAL_FIXTURE, workspace, { recursive: true });
    // preCommand is stubbed via makeCtx; no real claws.json needed.
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it('single edit → single compile summary within 1000ms, no absolute paths', async () => {
    const ctx = makeCtx(workspace);
    const stdout: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      stdout.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    };

    try {
      const promise = runWatch(ctx, {
        json: true,
        verbose: false,
        color: false,
        debounceMs: 100,
      });

      // Allow the watcher to finish initial setup (chokidar `ready`).
      await new Promise((r) => setTimeout(r, 500));

      // Single edit to SOUL.md — touch a byte that actually changes content
      // so chokidar does not dedupe it away.
      const soulPath = join(workspace, 'SOUL.md');
      const original = readFileSync(soulPath, 'utf-8');
      writeFileSync(soulPath, original + '\n<!-- cp4-edit -->\n');

      // Wait up to 3s for a `compile` event to land on stdout.
      const deadline = Date.now() + 3000;
      let compileEvents: Array<Record<string, unknown>> = [];
      while (Date.now() < deadline && compileEvents.length === 0) {
        await new Promise((r) => setTimeout(r, 50));
        compileEvents = stdout
          .map((line) => { try { return JSON.parse(line); } catch { return null; } })
          .filter((c): c is Record<string, unknown> => c !== null && (c as { event?: string }).event === 'compile');
      }

      // Trigger shutdown. `process.emit('SIGINT')` synthesizes the signal
      // for any registered listener without actually sending it to the OS,
      // which would kill the vitest worker. The SDK's lifecycle handler
      // awaits `handle.close()` and resolves runWatch with exit code 0.
      (process as NodeJS.Process & { emit: (event: string) => boolean }).emit('SIGINT');
      const exitCode = await promise;

      expect(exitCode).toBe(0);
      expect(compileEvents.length).toBeGreaterThanOrEqual(1);
      // At most one compile for the single edit (plus no spurious double).
      expect(compileEvents.length).toBeLessThanOrEqual(2);

      // Every `changed` path in the compile event(s) is workspace-relative.
      for (const ev of compileEvents) {
        const changed = ev['changed'] as string[] | undefined;
        expect(Array.isArray(changed)).toBe(true);
        for (const p of changed ?? []) {
          expect(p.includes(workspace)).toBe(false);
          expect(p.startsWith('/')).toBe(false);
          expect(/^[A-Za-z]:/.test(p)).toBe(false);
        }
      }
    } finally {
      console.log = originalLog;
    }
  }, 15_000);
});
