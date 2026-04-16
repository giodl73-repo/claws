/**
 * L3: CLI acceptance — `claws comply soc2` command end-to-end.
 *
 * Runs the real claws binary as a subprocess on an initialized workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { claws, initTempWorkspace } from '../accept/helpers.js';

describe('claws comply soc2', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('produces JSON output with all 9 controls', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const r = await claws(['comply', 'soc2', '--json'], {
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
    expect(Array.isArray(evidence['controls'])).toBe(true);

    const controls = evidence['controls'] as Array<Record<string, unknown>>;
    expect(controls.length).toBe(9);

    const controlIds = controls.map((c) => c['controlId']);
    expect(controlIds).toContain('CC6.1');
    expect(controlIds).toContain('CC8.1');

    // Each control has required fields
    for (const ctrl of controls) {
      expect(ctrl['controlId']).toBeTruthy();
      expect(ctrl['controlName']).toBeTruthy();
      expect(['pass', 'fail', 'partial']).toContain(ctrl['status']);
      expect(typeof ctrl['evidenceCount']).toBe('number');
    }
  });

  it('produces human-readable output without --json', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const r = await claws(['comply', 'soc2'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(r.stdout).toContain('SOC2 Type II Evidence Report');
    expect(r.stdout).toContain('CC6.1');
    expect(r.stdout).toContain('CC8.1');
  });
});
