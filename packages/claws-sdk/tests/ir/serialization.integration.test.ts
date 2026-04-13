/**
 * L1: GovernanceIR serialization integration tests.
 *
 * 2 integration tests:
 * 1. Multi-field GovernanceIR with intents, manifest, analysis round-trips
 * 2. Audit chain with 3 signed entries verifies in sequence
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import type { GovernanceIR } from '../../src/ir/index.js';
import { serialize, deserialize, hashIR } from '../../src/ir/index.js';
import { signAuditEntry, verifyAuditEntry } from '../../src/compliance/artifact-signer.js';
import type { AuditChainEntry } from '../../src/compliance/artifact-signer.js';

describe('GovernanceIR Integration', () => {
  it('multi-field GovernanceIR with intents, manifest, analysis round-trips', () => {
    const ir: GovernanceIR = {
      capabilities: {
        tools: [
          { name: 'bash', description: 'Execute shell commands', riskLevel: 'critical', oboFlag: false, classification: 'execution' },
          { name: 'write', description: 'Write files to disk', riskLevel: 'high', oboFlag: false, classification: 'filesystem' },
        ],
        skills: [
          { name: 'deploy', description: 'Deploy to production', requiredTools: ['bash'], governanceLevel: 4 },
        ],
        agents: [
          { name: 'code-agent', description: 'Writes code', delegations: [], maxAutonomousLevel: 3 },
          { name: 'review-agent', description: 'Reviews code', delegations: [{ from: 'review-agent', to: 'code-agent', permissions: ['read'] }], maxAutonomousLevel: 2 },
        ],
        workflows: [
          { name: 'ci-pipeline', description: 'Build, test, deploy', steps: ['build', 'test', 'deploy'], requiresApproval: true },
        ],
      },
      analysis: {
        violations: [
          { ruleId: 'SEC-001', level: 5, message: 'bash:rm blocked', target: 'bash:rm', diagnosticCode: 'CLAWS-V001', fixSuggestions: [], toolFuzzyMatches: [] },
          { ruleId: 'SEC-002', level: 3, message: 'push requires approval', target: 'git:push', diagnosticCode: 'CLAWS-V002', fixSuggestions: [{ direction: 'relax', description: 'Allow push', target: 'SEC-002' }], toolFuzzyMatches: [] },
        ],
        warnings: [
          { ruleId: 'AUDIT-001', level: 1, message: 'tool not in manifest', subRuleDiagnosticCode: 'G-INPUT-01', category: 'G-INPUT', subRuleIndex: 1 },
        ],
        enforcementPlan: {
          blockedTools: ['bash:rm'],
          requiredApprovals: ['git:push'],
          auditOnlyRules: ['AUDIT-001'],
          channelRedactions: [],
          ruleSuppressions: [],
        },
        reclassificationTable: [],
        effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
      },
      intents: [
        {
          kind: 'deny',
          id: 'deny-1',
          ruleId: 'SEC-001',
          level: 5,
          description: 'Block destructive shell',
          target: 'bash:rm',
          reason: 'destructive operation',
        },
        {
          kind: 'elicit',
          id: 'elicit-1',
          ruleId: 'SEC-002',
          level: 3,
          description: 'Confirm push',
          target: 'git:push',
          prompt: 'Confirm push to remote?',
        },
        {
          kind: 'label',
          id: 'label-1',
          ruleId: 'AUDIT-001',
          level: 1,
          description: 'Compliance tag',
          key: 'compliance',
          value: 'SOC2',
        },
      ],
      delegationMap: [
        { ruleId: 'SEC-001', mechanism: 'hook', target: 'before_tool_call' },
        { ruleId: 'SEC-002', mechanism: 'approval', target: 'before_tool_call' },
        { ruleId: 'AUDIT-001', mechanism: 'audit-only', target: 'after_tool_call' },
      ],
      conflicts: {
        oboConflicts: [],
        multiConstraintConflicts: [],
        haltReason: null,
        hasOboWithoutElicit: false,
        totalConflicts: 0,
      },
      compiler: {
        compilerVersion: '0.36.0',
        compiledAt: '2026-04-12T10:30:00Z',
        schemaVersion: 1,
      },
    };

    // Serialize, deserialize, verify deep equality
    const json = serialize(ir);
    const restored = deserialize(json);
    expect(restored).toEqual(ir);

    // Hash should be stable
    const hash1 = hashIR(ir);
    const hash2 = hashIR(restored);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('audit chain with 3 signed entries verifies in sequence', () => {
    const key = randomBytes(32);
    const keyId = 'rotation-key-1';

    const baseEntries = [
      {
        seq: 0,
        timestamp: '2026-04-12T10:00:00Z',
        eventType: 'tool-call',
        actor: 'code-agent',
        target: 'bash:ls',
        action: 'invoke',
        outcome: 'allow',
        ruleId: 'SEC-003',
        severity: 1,
        policyVersion: '1.0.0',
      },
      {
        seq: 1,
        timestamp: '2026-04-12T10:00:01Z',
        eventType: 'tool-call',
        actor: 'code-agent',
        target: 'bash:rm',
        action: 'invoke',
        outcome: 'deny',
        ruleId: 'SEC-001',
        severity: 5,
        policyVersion: '1.0.0',
      },
      {
        seq: 2,
        timestamp: '2026-04-12T10:00:02Z',
        eventType: 'BYPASS_ACTIVATED',
        actor: 'admin',
        target: 'system',
        action: 'bypass',
        outcome: 'allow',
        ruleId: 'SYS-BYPASS',
        severity: 5,
        policyVersion: '1.0.0',
      },
    ] as const;

    // Sign all entries
    const chain: AuditChainEntry[] = baseEntries.map((entry) =>
      signAuditEntry(entry, key, keyId, 'sha256'),
    );

    // Verify all entries in sequence
    for (const entry of chain) {
      expect(verifyAuditEntry(entry, key)).toBe(true);
    }

    // Each entry has a unique signature
    const signatures = chain.map((e) => e.hmacSignature);
    expect(new Set(signatures).size).toBe(3);

    // Sequential ordering preserved
    expect(chain[0]!.seq).toBe(0);
    expect(chain[1]!.seq).toBe(1);
    expect(chain[2]!.seq).toBe(2);

    // Tampering any entry breaks its verification
    const tampered = { ...chain[1]!, outcome: 'allow' };
    expect(verifyAuditEntry(tampered, key)).toBe(false);

    // Wrong key fails verification
    const wrongKey = randomBytes(32);
    expect(verifyAuditEntry(chain[0]!, wrongKey)).toBe(false);
  });
});
