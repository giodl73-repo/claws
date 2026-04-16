/**
 * L3: CLI acceptance — `claws comply hipaa` command end-to-end.
 *
 * Runs the real claws binary as a subprocess on an initialized workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { claws, initTempWorkspace } from '../accept/helpers.js';

describe('claws comply hipaa', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('produces JSON output with all 5 safeguards', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const r = await claws(['comply', 'hipaa', '--json'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');

    // Should produce parseable JSON
    const output = r.stdout.trim();
    expect(output.length).toBeGreaterThan(0);
    const evidence = JSON.parse(output) as Record<string, unknown>;

    expect(evidence['version']).toBe('1.0.0');
    expect(evidence['scope']).toBeTruthy();
    expect(Array.isArray(evidence['safeguards'])).toBe(true);

    const safeguards = evidence['safeguards'] as Array<Record<string, unknown>>;
    expect(safeguards.length).toBe(5);

    const safeguardIds = safeguards.map((s) => s['safeguardId']);
    expect(safeguardIds).toContain('164.312(a)(1)');
    expect(safeguardIds).toContain('164.312(e)(1)');

    // Each safeguard has required fields
    for (const sg of safeguards) {
      expect(sg['safeguardId']).toBeTruthy();
      expect(sg['safeguardName']).toBeTruthy();
      expect(['pass', 'fail', 'partial']).toContain(sg['status']);
      expect(typeof sg['evidenceCount']).toBe('number');
    }

    // PHI coverage present
    expect(Array.isArray(evidence['phiCoverage'])).toBe(true);
    const phiCoverage = evidence['phiCoverage'] as Array<Record<string, unknown>>;
    expect(phiCoverage.length).toBe(18);

    // Transmission gaps present (array, possibly empty)
    expect(Array.isArray(evidence['transmissionGaps'])).toBe(true);
  });

  it('produces human-readable output without --json', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const r = await claws(['comply', 'hipaa'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(r.stdout).toContain('HIPAA Security Rule Evidence Report');
    expect(r.stdout).toContain('164.312(a)(1)');
    expect(r.stdout).toContain('164.312(e)(1)');
    expect(r.stdout).toContain('PHI Coverage:');
  });
});
