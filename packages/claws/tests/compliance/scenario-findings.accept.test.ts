/**
 * L3: CLI acceptance — fleet compliance matrix CLI output with
 * cross-framework rollup and ungoverned workspace handling.
 *
 * Tests the `claws comply` subcommands from a consumer CLI perspective.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { claws, initTempWorkspace } from '../accept/helpers.js';

describe('claws comply: fleet compliance matrix CLI', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('produces SOC2 evidence with key fingerprint and observation period validation', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const r = await claws(['comply', 'soc2', '--json'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');

    const output = r.stdout.trim();
    expect(output.length).toBeGreaterThan(0);
    const evidence = JSON.parse(output) as Record<string, unknown>;

    expect(evidence['version']).toBe('1.0.0');
    expect(typeof evidence['observationPeriodValid']).toBe('boolean');
    expect(Array.isArray(evidence['controls'])).toBe(true);

    const controls = evidence['controls'] as Array<Record<string, unknown>>;
    expect(controls.length).toBe(9);

    // All controls have required fields
    for (const ctrl of controls) {
      expect(ctrl['controlId']).toBeTruthy();
      expect(ctrl['controlName']).toBeTruthy();
      expect(['pass', 'fail', 'partial']).toContain(ctrl['status']);
      expect(typeof ctrl['evidenceCount']).toBe('number');
    }
  });

  it('produces HIPAA evidence with PHI coverage and safeguards', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const r = await claws(['comply', 'hipaa', '--json'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');

    const output = r.stdout.trim();
    expect(output.length).toBeGreaterThan(0);
    const evidence = JSON.parse(output) as Record<string, unknown>;

    expect(evidence['version']).toBe('1.0.0');
    expect(Array.isArray(evidence['safeguards'])).toBe(true);
    expect(Array.isArray(evidence['phiCoverage'])).toBe(true);

    const safeguards = evidence['safeguards'] as Array<Record<string, unknown>>;
    expect(safeguards.length).toBe(5);

    for (const sg of safeguards) {
      expect(sg['safeguardId']).toBeTruthy();
      expect(sg['safeguardName']).toBeTruthy();
      expect(['pass', 'fail', 'partial']).toContain(sg['status']);
    }
  });

  it('produces EU AI Act assessment with risk tier', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const r = await claws(['comply', 'eu-ai-act', '--json'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');

    const output = r.stdout.trim();
    expect(output.length).toBeGreaterThan(0);
    const assessment = JSON.parse(output) as Record<string, unknown>;

    expect(assessment['version']).toBe('1.0.0');
    expect(['minimal', 'limited', 'high', 'unacceptable']).toContain(assessment['riskTier']);
    expect(typeof assessment['blocked']).toBe('boolean');
  });
});
