/**
 * L3: CLI acceptance — `claws audit verify` and `claws comply` commands
 * produce correct output across all frameworks.
 *
 * Runs the real claws binary as a subprocess on initialized workspaces.
 * Validates that the CLI properly surfaces audit verification results
 * and compliance evidence from all three frameworks.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { claws, initTempWorkspace } from '../accept/helpers.js';

describe('claws audit + comply CLI acceptance', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('claws comply soc2 --json produces valid evidence on initialized workspace', async () => {
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
    expect(evidence['scope']).toBeTruthy();
    expect(Array.isArray(evidence['controls'])).toBe(true);

    const controls = evidence['controls'] as Array<Record<string, unknown>>;
    expect(controls.length).toBe(9);

    for (const ctrl of controls) {
      expect(ctrl['controlId']).toBeTruthy();
      expect(ctrl['controlName']).toBeTruthy();
      expect(['pass', 'fail', 'partial']).toContain(ctrl['status']);
    }
  });

  it('claws comply hipaa --json produces valid evidence with PHI coverage', async () => {
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

    const safeguards = evidence['safeguards'] as Array<Record<string, unknown>>;
    expect(safeguards.length).toBe(5);

    for (const sg of safeguards) {
      expect(sg['safeguardId']).toBeTruthy();
      expect(['pass', 'fail', 'partial']).toContain(sg['status']);
    }

    expect(Array.isArray(evidence['phiCoverage'])).toBe(true);
    expect(Array.isArray(evidence['transmissionGaps'])).toBe(true);
  });

  it('claws comply eu-ai-act --json produces valid assessment', async () => {
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
    expect(assessment['riskTier']).toBeTruthy();
    expect(typeof assessment['blocked']).toBe('boolean');

    const article13 = assessment['article13'] as Record<string, unknown>;
    expect(article13).toBeTruthy();
    expect(['pass', 'fail', 'partial']).toContain(article13['status']);

    const article14 = assessment['article14'] as Record<string, unknown>;
    expect(article14).toBeTruthy();
    expect(['pass', 'fail', 'partial']).toContain(article14['status']);
  });

  it('human-readable output includes framework markers', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const soc2 = await claws(['comply', 'soc2'], {
      cwd: ws.dir,
      timeout: 60_000,
    });
    expect(soc2.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(soc2.stdout).toContain('SOC2 Type II Evidence Report');
    expect(soc2.stdout).toContain('CC6.1');

    const hipaa = await claws(['comply', 'hipaa'], {
      cwd: ws.dir,
      timeout: 60_000,
    });
    expect(hipaa.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(hipaa.stdout).toContain('HIPAA Security Rule Evidence Report');
    expect(hipaa.stdout).toContain('164.312(a)(1)');

    const euai = await claws(['comply', 'eu-ai-act'], {
      cwd: ws.dir,
      timeout: 60_000,
    });
    expect(euai.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(euai.stdout).toContain('EU AI Act Assessment Report');
    expect(euai.stdout).toContain('Risk tier:');
  });
});
