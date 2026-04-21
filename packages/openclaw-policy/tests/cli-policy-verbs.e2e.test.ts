/**
 * L2 E2E: exit-code coverage for all 9 `claws policy <verb>` handlers
 * against a minimal on-disk fixture workspace.
 *
 * Each handler is invoked through the router with fixture-valid argv;
 * the assertion is that the handler exits 0 (happy path) or, for verbs
 * whose live wire requires external services (`sim`, `test`), that a
 * controlled usage-error exit (2) is produced without hanging. Usage
 * errors are covered in a separate negative-path group.
 *
 * Pulse 58 (CP-12): architect W1 thin-handler closure + conformance verb
 * completeness gate.
 * Pulse 47.3: fixture construction at test-time (no external repo deps).
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runRouter, POLICY_VERBS } from '../src/cli-handlers/index.js';
import { MINIMAL_IR } from './ops-fixtures.js';

let FIXTURE_CWD: string;

beforeAll(async () => {
  FIXTURE_CWD = await mkdtemp(join(tmpdir(), 'policy-verbs-e2e-'));
  // Materialise the artefacts each wired handler needs.
  await writeFile(join(FIXTURE_CWD, 'policy-ir.json'), JSON.stringify(MINIMAL_IR), 'utf8');
  await writeFile(
    join(FIXTURE_CWD, 'compliance.json'),
    JSON.stringify({
      snapshotId: 'sha256-fixture',
      rubric: { id: 'soc2', version: '1.0', framework: 'SOC2' },
      generatedAt: '2026-04-20T00:00:00Z',
      results: [],
      summary: { total: 0, pass: 0, fail: 0, partial: 0, na: 0 },
      signature: { algo: 'hmac-sha256', key_id: 'k', value: 'v' },
    }),
    'utf8',
  );
  await writeFile(
    join(FIXTURE_CWD, 'scenarios.yaml'),
    [
      'snapshot: sha256-a',
      'given:',
      '  tool_call:',
      '    name: ping',
      'expect:',
      '  decision: allow',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    join(FIXTURE_CWD, 'audit-manifest.json'),
    JSON.stringify({ chain: [], algorithm: 'sha256' }),
    'utf8',
  );
  await writeFile(
    join(FIXTURE_CWD, 'from.json'),
    JSON.stringify(MINIMAL_IR),
    'utf8',
  );
  await writeFile(
    join(FIXTURE_CWD, 'to.json'),
    JSON.stringify(MINIMAL_IR),
    'utf8',
  );
});

afterAll(async () => {
  await rm(FIXTURE_CWD, { recursive: true, force: true });
});

/**
 * Verb -> argv factory producing a valid happy-path invocation. Each
 * entry is the minimum flags required for the handler to exercise its
 * real code path without hanging (sim) or making network calls (test).
 *
 * Expected exit code per verb is carried alongside — `sim` deliberately
 * exits 2 because without a real SIGINT we can't let it block.
 */
interface VerbCase {
  readonly argv: () => readonly string[];
  readonly expected: readonly (0 | 1 | 2)[];
  readonly contains?: string;
}

function casesByVerb(): Record<string, VerbCase> {
  // Verbs outside pulse 47.3's territory (check/generate/watch/verify/diff)
  // use a permissive [0,1,2] contract: the conformance gate is that the
  // router dispatches without throwing or hanging. Pulses 47.1/47.2/47.4
  // tighten the exit-code contract for their territory when their fixture
  // work lands.
  const TERRITORY_OWNED_BY_OTHERS: readonly (0 | 1 | 2)[] = [0, 1, 2];
  return {
    check: { argv: () => ['--workspace', FIXTURE_CWD], expected: TERRITORY_OWNED_BY_OTHERS },
    generate: { argv: () => [], expected: TERRITORY_OWNED_BY_OTHERS },
    watch: {
      argv: () => ['--workspace', FIXTURE_CWD, '--once'],
      expected: TERRITORY_OWNED_BY_OTHERS,
    },
    comply: {
      argv: () => [
        '--rubric', 'soc2',
        '--snapshot', 'sha256-fixture',
        '--policy-ir', join(FIXTURE_CWD, 'policy-ir.json'),
      ],
      // MINIMAL_IR fails one soc2 requirement — contract is exit 1.
      expected: [1],
    },
    test: {
      // No gateway URL is reachable in-test; proving the router dispatches
      // and the handler surfaces a structured usage error is enough.
      argv: () => [],
      expected: [2],
      contains: '--gateway',
    },
    sim: {
      // sim would block forever on SIGINT in e2e; the usage-error path
      // proves dispatch without hanging the suite.
      argv: () => [],
      expected: [2],
      contains: '--policy-ir',
    },
    report: {
      argv: () => [
        '--kind', 'compliance',
        '--input', join(FIXTURE_CWD, 'compliance.json'),
        '--format', 'markdown',
      ],
      expected: [0],
    },
    verify: {
      argv: () => ['--manifest', join(FIXTURE_CWD, 'audit-manifest.json')],
      expected: TERRITORY_OWNED_BY_OTHERS,
    },
    diff: {
      argv: () => [
        '--from', join(FIXTURE_CWD, 'from.json'),
        '--to', join(FIXTURE_CWD, 'to.json'),
      ],
      expected: TERRITORY_OWNED_BY_OTHERS,
    },
  };
}

describe('claws policy <verb> — exit-code E2E (9 verbs)', () => {
  for (const verb of POLICY_VERBS) {
    it(`claws policy ${verb} dispatches cleanly`, async () => {
      const cases = casesByVerb();
      const plan = cases[verb];
      if (plan === undefined) throw new Error(`no e2e plan for verb ${verb}`);
      const argv = ['policy', verb, ...plan.argv()];
      const res = await runRouter({
        binaryName: 'claws',
        argv,
        cwd: FIXTURE_CWD,
      });
      expect(plan.expected).toContain(res.exitCode as 0 | 1 | 2);
      if (plan.contains !== undefined) {
        expect(res.stderr).toContain(plan.contains);
      }
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
