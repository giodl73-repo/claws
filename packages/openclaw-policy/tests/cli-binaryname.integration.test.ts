/**
 * L1: `binaryName` parameterization — the same handler library serves
 * both the internal `claws` binary and the upstream `openclaw` binary.
 *
 * The pulse itemization calls for 6 L1 tests split across:
 *   1. help-text rendering for claws
 *   2. help-text rendering for openclaw
 *   3. error-message prefix for claws
 *   4. error-message prefix for openclaw
 *   5. doctor output for both brandings
 *   6. upgrade output for both brandings
 *
 * These are integration-tier because they cross module boundaries
 * (router -> policy handlers + top-level doctor/upgrade handlers) but
 * do not hit real HTTP or filesystem.
 */

import { describe, it, expect } from 'vitest';
import { runRouter } from '../src/cli-handlers/index.js';

const CWD = 'C:/src/craftworks/claws-sdk/tests/fixtures/canonical-oc-workspace';

describe('binaryName parameterization — 6 L1 checks', () => {
  it('L1.1 help-text prefixes with "claws" when binaryName=claws', async () => {
    const res = await runRouter({ binaryName: 'claws', argv: ['--help'], cwd: CWD });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/^claws —/);
    expect(res.stdout).toMatch(/Usage: claws <group> <verb>/);
    expect(res.stdout).not.toContain('openclaw —');
  });

  it('L1.2 help-text prefixes with "openclaw" when binaryName=openclaw', async () => {
    const res = await runRouter({ binaryName: 'openclaw', argv: ['--help'], cwd: CWD });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/^openclaw —/);
    expect(res.stdout).toMatch(/Usage: openclaw <group> <verb>/);
    expect(res.stdout).not.toMatch(/^claws —/);
  });

  it('L1.3 error-message prefixes with "claws" on unknown command', async () => {
    const res = await runRouter({ binaryName: 'claws', argv: ['bogus'], cwd: CWD });
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toMatch(/^claws:/);
    expect(res.stderr).toContain("run 'claws --help'");
  });

  it('L1.4 error-message prefixes with "openclaw" on unknown command', async () => {
    const res = await runRouter({ binaryName: 'openclaw', argv: ['bogus'], cwd: CWD });
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toMatch(/^openclaw:/);
    expect(res.stderr).toContain("run 'openclaw --help'");
  });

  it('L1.5 doctor renders branded header for both claws and openclaw', async () => {
    const resA = await runRouter({ binaryName: 'claws', argv: ['doctor'], cwd: CWD });
    expect(resA.exitCode).toBe(0);
    expect(resA.stdout).toContain('claws doctor:');

    const resB = await runRouter({ binaryName: 'openclaw', argv: ['doctor'], cwd: CWD });
    expect(resB.exitCode).toBe(0);
    expect(resB.stdout).toContain('openclaw doctor:');
    expect(resB.stdout).not.toContain('claws doctor:');
  });

  it('L1.6 upgrade renders branded header for both claws and openclaw', async () => {
    const resA = await runRouter({ binaryName: 'claws', argv: ['upgrade'], cwd: CWD });
    expect(resA.exitCode).toBe(0);
    expect(resA.stdout).toContain('claws upgrade:');

    const resB = await runRouter({ binaryName: 'openclaw', argv: ['upgrade'], cwd: CWD });
    expect(resB.exitCode).toBe(0);
    expect(resB.stdout).toContain('openclaw upgrade:');
    expect(resB.stdout).not.toContain('claws upgrade:');
  });
});
