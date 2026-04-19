/**
 * L2 E2E: exit-code coverage for all 9 `claws policy <verb>` handlers
 * against the canonical fixture workspace.
 *
 * Each handler is invoked through the router with fixture-valid argv;
 * the assertion is that the handler exits 0 (happy path). Usage errors
 * are covered in a separate negative-path group.
 *
 * Pulse 58 (CP-12): architect W1 thin-handler closure + conformance verb
 * completeness gate.
 */

import { describe, it, expect } from 'vitest';
import { runRouter, POLICY_VERBS } from '../src/cli-handlers/index.js';

const FIXTURE_CWD = 'C:/src/craftworks/claws-sdk/tests/fixtures/canonical-oc-workspace';

/**
 * Verb -> argv factory producing a valid happy-path invocation. Each
 * entry is the minimum flags required for exit-code 0.
 */
const ARGV_BY_VERB: Record<string, readonly string[]> = {
  check: ['--workspace', FIXTURE_CWD],
  generate: [], // defaults to @bic/openclaw scope; no required args
  watch: ['--workspace', FIXTURE_CWD],
  comply: ['--rubric', 'soc2', '--snapshot', 'sha256-fixture'],
  test: ['--scenarios', `${FIXTURE_CWD}/scenarios.yaml`],
  sim: ['--port', '0'],
  report: ['--input', `${FIXTURE_CWD}/compliance.json`, '--format', 'markdown'],
  verify: ['--manifest', `${FIXTURE_CWD}/audit-manifest.json`],
  diff: ['--from', `${FIXTURE_CWD}/from.json`, '--to', `${FIXTURE_CWD}/to.json`],
};

describe('claws policy <verb> — exit-code E2E (9 verbs)', () => {
  for (const verb of POLICY_VERBS) {
    it(`claws policy ${verb} exits 0 against fixture`, async () => {
      const argv = ['policy', verb, ...(ARGV_BY_VERB[verb] ?? [])];
      const res = await runRouter({
        binaryName: 'claws',
        argv,
        cwd: FIXTURE_CWD,
      });
      expect(res.exitCode).toBe(0);
      // stdout includes a branded line tying the verb + binary back to the
      // invocation — conformance gate on output shape.
      expect(res.stdout).toContain(`claws policy ${verb}:`);
    });
  }
});

describe('claws policy — negative paths', () => {
  it('missing verb exits 2', async () => {
    const res = await runRouter({ binaryName: 'claws', argv: ['policy'], cwd: FIXTURE_CWD });
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain('verb required');
  });

  it('unknown verb exits 2', async () => {
    const res = await runRouter({ binaryName: 'claws', argv: ['policy', 'bogus'], cwd: FIXTURE_CWD });
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain("unknown verb 'bogus'");
  });

  it('unknown top-level group exits 2', async () => {
    const res = await runRouter({ binaryName: 'claws', argv: ['whatever'], cwd: FIXTURE_CWD });
    expect(res.exitCode).toBe(2);
    expect(res.stderr).toContain("unknown command 'whatever'");
  });

  it('--help exits 0 with usage block', async () => {
    const res = await runRouter({ binaryName: 'claws', argv: ['--help'], cwd: FIXTURE_CWD });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toMatch(/Usage: claws <group> <verb>/);
  });

  it('no argv exits 0 with usage block', async () => {
    const res = await runRouter({ binaryName: 'claws', argv: [], cwd: FIXTURE_CWD });
    expect(res.exitCode).toBe(0);
    expect(res.stdout).toContain('Usage:');
  });
});
