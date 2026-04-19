/**
 * ValidationPipeline L3 acceptance tests.
 *
 * Maps the pulse scenario codes (cap-integration/S03, S04, S21) to
 * end-to-end assertions on the validation pipeline. Each test reflects
 * a scenario acceptance assertion — the pipeline must deliver the
 * contracted outcome regardless of internal refactors.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ValidationPipeline,
  createR5Validator,
  createFleetValidator,
  createGovernanceValidator,
  ocPathToRoute,
  type EditOperation,
  type ProvenanceChain,
} from '../../src/workspace-edit/index.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'validation-accept-'));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe('ValidationPipeline — acceptance (cap-integration)', () => {
  it('S03 acceptance — R5 tool cannot be toggled via any write path', async () => {
    const ir = minimalGovernanceIR();
    const policyFile = join(workspace, 'fleet-policy.json');
    await writeFile(policyFile, JSON.stringify({ overrides: [] }), 'utf-8');
    const pipeline = new ValidationPipeline();
    pipeline.addValidator(createR5Validator(ir));
    pipeline.addValidator(createFleetValidator({ policyFile }));

    // Both "write paths" exercise the same pipeline: chunk PATCH and
    // Loop sync both construct an EditOperation against TOOLS.md. A R5
    // tool rejection must apply uniformly.
    const chunkPatch: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'send_email',
      field: 'enabled',
      value: false,
    };
    const setAttempt: EditOperation = {
      kind: 'set',
      file: 'TOOLS.md',
      section: 'send_email',
      field: 'enabled',
      value: 'false',
    };

    const r1 = await pipeline.validate(chunkPatch);
    const r2 = await pipeline.validate(setAttempt);

    expect(r1.ok).toBe(false);
    expect(r2.ok).toBe(false);
    if (r1.ok || r2.ok) throw new Error('expected fail');
    expect(r1.error.code).toBe('R5_LOCKED');
    expect(r2.error.code).toBe('R5_LOCKED');
    if (r1.error.code !== 'R5_LOCKED') throw new Error('unexpected code');
    expect(r1.error.tool).toBe('send_email');
    expect(r1.error.lockSource).toBe('r5');
    // oc:// path maps to the expected HTTP route under /api/oc/.
    expect(ocPathToRoute(r1.error.ocPath)).toBe('/api/oc/TOOLS.md/send_email/enabled');
  });

  it('S04 acceptance — fleet lock denies edit when policy missing', async () => {
    const ir = minimalGovernanceIR();
    // Intentionally do NOT create the policy file — fail-closed required.
    const policyFile = join(workspace, 'fleet-policy.json');

    const pipeline = new ValidationPipeline();
    pipeline.addValidator(createR5Validator(ir));
    pipeline.addValidator(createFleetValidator({ policyFile }));

    const edit: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_file', // low risk — not R5
      field: 'enabled',
      value: false,
    };
    const result = await pipeline.validate(edit);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected fail');
    expect(result.error.code).toBe('FLEET_LOCKED');
    if (result.error.code !== 'FLEET_LOCKED') throw new Error('unexpected code');
    expect(result.error.reason).toBe('policy-missing');
    expect(result.error.lockSource).toBe('fleet');
    expect(result.failedValidator).toBe('fleet');
  });

  it('S21 acceptance — governance deny rule blocks edit with correct provenance', async () => {
    const base = minimalGovernanceIR();
    const ir: GovernanceIR = {
      ...base,
      intents: [
        ...base.intents,
        {
          id: 'intent-policy-99',
          ruleId: 'POL-99',
          level: 3,
          kind: 'deny',
          description: 'Block execute_command per policy',
          target: 'execute_command',
          reason: 'Policy',
        },
      ],
    };
    const policyFile = join(workspace, 'fleet-policy.json');
    await writeFile(policyFile, JSON.stringify({ overrides: [] }), 'utf-8');
    const governanceFile = join(workspace, 'policies/secure.yaml');

    const provenance: ProvenanceChain = {
      policySource: 'template:default',
      ruleId: 'POL-99',
      governanceFile,
      origin: 'compiler-injected',
    };

    const pipeline = new ValidationPipeline();
    pipeline.addValidator(createR5Validator(ir));
    pipeline.addValidator(createFleetValidator({ policyFile }));
    pipeline.addValidator(
      createGovernanceValidator({
        ir,
        denyProvenance: new Map([['intent-policy-99', provenance]]),
        governanceFile,
      }),
    );

    const edit: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'execute_command',
      field: 'enabled',
      value: true,
    };
    const result = await pipeline.validate(edit);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected fail');
    if (result.error.code !== 'GOVERNANCE_DENIED') throw new Error('unexpected code');
    expect(result.error.provenance.ruleId).toBe('POL-99');
    expect(result.error.provenance.origin).toBe('compiler-injected');
    expect(result.error.provenance.governanceFile).toBe(governanceFile);
    expect(result.error.provenance.policySource).toBe('template:default');
  });
});
