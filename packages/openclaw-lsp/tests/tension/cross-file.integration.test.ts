/**
 * L1 integration tests for cross-file tension detection.
 *
 * 2 tests:
 *   1. Multi-file tension detection pipeline — full workspace analysis
 *   2. All 7 conflict clusters (A-G) mapped and detected
 */

import { describe, it, expect } from 'vitest';
import {
  detectAllClusters,
  detectCluster,
  ALL_CLUSTERS,
  type WorkspaceFile,
  type ConflictCluster,
} from '../../src/tension/cross-file.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';

/** Build a GovernanceIR-like with configurable fields. */
function makeIR(overrides: {
  tools?: readonly { name: string; riskLevel: string }[];
  delegationMap?: readonly unknown[];
  intents?: readonly unknown[];
  requiredApprovals?: readonly string[];
  ruleSuppressions?: readonly { ruleId: string; expiresAt?: string }[];
  warnings?: readonly { ruleId: string; message: string; category?: string }[];
} = {}): GovernanceIRLike {
  return {
    capabilities: {
      tools: overrides.tools ?? [],
      skills: [],
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [],
      warnings: overrides.warnings ?? [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: overrides.requiredApprovals ?? [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: overrides.ruleSuppressions ?? [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: overrides.intents ?? [],
    delegationMap: overrides.delegationMap ?? [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.37.0',
      compiledAt: '2026-04-15T00:00:00Z',
      schemaVersion: 1,
    },
  };
}

describe('Cross-file tension detection', () => {
  it('multi-file tension detection pipeline produces findings across workspace', () => {
    // Build a workspace with TOOLS, SOUL, AGENTS, MEMORY, RULES
    const toolsIR = makeIR({
      tools: [
        { name: 'shell-exec', riskLevel: 'critical' },
        { name: 'rm-rf', riskLevel: 'high' },
        { name: 'read-file', riskLevel: 'low' },
      ],
    });

    const soulIR = makeIR({
      intents: [
        { kind: 'deny', target: 'shell-exec', description: 'Deny shell', id: 'i1', ruleId: 'SEC-01', level: 5 },
        { kind: 'deny', target: 'rm-rf', description: 'Deny rm', id: 'i2', ruleId: 'SEC-02', level: 5 },
      ],
    });

    const agentsIR = makeIR({
      delegationMap: [
        { ruleId: 'DEL-01', target: 'shell-exec' },
        { ruleId: 'DEL-02', target: 'cleanup-bot' },
      ],
    });

    const memoryIR = makeIR({
      intents: [
        { kind: 'label', key: 'read-file', value: 'pii', target: 'read-file', id: 'l1', ruleId: 'DATA-01', level: 2, description: 'PII label' },
      ],
    });

    const rulesIR = makeIR({
      requiredApprovals: ['security-review'],
      ruleSuppressions: [
        { ruleId: 'security-review', expiresAt: '2020-01-01T00:00:00Z' },
      ],
      warnings: [
        { ruleId: 'CTX-01', message: 'Context constraint', category: 'G-CONTEXT' },
      ],
    });

    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', { content: '# Tools\nshell-exec\nrm-rf\nread-file', ir: toolsIR }],
      ['file:///ws/SOUL.md', { content: '# Soul\nshell-exec deny\nrm-rf deny', ir: soulIR }],
      ['file:///ws/AGENTS.md', { content: '# Agents\nshell-exec delegation\ncleanup-bot delegation', ir: agentsIR }],
      ['file:///ws/MEMORY.md', { content: '# Memory\nread-file: pii data', ir: memoryIR }],
      ['file:///ws/RULES.md', { content: '# Rules\nsecurity-review\nCTX-01 context', ir: rulesIR }],
    ]);

    const findings = detectAllClusters(files);

    // Should produce findings from multiple clusters
    expect(findings.length).toBeGreaterThan(0);

    // Cluster A: TOOLS grants shell-exec/rm-rf, SOUL denies them
    const clusterA = findings.filter((f) => f.cluster === 'A');
    expect(clusterA.length).toBe(2); // shell-exec and rm-rf
    expect(clusterA.every((f) => f.severity === 1)).toBe(true); // Error severity

    // Cluster B: AGENTS delegates to shell-exec which SOUL denies
    const clusterB = findings.filter((f) => f.cluster === 'B');
    expect(clusterB.length).toBeGreaterThanOrEqual(1);
    const shellExecB = clusterB.find((f) => f.message.includes('shell-exec'));
    expect(shellExecB).toBeDefined();

    // Cluster E: MEMORY.md read-file label references a tool in TOOLS.md
    const clusterE = findings.filter((f) => f.cluster === 'E');
    expect(clusterE.length).toBeGreaterThanOrEqual(1);

    // All findings should have valid targetUri and sourceUri
    for (const finding of findings) {
      expect(finding.targetUri).toMatch(/^file:\/\//);
      expect(finding.sourceUri).toMatch(/^file:\/\//);
      expect(finding.targetLine).toBeGreaterThanOrEqual(1);
      expect(finding.code).toMatch(/^CLAWS-CF-[A-G]$/);
    }
  });

  it('all 7 conflict clusters (A-G) are mapped and detected', () => {
    // Verify ALL_CLUSTERS constant
    expect(ALL_CLUSTERS).toHaveLength(7);
    expect(ALL_CLUSTERS).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G']);

    // Build workspace that triggers ALL 7 clusters
    // Cluster G requires suppressions in one file and enforcement in another,
    // so TOOLS.md carries a suppression while RULES.md carries the enforcement.
    const toolsIR = makeIR({
      tools: [
        { name: 'shell-exec', riskLevel: 'critical' },
        { name: 'read-file', riskLevel: 'low' },
      ],
      ruleSuppressions: [
        { ruleId: 'security-review', expiresAt: '2020-01-01T00:00:00Z' },
      ],
    });

    const soulIR = makeIR({
      intents: [
        { kind: 'deny', target: 'shell-exec', description: 'Deny shell', id: 'i1', ruleId: 'SEC-01', level: 5 },
      ],
    });

    const agentsIR = makeIR({
      delegationMap: [
        { ruleId: 'DEL-01', target: 'shell-exec' },
        { ruleId: 'DEL-02', target: 'monitor-agent' },
      ],
    });

    // Second file with overlapping delegation target for Cluster C
    const agents2IR = makeIR({
      delegationMap: [
        { ruleId: 'DEL-03', target: 'monitor-agent' },
      ],
    });

    const memoryIR = makeIR({
      intents: [
        { kind: 'label', key: 'read-file', value: 'pii', target: 'read-file', id: 'l1', ruleId: 'DATA-01', level: 2, description: 'Data' },
      ],
    });

    const rulesIR = makeIR({
      requiredApprovals: ['security-review'],
      warnings: [
        { ruleId: 'CTX-01', message: 'Context constraint', category: 'G-CONTEXT' },
      ],
    });

    // SOUL.md also has a G-CONTEXT warning for Cluster F
    const soulWithContext = makeIR({
      intents: [
        { kind: 'deny', target: 'shell-exec', description: 'Deny shell', id: 'i1', ruleId: 'SEC-01', level: 5 },
      ],
      warnings: [
        { ruleId: 'CTX-02', message: 'Soul context constraint', category: 'G-CONTEXT' },
      ],
    });

    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', { content: '# Tools\nshell-exec\nread-file\nsecurity-review', ir: toolsIR }],
      ['file:///ws/SOUL.md', { content: '# Soul\nshell-exec deny\nCTX-02 scope', ir: soulWithContext }],
      ['file:///ws/AGENTS.md', { content: '# Agents\nshell-exec\nmonitor-agent', ir: agentsIR }],
      ['file:///ws2/AGENTS.md', { content: '# Agents2\nmonitor-agent', ir: agents2IR }],
      ['file:///ws/MEMORY.md', { content: '# Memory\nread-file: pii', ir: memoryIR }],
      ['file:///ws/RULES.md', { content: '# Rules\nsecurity-review\nCTX-01 context', ir: rulesIR }],
    ]);

    const allFindings = detectAllClusters(files);

    // Check each cluster detected individually
    const clustersSeen = new Set<ConflictCluster>();
    for (const f of allFindings) {
      clustersSeen.add(f.cluster);
    }

    // Also run each cluster detector independently to verify isolation
    for (const cluster of ALL_CLUSTERS) {
      const clusterFindings = detectCluster(cluster, files);
      // Verify the findings match what detectAllClusters found for this cluster
      const fromAll = allFindings.filter((f) => f.cluster === cluster);
      expect(clusterFindings.length).toBe(fromAll.length);

      if (clusterFindings.length > 0) {
        clustersSeen.add(cluster);
      }
    }

    // All 7 clusters should have been triggered
    const missing = ALL_CLUSTERS.filter((c) => !clustersSeen.has(c));
    expect(missing).toEqual([]);

    // Verify cluster codes
    const clusterA = allFindings.filter((f) => f.cluster === 'A');
    expect(clusterA.every((f) => f.code === 'CLAWS-CF-A')).toBe(true);

    const clusterB = allFindings.filter((f) => f.cluster === 'B');
    expect(clusterB.every((f) => f.code === 'CLAWS-CF-B')).toBe(true);

    const clusterC = allFindings.filter((f) => f.cluster === 'C');
    expect(clusterC.every((f) => f.code === 'CLAWS-CF-C')).toBe(true);
    expect(clusterC.every((f) => f.severity === 2)).toBe(true); // Warning

    const clusterD = allFindings.filter((f) => f.cluster === 'D');
    expect(clusterD.every((f) => f.code === 'CLAWS-CF-D')).toBe(true);

    const clusterE = allFindings.filter((f) => f.cluster === 'E');
    expect(clusterE.every((f) => f.code === 'CLAWS-CF-E')).toBe(true);
    expect(clusterE.every((f) => f.severity === 3)).toBe(true); // Info

    const clusterF = allFindings.filter((f) => f.cluster === 'F');
    expect(clusterF.every((f) => f.code === 'CLAWS-CF-F')).toBe(true);

    const clusterG = allFindings.filter((f) => f.cluster === 'G');
    expect(clusterG.every((f) => f.code === 'CLAWS-CF-G')).toBe(true);
    expect(clusterG.every((f) => f.severity === 1)).toBe(true); // Error

    // Verify detectCluster with unknown cluster returns empty
    const unknownCluster = detectCluster('Z' as ConflictCluster, files);
    expect(unknownCluster).toHaveLength(0);
  });

  it('empty workspace produces no findings', () => {
    const files = new Map<string, WorkspaceFile>();
    const findings = detectAllClusters(files);
    expect(findings).toHaveLength(0);
  });

  it('workspace with no conflicts produces no findings', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', { content: '# Tools\nread-file', ir: makeIR({ tools: [{ name: 'read-file', riskLevel: 'low' }] }) }],
      ['file:///ws/SOUL.md', { content: '# Soul\nallow all', ir: makeIR() }],
    ]);

    const findings = detectAllClusters(files);
    // No deny intents in SOUL → no cluster A
    expect(findings.filter((f) => f.cluster === 'A')).toHaveLength(0);
  });

  it('Cluster C only fires when delegation target appears in 2+ files', () => {
    // Single file with delegation — should NOT trigger Cluster C
    const singleFile = new Map<string, WorkspaceFile>([
      ['file:///ws/AGENTS.md', {
        content: '# Agents\nmonitor-agent',
        ir: makeIR({ delegationMap: [{ ruleId: 'DEL-01', target: 'monitor-agent' }] }),
      }],
    ]);

    const singleFindings = detectCluster('C', singleFile);
    expect(singleFindings).toHaveLength(0);

    // Two files with same delegation target — SHOULD trigger Cluster C
    const twoFiles = new Map<string, WorkspaceFile>([
      ['file:///ws/AGENTS.md', {
        content: '# Agents\nmonitor-agent',
        ir: makeIR({ delegationMap: [{ ruleId: 'DEL-01', target: 'monitor-agent' }] }),
      }],
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nmonitor-agent delegate',
        ir: makeIR({ delegationMap: [{ ruleId: 'DEL-02', target: 'monitor-agent' }] }),
      }],
    ]);

    const twoFindings = detectCluster('C', twoFiles);
    expect(twoFindings.length).toBeGreaterThanOrEqual(1);
    expect(twoFindings[0]!.message).toContain('monitor-agent');
  });

  it('Cluster D only fires for R4+ tools', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nlow-tool\nhigh-tool',
        ir: makeIR({ tools: [
          { name: 'low-tool', riskLevel: 'low' },
          { name: 'high-tool', riskLevel: 'critical' },
        ] }),
      }],
      ['file:///ws/RULES.md', {
        content: '# Rules\napproval-gate',
        ir: makeIR({ requiredApprovals: ['approval-gate'] }),
      }],
    ]);

    const findings = detectCluster('D', files);
    // Only high-tool (critical=R5) should trigger, not low-tool
    expect(findings.length).toBe(1);
    expect(findings[0]!.message).toContain('high-tool');
  });

  it('Cluster G requires suppressions in different file from enforcement', () => {
    // Suppression and enforcement in same file — no Cluster G
    const sameFile = new Map<string, WorkspaceFile>([
      ['file:///ws/RULES.md', {
        content: '# Rules\nsecurity-review',
        ir: makeIR({
          requiredApprovals: ['security-review'],
          ruleSuppressions: [{ ruleId: 'security-review' }],
        }),
      }],
    ]);

    const sameFindings = detectCluster('G', sameFile);
    expect(sameFindings).toHaveLength(0);
  });

  it('Cluster B skips non-object delegation entries', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/AGENTS.md', {
        content: '# Agents',
        ir: makeIR({ delegationMap: ['not-object' as unknown, null as unknown] as readonly unknown[] }),
      }],
      ['file:///ws/SOUL.md', {
        content: '# Soul',
        ir: makeIR({ intents: [{ kind: 'deny', target: 'anything', description: 'deny' }] }),
      }],
    ]);

    const findings = detectCluster('B', files);
    expect(findings).toHaveLength(0);
  });

  it('Cluster A produces no findings when no tool files exist', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/SOUL.md', {
        content: '# Soul\nshell deny',
        ir: makeIR({ intents: [{ kind: 'deny', target: 'shell', description: 'deny' }] }),
      }],
    ]);
    expect(detectCluster('A', files)).toHaveLength(0);
  });

  it('Cluster A skips non-deny intents in SOUL', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nalpha',
        ir: makeIR({ tools: [{ name: 'alpha', riskLevel: 'low' }] }),
      }],
      ['file:///ws/SOUL.md', {
        content: '# Soul\nalpha label',
        ir: makeIR({ intents: [{ kind: 'label', target: 'alpha', key: 'k', value: 'v' }] }),
      }],
    ]);
    expect(detectCluster('A', files)).toHaveLength(0);
  });

  it('Cluster A produces no findings when tool does not match deny target', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nalpha',
        ir: makeIR({ tools: [{ name: 'alpha', riskLevel: 'low' }] }),
      }],
      ['file:///ws/SOUL.md', {
        content: '# Soul\nbeta deny',
        ir: makeIR({ intents: [{ kind: 'deny', target: 'beta', description: 'deny beta' }] }),
      }],
    ]);
    expect(detectCluster('A', files)).toHaveLength(0);
  });

  it('Cluster B produces no findings when no agent files exist', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/SOUL.md', {
        content: '# Soul',
        ir: makeIR({ intents: [{ kind: 'deny', target: 'x', description: 'd' }] }),
      }],
    ]);
    expect(detectCluster('B', files)).toHaveLength(0);
  });

  it('Cluster B skips when delegation target does not match deny target', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/AGENTS.md', {
        content: '# Agents\nalpha-bot',
        ir: makeIR({ delegationMap: [{ ruleId: 'D1', target: 'alpha-bot' }] }),
      }],
      ['file:///ws/SOUL.md', {
        content: '# Soul\nbeta-tool deny',
        ir: makeIR({ intents: [{ kind: 'deny', target: 'beta-tool', description: 'deny' }] }),
      }],
    ]);
    expect(detectCluster('B', files)).toHaveLength(0);
  });

  it('Cluster C handles non-object delegation entries gracefully', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/AGENTS.md', {
        content: '# Agents',
        ir: makeIR({ delegationMap: [42 as unknown, { mechanism: 'hook' } as unknown] as readonly unknown[] }),
      }],
      ['file:///ws/TOOLS.md', {
        content: '# Tools',
        ir: makeIR({ delegationMap: [null as unknown] as readonly unknown[] }),
      }],
    ]);
    expect(detectCluster('C', files)).toHaveLength(0);
  });

  it('Cluster D produces no findings when no rule files exist', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\ncrit-tool',
        ir: makeIR({ tools: [{ name: 'crit-tool', riskLevel: 'critical' }] }),
      }],
    ]);
    expect(detectCluster('D', files)).toHaveLength(0);
  });

  it('Cluster D skips when rules have no requiredApprovals', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\ncrit-tool',
        ir: makeIR({ tools: [{ name: 'crit-tool', riskLevel: 'critical' }] }),
      }],
      ['file:///ws/RULES.md', {
        content: '# Rules',
        ir: makeIR(), // No approvals
      }],
    ]);
    expect(detectCluster('D', files)).toHaveLength(0);
  });

  it('Cluster E produces no findings when no memory files exist', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools',
        ir: makeIR({ tools: [{ name: 'x', riskLevel: 'low' }] }),
      }],
    ]);
    expect(detectCluster('E', files)).toHaveLength(0);
  });

  it('Cluster E skips labels with no key', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nalpha',
        ir: makeIR({ tools: [{ name: 'alpha', riskLevel: 'low' }] }),
      }],
      ['file:///ws/MEMORY.md', {
        content: '# Memory',
        ir: makeIR({ intents: [{ kind: 'label', target: 'alpha', value: 'v' }] }), // no key
      }],
    ]);
    expect(detectCluster('E', files)).toHaveLength(0);
  });

  it('Cluster E skips when label key does not match any tool', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nalpha',
        ir: makeIR({ tools: [{ name: 'alpha', riskLevel: 'low' }] }),
      }],
      ['file:///ws/MEMORY.md', {
        content: '# Memory\nunrelated-key',
        ir: makeIR({ intents: [{ kind: 'label', key: 'unrelated-key', target: 'unrelated', value: 'v' }] }),
      }],
    ]);
    expect(detectCluster('E', files)).toHaveLength(0);
  });

  it('Cluster E matches on label target (not just key)', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nmy-tool',
        ir: makeIR({ tools: [{ name: 'my-tool', riskLevel: 'low' }] }),
      }],
      ['file:///ws/MEMORY.md', {
        content: '# Memory\npii my-tool',
        ir: makeIR({ intents: [{ kind: 'label', key: 'pii', target: 'my-tool', value: 'true' }] }),
      }],
    ]);
    const findings = detectCluster('E', files);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it('Cluster F produces no findings when no rule files exist', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/SOUL.md', {
        content: '# Soul',
        ir: makeIR({ warnings: [{ ruleId: 'CTX', message: 'ctx', category: 'G-CONTEXT' }] }),
      }],
    ]);
    expect(detectCluster('F', files)).toHaveLength(0);
  });

  it('Cluster F skips non-G-CONTEXT warnings', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/RULES.md', {
        content: '# Rules\nWARN-01',
        ir: makeIR({ warnings: [{ ruleId: 'WARN-01', message: 'not context', category: 'G-OTHER' }] }),
      }],
      ['file:///ws/SOUL.md', {
        content: '# Soul\nWARN-02',
        ir: makeIR({ warnings: [{ ruleId: 'WARN-02', message: 'also not context', category: 'G-OTHER' }] }),
      }],
    ]);
    expect(detectCluster('F', files)).toHaveLength(0);
  });

  it('Cluster F skips when other file has no context warnings', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/RULES.md', {
        content: '# Rules\nCTX-01',
        ir: makeIR({ warnings: [{ ruleId: 'CTX-01', message: 'context', category: 'G-CONTEXT' }] }),
      }],
      ['file:///ws/SOUL.md', {
        content: '# Soul',
        ir: makeIR(), // No warnings
      }],
    ]);
    expect(detectCluster('F', files)).toHaveLength(0);
  });

  it('Cluster G produces no findings when no enforcement files exist', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nrule-x',
        ir: makeIR({ ruleSuppressions: [{ ruleId: 'rule-x' }] }),
      }],
    ]);
    expect(detectCluster('G', files)).toHaveLength(0);
  });

  it('Cluster G skips when suppression ruleId does not match approval', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nrule-alpha',
        ir: makeIR({ ruleSuppressions: [{ ruleId: 'rule-alpha' }] }),
      }],
      ['file:///ws/RULES.md', {
        content: '# Rules\nrule-beta',
        ir: makeIR({ requiredApprovals: ['rule-beta'] }),
      }],
    ]);
    expect(detectCluster('G', files)).toHaveLength(0);
  });

  it('Cluster G detects partial ruleId matches (includes check)', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nsec-review-temp',
        ir: makeIR({ ruleSuppressions: [{ ruleId: 'sec-review-temp' }] }),
      }],
      ['file:///ws/RULES.md', {
        content: '# Rules\nsec-review',
        ir: makeIR({ requiredApprovals: ['sec-review'] }),
      }],
    ]);
    const findings = detectCluster('G', files);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });

  it('findLine fallback to line 1 when needle not found', () => {
    // Trigger findLine not-found path by having a target that doesn't appear in content
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nalpha',
        ir: makeIR({ tools: [{ name: 'alpha', riskLevel: 'critical' }] }),
      }],
      ['file:///ws/SOUL.md', {
        content: '# Soul\nno-matching-tool-here',
        ir: makeIR({ intents: [{ kind: 'deny', target: 'alpha', description: 'deny alpha' }] }),
      }],
    ]);

    const findings = detectCluster('A', files);
    expect(findings).toHaveLength(1);
    // "alpha" not found in SOUL content → falls back to line 1
    expect(findings[0]!.targetLine).toBe(1);
  });

  it('riskNumeric handles unknown risk level', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nexotic-tool',
        ir: makeIR({ tools: [{ name: 'exotic-tool', riskLevel: 'alien' }] }),
      }],
      ['file:///ws/RULES.md', {
        content: '# Rules\napproval',
        ir: makeIR({ requiredApprovals: ['approval'] }),
      }],
    ]);
    // alien → riskNumeric returns 0, which is < 4, so no Cluster D finding
    expect(detectCluster('D', files)).toHaveLength(0);
  });

  it('Cluster E skips non-label intents in memory file', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nalpha',
        ir: makeIR({ tools: [{ name: 'alpha', riskLevel: 'low' }] }),
      }],
      ['file:///ws/MEMORY.md', {
        content: '# Memory\nalpha data',
        ir: makeIR({ intents: [{ kind: 'deny', target: 'alpha', description: 'deny' }] }),
      }],
    ]);
    // deny intents are not labels → no Cluster E
    expect(detectCluster('E', files)).toHaveLength(0);
  });

  it('Cluster F excludes "other" files from cross-check', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/RULES.md', {
        content: '# Rules\nCTX-01',
        ir: makeIR({ warnings: [{ ruleId: 'CTX-01', message: 'context', category: 'G-CONTEXT' }] }),
      }],
      ['file:///ws/README.md', {
        content: '# Readme\nCTX-02',
        ir: makeIR({ warnings: [{ ruleId: 'CTX-02', message: 'context', category: 'G-CONTEXT' }] }),
      }],
    ]);
    // README.md classifies as 'other' → excluded from otherFiles
    expect(detectCluster('F', files)).toHaveLength(0);
  });

  it('Cluster D flags high (R4) tools not just critical (R5)', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nhigh-tool',
        ir: makeIR({ tools: [{ name: 'high-tool', riskLevel: 'high' }] }),
      }],
      ['file:///ws/RULES.md', {
        content: '# Rules\napproval',
        ir: makeIR({ requiredApprovals: ['approval'] }),
      }],
    ]);
    const findings = detectCluster('D', files);
    expect(findings.length).toBe(1);
    expect(findings[0]!.message).toContain('high-tool');
  });

  it('handles IR with minimal/undefined analysis shapes gracefully', () => {
    // IR where analysis is essentially empty (no enforcementPlan, no warnings)
    const minimalIR: GovernanceIRLike = {
      capabilities: { tools: [{ name: 'x', riskLevel: 'critical' }], skills: [], agents: [], workflows: [] },
      analysis: {}, // No warnings, no enforcementPlan
      intents: [],
      delegationMap: [],
      conflicts: {},
      compiler: { compilerVersion: '0.37.0', compiledAt: '2026-04-15T00:00:00Z', schemaVersion: 1 },
    };

    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/RULES.md', { content: '# Rules', ir: minimalIR }],
      ['file:///ws/SOUL.md', { content: '# Soul', ir: minimalIR }],
      ['file:///ws/TOOLS.md', { content: '# Tools\nx', ir: minimalIR }],
    ]);

    // Should not throw even with minimal IR
    const findings = detectAllClusters(files);
    // Cluster F: rules file with no warnings → no findings
    expect(detectCluster('F', files)).toHaveLength(0);
    // Cluster G: no enforcementPlan → no findings
    expect(detectCluster('G', files)).toHaveLength(0);
    // Cluster D: tools at R5 but rules has no approvals → no findings
    expect(detectCluster('D', files)).toHaveLength(0);
  });

  it('handles IR with undefined analysis field', () => {
    const noAnalysisIR: GovernanceIRLike = {
      capabilities: {},
      analysis: undefined as unknown, // Truly undefined
      intents: [],
      delegationMap: [],
      conflicts: {},
      compiler: { compilerVersion: '0.37.0', compiledAt: '2026-04-15T00:00:00Z', schemaVersion: 1 },
    };

    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/RULES.md', { content: '# Rules', ir: noAnalysisIR }],
      ['file:///ws/TOOLS.md', { content: '# Tools', ir: noAnalysisIR }],
    ]);

    // Should handle undefined analysis gracefully
    expect(detectCluster('F', files)).toHaveLength(0);
    expect(detectCluster('G', files)).toHaveLength(0);
  });

  it('Cluster G with partial ruleId match via approval.includes(suppression)', () => {
    const files = new Map<string, WorkspaceFile>([
      ['file:///ws/TOOLS.md', {
        content: '# Tools\nsec',
        ir: makeIR({ ruleSuppressions: [{ ruleId: 'sec' }] }),
      }],
      ['file:///ws/RULES.md', {
        content: '# Rules\nsec-review',
        ir: makeIR({ requiredApprovals: ['sec-review'] }),
      }],
    ]);
    // 'sec' is included in 'sec-review' → match via approval.includes(supp.ruleId)
    const findings = detectCluster('G', files);
    expect(findings.length).toBeGreaterThanOrEqual(1);
  });
});
