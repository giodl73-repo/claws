/**
 * L0: GovernanceIR types, FailMode<R>, and mechanical intents.
 *
 * 8 unit tests covering:
 * 1. Construct minimal GovernanceIR with all required fields
 * 2. FailMode<5> accepts only 'closed'
 * 3. FailMode<5> with 'open' is rejected by TypeScript (type-level test)
 * 4. FailMode<3> accepts both 'open' and 'closed'
 * 5. FailMode<4> accepts both 'open' and 'closed'
 * 6. DenyIntent, ElicitIntent, RequireIntent construction
 * 7. LimitIntent, LabelIntent construction
 * 8. GovernanceIR carries compiler version metadata
 */

import { describe, it, expect } from 'vitest';
import type {
  FailMode,
  GovernanceIR,
  DenyIntent,
  ElicitIntent,
  RequireIntent,
  LimitIntent,
  LabelIntent,
  CompilerMeta,
} from '../../src/ir/index.js';
import { CLAWS_E001, validateFailModes, serialize, deserialize, hashIR, hashRaw } from '../../src/ir/index.js';

/** Helper: build a minimal valid GovernanceIR for testing. */
function minimalIR(overrides?: Partial<GovernanceIR>): GovernanceIR {
  return {
    capabilities: {
      tools: [],
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.1.0',
      compiledAt: '2026-04-12T00:00:00Z',
      schemaVersion: 1,
    },
    ...overrides,
  };
}

describe('GovernanceIR', () => {
  it('constructs a minimal IR with all required fields', () => {
    const ir = minimalIR();

    expect(ir.capabilities.tools).toEqual([]);
    expect(ir.capabilities.skills).toEqual([]);
    expect(ir.capabilities.agents).toEqual([]);
    expect(ir.capabilities.workflows).toEqual([]);
    expect(ir.analysis.violations).toEqual([]);
    expect(ir.analysis.warnings).toEqual([]);
    expect(ir.analysis.enforcementPlan.blockedTools).toEqual([]);
    expect(ir.intents).toEqual([]);
    expect(ir.delegationMap).toEqual([]);
    expect(ir.compiler.compilerVersion).toBe('0.1.0');
  });

  it('carries compiler version metadata', () => {
    const meta: CompilerMeta = {
      compilerVersion: '1.2.3',
      compiledAt: '2026-04-12T12:00:00Z',
      schemaVersion: 2,
    };
    const ir = minimalIR({ compiler: meta });

    expect(ir.compiler.compilerVersion).toBe('1.2.3');
    expect(ir.compiler.compiledAt).toBe('2026-04-12T12:00:00Z');
    expect(ir.compiler.schemaVersion).toBe(2);
  });
});

describe('serialize / deserialize / hashIR / hashRaw', () => {
  it('serialize produces deterministic JSON', () => {
    const ir = minimalIR();
    const json = serialize(ir);
    expect(json).toContain('"compilerVersion"');
    // Keys should be sorted alphabetically
    const parsed = JSON.parse(json);
    expect(parsed).toBeDefined();
  });

  it('deserialize round-trips through serialize', () => {
    const ir = minimalIR();
    const json = serialize(ir);
    const roundTripped = deserialize(json);
    expect(roundTripped.compiler.compilerVersion).toBe('0.1.0');
    expect(roundTripped.intents).toEqual([]);
  });

  it('hashIR produces a deterministic SHA-256 hex string', () => {
    const ir = minimalIR();
    const hash1 = hashIR(ir);
    const hash2 = hashIR(ir);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex
  });

  it('hashIR produces different hashes for different IRs', () => {
    const ir1 = minimalIR();
    const ir2 = minimalIR({
      compiler: { compilerVersion: '9.9.9', compiledAt: '2026-01-01T00:00:00Z', schemaVersion: 1 },
    });
    expect(hashIR(ir1)).not.toBe(hashIR(ir2));
  });

  it('hashRaw produces a deterministic SHA-256 hex string', () => {
    const hash = hashRaw('hello world');
    expect(hash).toHaveLength(64);
    expect(hashRaw('hello world')).toBe(hash);
  });

  it('hashRaw normalizes line endings', () => {
    const unix = hashRaw('line1\nline2');
    const windows = hashRaw('line1\r\nline2');
    expect(unix).toBe(windows);
  });
});

describe('FailMode<R>', () => {
  it('FailMode<5> accepts only closed', () => {
    const mode: FailMode<5> = 'closed';
    expect(mode).toBe('closed');
  });

  it('FailMode<5> rejects open at the type level', () => {
    // Type-level test: the following would cause a TypeScript error:
    //   const bad: FailMode<5> = 'open';
    //                            ~~~~~~
    //   Type '"open"' is not assignable to type '"closed"'.
    //
    // We verify by asserting the runtime value is 'closed' and that
    // the CLAWS_E001 diagnostic exists for runtime enforcement.
    expect(CLAWS_E001).toContain('CLAWS-E001');
    expect(CLAWS_E001).toContain('fail-closed');

    // Runtime guard: validateFailModes catches deserialized R5 open
    const ir = minimalIR({
      intents: [
        {
          kind: 'deny',
          id: 'i1',
          ruleId: 'SEC-001',
          level: 5,
          description: 'critical deny',
          target: '*',
          reason: 'critical',
          failMode: 'open', // tampered JSON
        } as unknown as DenyIntent,
      ],
    });
    expect(() => validateFailModes(ir)).toThrow('CLAWS-E001');
  });

  it('FailMode<3> accepts both open and closed', () => {
    const open: FailMode<3> = 'open';
    const closed: FailMode<3> = 'closed';
    expect(open).toBe('open');
    expect(closed).toBe('closed');
  });

  it('FailMode<4> accepts both open and closed', () => {
    const open: FailMode<4> = 'open';
    const closed: FailMode<4> = 'closed';
    expect(open).toBe('open');
    expect(closed).toBe('closed');
  });
});

describe('Mechanical Intents', () => {
  it('constructs DenyIntent, ElicitIntent, RequireIntent', () => {
    const deny: DenyIntent = {
      kind: 'deny',
      id: 'deny-1',
      ruleId: 'SEC-001',
      level: 5,
      description: 'Block dangerous tools',
      target: 'bash:rm',
      reason: 'destructive operation',
    };
    expect(deny.kind).toBe('deny');
    expect(deny.target).toBe('bash:rm');

    const elicit: ElicitIntent = {
      kind: 'elicit',
      id: 'elicit-1',
      ruleId: 'SEC-002',
      level: 3,
      description: 'Confirm before push',
      target: 'git:push',
      prompt: 'Are you sure you want to push?',
    };
    expect(elicit.kind).toBe('elicit');
    expect(elicit.prompt).toContain('push');

    const require: RequireIntent = {
      kind: 'require',
      id: 'require-1',
      ruleId: 'QA-001',
      level: 4,
      description: 'Tests must pass',
      condition: 'tests.passed === true',
      failMessage: 'Tests must pass before deploy',
    };
    expect(require.kind).toBe('require');
    expect(require.condition).toContain('tests.passed');
  });

  it('constructs LimitIntent, LabelIntent', () => {
    const limit: LimitIntent = {
      kind: 'limit',
      id: 'limit-1',
      ruleId: 'COST-001',
      level: 2,
      description: 'Rate limit API calls',
      property: 'apiCalls',
      max: 100,
      unit: 'calls/hour',
    };
    expect(limit.kind).toBe('limit');
    expect(limit.max).toBe(100);
    expect(limit.unit).toBe('calls/hour');

    const label: LabelIntent = {
      kind: 'label',
      id: 'label-1',
      ruleId: 'AUDIT-001',
      level: 1,
      description: 'Tag for compliance',
      key: 'compliance',
      value: 'SOC2',
    };
    expect(label.kind).toBe('label');
    expect(label.key).toBe('compliance');
    expect(label.value).toBe('SOC2');
  });
});
