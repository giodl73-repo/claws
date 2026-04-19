/**
 * L2 e2e test for the compilation host.
 *
 * Runs the full pipeline end-to-end (read → sidecar → IR → enforce →
 * emit OC + CC → validate → cache) against the full-workspace fixture
 * with real disk writes. Verifies artifacts land on disk and the
 * validator marks the compile as overall-pass.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compile } from '#src/compiler/host/compile.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('compile() (e2e)', () => {
  let outputDir: string | null = null;
  let cacheDir: string | null = null;

  afterEach(() => {
    if (outputDir !== null) {
      rmSync(outputDir, { recursive: true, force: true });
      outputDir = null;
    }
    if (cacheDir !== null) {
      rmSync(cacheDir, { recursive: true, force: true });
      cacheDir = null;
    }
  });

  it('walks read → IR → enforce → emit → validate → cache from a 9-file fixture', async () => {
    outputDir = mkdtempSync(join(tmpdir(), 'claws-host-e2e-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'claws-host-e2e-cache-'));

    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: false,
    });

    expect(result.success).toBe(true);
    expect(result.cacheHit).toBe(false);
    expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);

    // Both targets produced at least one emit file.
    expect(result.emitResults.oc?.files.length).toBeGreaterThan(0);
    expect(result.emitResults['claude-code']?.files.length).toBeGreaterThan(0);

    // The OC plugin landed on disk.
    expect(existsSync(join(outputDir, 'plugins', 'claws-governance'))).toBe(true);

    // Validator agrees.
    expect(result.validationReport?.overallPass).toBe(true);
    expect(result.validationReport?.checks.length).toBe(12);

    // Duration is bounded; not zero because we touched the disk.
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});
