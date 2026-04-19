/**
 * ValidationPipeline L1 integration tests.
 *
 * Exercises the full pipeline (R5 → fleet → governance → deny-removal)
 * against in-memory fixtures + real filesystem fleet-policy loader.
 */

import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  ValidationPipeline,
  createR5Validator,
  createFleetValidator,
  createGovernanceValidator,
  loadFleetPolicy,
  type EditOperation,
  type FleetPolicyLoadResult,
  type ProvenanceChain,
} from '../../src/workspace-edit/index.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

let workspace: string;

beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'validation-int-'));
});

afterEach(async () => {
  await rm(workspace, { recursive: true, force: true });
});

function buildPipeline(
  ir: GovernanceIR,
  policyFile: string,
  provenance: ReadonlyMap<string, ProvenanceChain>,
): ValidationPipeline {
  const pipeline = new ValidationPipeline();
  pipeline.addValidator(createR5Validator(ir));
  pipeline.addValidator(createFleetValidator({ policyFile }));
  pipeline.addValidator(
    createGovernanceValidator({
      ir,
      denyProvenance: provenance,
      governanceFile: policyFile,
    }),
  );
  return pipeline;
}

describe('ValidationPipeline — integration', () => {
  it('full pipeline R5 → fleet → governance passes a valid edit', async () => {
    const ir = minimalGovernanceIR();
    const policyFile = join(workspace, 'fleet-policy.json');
    await writeFile(policyFile, JSON.stringify({ overrides: [] }), 'utf-8');

    const pipeline = buildPipeline(ir, policyFile, new Map());
    const edit: EditOperation = {
      kind: 'set',
      file: 'SETTINGS.md',
      section: 'defaults',
      field: 'timezone',
      value: 'UTC',
    };
    const result = await pipeline.validate(edit);
    expect(result.ok).toBe(true);
  });

  it('R5 tool in fleet-locked workspace double-denies (R5 wins short-circuit)', async () => {
    const ir = minimalGovernanceIR();
    const policyFile = join(workspace, 'fleet-policy.json');
    // No policy written — fleet validator would fail closed if reached.
    const pipeline = buildPipeline(ir, policyFile, new Map());

    const edit: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'send_email',
      field: 'enabled',
      value: false,
    };
    const result = await pipeline.validate(edit);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected fail');
    // R5 validator comes first in the pipeline and short-circuits; the
    // fleet validator never runs.
    expect(result.error.code).toBe('R5_LOCKED');
    expect(result.failedValidator).toBe('r5');
  });

  it('governance denial carries full provenance chain on blocked edit', async () => {
    // Add a deny intent targeting a non-R5 tool so governance (not R5)
    // produces the failure when the pipeline runs.
    const base = minimalGovernanceIR();
    const ir: GovernanceIR = {
      ...base,
      intents: [
        ...base.intents,
        {
          id: 'intent-gov-99',
          ruleId: 'POL-99',
          level: 3,
          kind: 'deny',
          description: 'Block execute_command on policy',
          target: 'execute_command',
          reason: 'Policy denial',
        },
      ],
    };
    const policyFile = join(workspace, 'fleet-policy.json');
    await writeFile(policyFile, JSON.stringify({ overrides: [] }), 'utf-8');
    const provenance: ProvenanceChain = {
      policySource: 'fleet:q1-2026',
      ruleId: 'POL-99',
      governanceFile: policyFile,
      origin: 'compiler-injected',
    };
    const pipeline = buildPipeline(ir, policyFile, new Map([['intent-gov-99', provenance]]));

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
    if (result.error.code !== 'GOVERNANCE_DENIED') throw new Error('expected GOVERNANCE_DENIED');
    expect(result.error.provenance.policySource).toBe('fleet:q1-2026');
    expect(result.error.provenance.ruleId).toBe('POL-99');
    expect(result.error.provenance.governanceFile).toBe(policyFile);
    expect(result.error.provenance.origin).toBe('compiler-injected');
    expect(result.failedValidator).toBe('governance');
  });

  it('fleet policy hot-reload — fail-closed before creation, pass after', async () => {
    const ir = minimalGovernanceIR();
    const policyFile = join(workspace, 'fleet-policy.json');
    const pipeline = new ValidationPipeline();
    pipeline.addValidator(createFleetValidator({ policyFile }));

    const edit: EditOperation = {
      kind: 'set',
      file: 'SETTINGS.md',
      section: 'defaults',
      field: 'timezone',
      value: 'UTC',
    };

    // First attempt: policy missing → fail-closed.
    const before = await pipeline.validate(edit);
    expect(before.ok).toBe(false);
    if (before.ok) throw new Error('expected fail');
    if (before.error.code !== 'FLEET_LOCKED') throw new Error('expected FLEET_LOCKED');
    expect(before.error.reason).toBe('policy-missing');

    // Write the policy.
    await writeFile(policyFile, JSON.stringify({ overrides: [] }), 'utf-8');

    // Second attempt: policy present → pass.
    const after = await pipeline.validate(edit);
    expect(after.ok).toBe(true);
  });

  it('validation pipeline with real GovernanceIR fixture loader', async () => {
    const ir = minimalGovernanceIR();
    const policyFile = join(workspace, 'fleet-policy.json');
    await writeFile(policyFile, JSON.stringify({ overrides: [] }), 'utf-8');
    const loaded = await loadFleetPolicy(policyFile);
    expect(loaded.state).toBe('ok');

    const pipeline = buildPipeline(ir, policyFile, new Map());
    const edit: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'read_file', // low-risk tool — should pass
      field: 'enabled',
      value: true,
    };
    const result = await pipeline.validate(edit);
    expect(result.ok).toBe(true);
  });

  it('concurrent validations do not interfere — each run sees its own state', async () => {
    const ir = minimalGovernanceIR();
    const policyFile = join(workspace, 'fleet-policy.json');
    await writeFile(policyFile, JSON.stringify({ overrides: [] }), 'utf-8');
    const pipeline = buildPipeline(ir, policyFile, new Map());

    const valid: EditOperation = {
      kind: 'set',
      file: 'SETTINGS.md',
      section: 'defaults',
      field: 'timezone',
      value: 'UTC',
    };
    const invalid: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'send_email',
      field: 'enabled',
      value: false,
    };

    const [a, b, c] = await Promise.all([
      pipeline.validate(valid),
      pipeline.validate(invalid),
      pipeline.validate(valid),
    ]);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    expect(c.ok).toBe(true);
  });
});
