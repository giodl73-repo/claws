/**
 * trust-set loader — integration tests (pulse 50, 2 cases per plan).
 *
 * Drives a real `node:fs.watch` against a temp file. Debounce uses a real
 * `setTimeout` adapter so the watcher→reload round-trip is exercised end-to-end.
 */

import { mkdtempSync, writeFileSync, renameSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTrustSetLoader } from '../src/trust-set/loader.js';
import type { Clock, TrustSetLoader } from '../src/trust-set/types.js';
import type { TrustSetReloadFailedEntry } from '@bic/openclaw-guardrails/audit';

const nativeClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => {
    const handle = setTimeout(fn, ms);
    return {
      dispose: (): void => clearTimeout(handle),
    };
  },
};

/** Poll until predicate holds or timeout elapses. fs.watch latency on Windows is variable. */
async function waitFor(predicate: () => boolean, timeoutMs = 2_000): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  if (!predicate()) {
    throw new Error(`waitFor: predicate did not hold within ${String(timeoutMs)}ms`);
  }
}

describe('trust-set loader — integration (real fs.watch)', () => {
  let tmpDir: string;
  let path: string;
  let auditEntries: TrustSetReloadFailedEntry[];
  let loader: TrustSetLoader | undefined;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'trust-set-int-'));
    path = join(tmpDir, 'trust-set.json');
    auditEntries = [];
    loader = undefined;
  });

  afterEach(() => {
    if (loader !== undefined) loader.close();
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('1. atomic rename rotation → watcher fires → snapshot swaps', async () => {
    writeFileSync(
      path,
      JSON.stringify([
        { keyId: 'v1', hmacSecret: 'a'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    loader = createTrustSetLoader({
      path,
      clock: nativeClock,
      auditSink: (e) => auditEntries.push(e),
    });
    expect(loader.get().entries[0]?.keyId).toBe('v1');

    const stagedPath = join(tmpDir, 'trust-set.json.new');
    writeFileSync(
      stagedPath,
      JSON.stringify([
        { keyId: 'v2', hmacSecret: 'b'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    renameSync(stagedPath, path);

    await waitFor(() => loader !== undefined && loader.get().entries[0]?.keyId === 'v2');
    expect(loader.get().entries[0]?.keyId).toBe('v2');
    expect(auditEntries).toHaveLength(0);
  });

  it('2. overlap-window: rotation replaces keyId v1 with v2; both keys are discoverable across the swap', async () => {
    writeFileSync(
      path,
      JSON.stringify([
        { keyId: 'v1', hmacSecret: 'a'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    loader = createTrustSetLoader({
      path,
      clock: nativeClock,
      auditSink: (e) => auditEntries.push(e),
    });

    // Pre-rotation: signing against v1 finds the key.
    const preRotation = loader.get();
    expect(preRotation.entries.find((e) => e.keyId === 'v1')).toBeDefined();
    expect(preRotation.entries.find((e) => e.keyId === 'v2')).toBeUndefined();

    // Rotation: atomic rename replaces the file contents with v2.
    const stagedPath = join(tmpDir, 'trust-set.json.new');
    writeFileSync(
      stagedPath,
      JSON.stringify([
        { keyId: 'v2', hmacSecret: 'b'.repeat(64), notAfter: 9_999_999_999_999 },
      ]),
    );
    renameSync(stagedPath, path);

    await waitFor(
      () => loader !== undefined && loader.get().entries.some((e) => e.keyId === 'v2'),
    );

    // Post-rotation: v2 is discoverable; v1 is no longer in the trust set.
    const postRotation = loader.get();
    expect(postRotation.entries.find((e) => e.keyId === 'v2')).toBeDefined();
    expect(postRotation.entries.find((e) => e.keyId === 'v1')).toBeUndefined();
  });
});
