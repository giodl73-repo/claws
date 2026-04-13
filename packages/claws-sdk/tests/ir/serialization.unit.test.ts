/**
 * L0: GovernanceIR serialization, deterministic hashing, and HMAC signing.
 *
 * 6 unit tests:
 * 1. Round-trip: deserialize(serialize(ir)) deep-equals original
 * 2. Sorted-key determinism: same IR always produces identical JSON bytes
 * 3. Empty arrays serialize as [] (canonical format)
 * 4. Hash stability: CRLF vs LF input produces same hash after normalization
 * 5. Hash stability: BOM-stripped vs raw produces same hash
 * 6. HMAC-SHA256 sign then verify succeeds for audit event
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { GovernanceIR } from '../../src/ir/index.js';
import { serialize, deserialize, hashRaw } from '../../src/ir/index.js';
import { signAuditEntry, verifyAuditEntry } from '../../src/compliance/artifact-signer.js';

/** Build a minimal valid GovernanceIR for testing. */
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

describe('GovernanceIR Serialization', () => {
  it('round-trip: deserialize(serialize(ir)) deep-equals original', () => {
    const ir = minimalIR({
      intents: [
        {
          kind: 'deny',
          id: 'deny-1',
          ruleId: 'SEC-001',
          level: 5,
          description: 'Block dangerous tools',
          target: 'bash:rm',
          reason: 'destructive',
        },
      ],
      delegationMap: [
        { ruleId: 'SEC-001', mechanism: 'hook', target: 'before_tool_call' },
      ],
    });

    const json = serialize(ir);
    const restored = deserialize(json);

    expect(restored).toEqual(ir);
  });

  it('sorted-key determinism: same IR always produces identical JSON bytes', () => {
    const enforcementPlan = {
      blockedTools: [],
      requiredApprovals: [],
      auditOnlyRules: [],
      channelRedactions: [],
      ruleSuppressions: [],
    };
    const r5Count = { derived: 0, overridden: 0, total: 0 };

    const emptyConflicts = {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    };

    // Build the same IR with properties in different insertion orders
    const ir1: GovernanceIR = {
      capabilities: { tools: [], skills: [], agents: [], workflows: [] },
      analysis: {
        violations: [],
        warnings: [],
        enforcementPlan,
        reclassificationTable: [],
        effectiveR5Count: r5Count,
      },
      intents: [],
      delegationMap: [],
      conflicts: emptyConflicts,
      compiler: { compilerVersion: '0.1.0', compiledAt: '2026-04-12T00:00:00Z', schemaVersion: 1 },
    };

    // Same data, different key insertion order at top level
    const ir2 = {
      compiler: { schemaVersion: 1, compilerVersion: '0.1.0', compiledAt: '2026-04-12T00:00:00Z' },
      conflicts: { totalConflicts: 0, hasOboWithoutElicit: false, haltReason: null, multiConstraintConflicts: [], oboConflicts: [] },
      delegationMap: [],
      intents: [],
      analysis: {
        effectiveR5Count: { total: 0, derived: 0, overridden: 0 },
        reclassificationTable: [],
        enforcementPlan: { ruleSuppressions: [], channelRedactions: [], auditOnlyRules: [], blockedTools: [], requiredApprovals: [] },
        warnings: [],
        violations: [],
      },
      capabilities: { workflows: [], agents: [], skills: [], tools: [] },
    } as unknown as GovernanceIR;

    expect(serialize(ir1)).toBe(serialize(ir2));
  });

  it('empty arrays serialize as [] (canonical format)', () => {
    const ir = minimalIR();
    const json = serialize(ir);

    // Parse back and verify arrays are present, not null or missing
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const caps = parsed['capabilities'] as Record<string, unknown>;
    expect(caps['tools']).toEqual([]);
    expect(caps['skills']).toEqual([]);
    expect(caps['agents']).toEqual([]);
    expect(caps['workflows']).toEqual([]);

    // Verify the raw JSON text contains [] for each empty array
    expect(json).toContain('"tools": []');
    expect(json).toContain('"skills": []');
  });
});

describe('GovernanceIR Hashing', () => {
  it('CRLF vs LF input produces same hash after normalization', () => {
    const contentLF = 'line1\nline2\nline3';
    const contentCRLF = 'line1\r\nline2\r\nline3';

    expect(hashRaw(contentLF)).toBe(hashRaw(contentCRLF));
  });

  it('BOM-stripped vs raw produces same hash', () => {
    const content = '{"test": "value"}';
    const contentWithBOM = '\uFEFF' + content;

    expect(hashRaw(content)).toBe(hashRaw(contentWithBOM));
  });
});

describe('HMAC-SHA256 Signing', () => {
  it('sign then verify succeeds for audit event', () => {
    const key = randomBytes(32);
    const keyId = 'key-001';

    const entry = {
      seq: 0,
      timestamp: '2026-04-12T00:00:00Z',
      eventType: 'tool-call',
      actor: 'agent-1',
      target: 'bash:ls',
      action: 'invoke',
      outcome: 'allow',
      ruleId: 'SEC-001',
      severity: 3,
      policyVersion: '1.0.0',
    };

    const signed = signAuditEntry(entry, key, keyId, 'sha256');

    expect(signed.hmacSignature).toBeTruthy();
    expect(signed.keyId).toBe(keyId);
    expect(signed.algorithm).toBe('sha256');
    expect(verifyAuditEntry(signed, key)).toBe(true);

    // Tampered entry should fail verification
    const tampered = { ...signed, action: 'block' };
    expect(verifyAuditEntry(tampered, key)).toBe(false);
  });
});
