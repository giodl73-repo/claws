/**
 * ValidationPipeline L0 unit tests.
 *
 * Covers the 4 validators in isolation + the pipeline's preflight /
 * short-circuit / warning-carry semantics. All tests stay synchronous
 * against in-memory GovernanceIR and in-memory fleet policy loaders —
 * no filesystem I/O.
 */

import { describe, expect, it } from 'vitest';

import {
  ValidationPipeline,
  createR5Validator,
  createFleetValidator,
  createGovernanceValidator,
  createDenyRemovalValidator,
  isPatchError,
  ocPathToRoute,
  type EditOperation,
  type FleetPolicyLoadResult,
  type PatchError,
  type ProvenanceChain,
  type Validator,
  type ValidatorResult,
} from '../../src/workspace-edit/index.js';
import { minimalGovernanceIR } from '../fixtures/minimal/governance-ir.js';

const R5_TOGGLE: EditOperation = {
  kind: 'toggle',
  file: 'TOOLS.md',
  section: 'send_email',
  field: 'enabled',
  value: false,
};

const SAFE_SET: EditOperation = {
  kind: 'set',
  file: 'SETTINGS.md',
  section: 'defaults',
  field: 'timezone',
  value: 'UTC',
};

describe('ValidationPipeline — unit', () => {
  it('R5 tool toggle rejected with R5_LOCKED and oc:// path', async () => {
    const ir = minimalGovernanceIR();
    const pipeline = new ValidationPipeline();
    pipeline.addValidator(createR5Validator(ir));

    const result = await pipeline.validate(R5_TOGGLE);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected fail');
    expect(result.error.code).toBe('R5_LOCKED');
    expect(result.error.ocPath).toBe('oc://TOOLS.md/send_email/enabled');
    expect(result.failedValidator).toBe('r5');
  });

  it('fleet lock missing policy fails closed with FLEET_LOCKED', async () => {
    const loader = async (): Promise<FleetPolicyLoadResult> => ({ state: 'missing' });
    const pipeline = new ValidationPipeline();
    pipeline.addValidator(createFleetValidator({ policyFile: '/abs/fleet.json', loader }));

    const result = await pipeline.validate(SAFE_SET);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected fail');
    expect(result.error.code).toBe('FLEET_LOCKED');
    if (result.error.code !== 'FLEET_LOCKED') throw new Error('expected FLEET_LOCKED');
    expect(result.error.reason).toBe('policy-missing');
    expect(result.error.policyFile).toBe('/abs/fleet.json');
  });

  it('fleet lock corrupt policy fails closed with FLEET_LOCKED', async () => {
    const loader = async (): Promise<FleetPolicyLoadResult> => ({
      state: 'corrupt',
      cause: 'bad JSON',
    });
    const pipeline = new ValidationPipeline();
    pipeline.addValidator(createFleetValidator({ policyFile: '/abs/fleet.json', loader }));

    const result = await pipeline.validate(SAFE_SET);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected fail');
    if (result.error.code !== 'FLEET_LOCKED') throw new Error('expected FLEET_LOCKED');
    expect(result.error.reason).toBe('policy-corrupt');
  });

  it('governance deny rule blocks edit with full provenance chain', async () => {
    const ir = minimalGovernanceIR();
    const provenance: ProvenanceChain = {
      policySource: 'template:default',
      ruleId: 'SEC-001',
      governanceFile: '/ws/SOUL.md',
      origin: 'compiler-injected',
    };
    const provenanceRegistry = new Map<string, ProvenanceChain>([
      ['intent-001', provenance],
    ]);
    const pipeline = new ValidationPipeline();
    pipeline.addValidator(
      createGovernanceValidator({
        ir,
        denyProvenance: provenanceRegistry,
        governanceFile: '/ws/SOUL.md',
      }),
    );

    const edit: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'delete_database',
      field: 'enabled',
      value: true,
    };
    const result = await pipeline.validate(edit);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected fail');
    if (result.error.code !== 'GOVERNANCE_DENIED') throw new Error('expected GOVERNANCE_DENIED');
    expect(result.error.provenance.ruleId).toBe('SEC-001');
    expect(result.error.provenance.origin).toBe('compiler-injected');
    expect(result.error.provenance.policySource).toBe('template:default');
    expect(result.error.provenance.governanceFile).toBe('/ws/SOUL.md');
  });

  it('pipeline short-circuits on first failure', async () => {
    let secondCallCount = 0;
    const failing: Validator = {
      name: 'failing',
      validate(): ValidatorResult {
        return {
          ok: false,
          error: {
            code: 'UNKNOWN_ERROR',
            ocPath: 'oc://TOOLS.md/x',
            message: 'boom',
            cause: 'boom',
          },
        };
      },
    };
    const second: Validator = {
      name: 'second',
      validate(): ValidatorResult {
        secondCallCount++;
        return { ok: true };
      },
    };
    const pipeline = new ValidationPipeline();
    pipeline.addValidator(failing);
    pipeline.addValidator(second);

    await pipeline.validate(SAFE_SET);
    expect(secondCallCount).toBe(0);
  });

  it('valid edit passes all validators (empty pipeline)', async () => {
    const pipeline = new ValidationPipeline();
    const result = await pipeline.validate(SAFE_SET);
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('FILE_NOT_EDITABLE for non-allowlisted file in preflight', async () => {
    const pipeline = new ValidationPipeline();
    const edit = {
      kind: 'toggle',
      // Cast through unknown to exercise the preflight allowlist check.
      file: 'AGENTS.md',
      section: 'primary',
      field: 'enabled',
      value: false,
    } as unknown as EditOperation;

    const result = await pipeline.validate(edit);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected fail');
    expect(result.error.code).toBe('FILE_NOT_EDITABLE');
    expect(result.failedValidator).toBe('preflight');
  });

  it('PatchError carries structured context (tool, lockSource)', async () => {
    const ir = minimalGovernanceIR();
    const pipeline = new ValidationPipeline();
    pipeline.addValidator(createR5Validator(ir));
    const result = await pipeline.validate(R5_TOGGLE);
    if (result.ok) throw new Error('expected fail');
    if (result.error.code !== 'R5_LOCKED') throw new Error('expected R5_LOCKED');
    expect(result.error.tool).toBe('send_email');
    expect(result.error.lockSource).toBe('r5');
    expect(isPatchError(result.error)).toBe(true);
  });

  it('isPatchError type guard rejects non-PatchError shapes', () => {
    const fake: unknown = { code: 'NOT_A_CODE', ocPath: 'x', message: 'y' };
    expect(isPatchError(fake)).toBe(false);
    expect(isPatchError(null)).toBe(false);
    expect(isPatchError({})).toBe(false);
    expect(isPatchError({ code: 'R5_LOCKED' })).toBe(false);
    const real: PatchError = {
      code: 'R5_LOCKED',
      ocPath: 'oc://TOOLS.md/x/enabled',
      message: 'm',
      tool: 'x',
      lockSource: 'r5',
    };
    expect(isPatchError(real)).toBe(true);
  });

  it('deny rule provenance includes policy path and ocPathToRoute maps to HTTP', async () => {
    const ir = minimalGovernanceIR();
    const provenance: ProvenanceChain = {
      policySource: 'fleet:q1-2026',
      ruleId: 'SEC-001',
      governanceFile: '/abs/policies/sec.yaml',
      origin: 'compiler-injected',
    };
    const pipeline = new ValidationPipeline();
    pipeline.addValidator(
      createGovernanceValidator({
        ir,
        denyProvenance: new Map([['intent-001', provenance]]),
        governanceFile: '/abs/policies/sec.yaml',
      }),
    );
    const edit: EditOperation = {
      kind: 'toggle',
      file: 'TOOLS.md',
      section: 'delete_database',
      field: 'enabled',
      value: true,
    };
    const result = await pipeline.validate(edit);
    if (result.ok) throw new Error('expected fail');
    if (result.error.code !== 'GOVERNANCE_DENIED') throw new Error('expected GOVERNANCE_DENIED');
    expect(result.error.provenance.governanceFile).toBe('/abs/policies/sec.yaml');
    expect(ocPathToRoute(result.error.ocPath)).toBe('/api/oc/TOOLS.md/delete_database/enabled');
    // Also verify deny-removal validator is exported and callable with the
    // same provenance registry shape — ensures module surface is complete.
    const denyRemoval = createDenyRemovalValidator({
      denyProvenance: new Map(),
      governanceFile: '/abs/policies/sec.yaml',
    });
    expect(denyRemoval.name).toBe('deny-removal');
  });
});
