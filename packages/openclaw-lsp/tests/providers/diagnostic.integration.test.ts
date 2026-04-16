/**
 * L1 integration tests for DiagnosticProvider + ClawsServer.
 *
 * 3 tests:
 *   1. Edit TOOLS.md triggers diagnostic on SOUL.md
 *   2. Edit AGENTS.md triggers delegation graph re-analysis
 *   3. Multi-file tension pipeline (TOOLS → SOUL + MEMORY)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClawsServer, type ServerOptions } from '../../src/server.js';
import type { GovernanceIRLike } from '../../src/compilation-host.js';
import type { PublishDiagnosticsParams } from 'vscode-languageserver';

/**
 * Build a GovernanceIR-like from content, simulating compilation.
 * The "compilation" extracts simple patterns from the markdown to
 * populate the IR fields relevant to diagnostics.
 */
function simulateCompile(uri: string, content: string): GovernanceIRLike {
  const intents: unknown[] = [];
  const delegationMap: unknown[] = [];
  const tools: unknown[] = [];

  // Extract deny intents from "deny: <target>" lines
  for (const line of content.split('\n')) {
    const denyMatch = line.match(/deny:\s*(\S+)/i);
    if (denyMatch) {
      intents.push({
        kind: 'deny',
        id: `deny-${denyMatch[1]}`,
        ruleId: 'SEC-AUTO',
        level: 5,
        target: denyMatch[1],
        description: `Auto-deny for ${denyMatch[1]}`,
        reason: 'policy',
      });
    }

    // Extract label intents from "label: <key>=<value>" lines
    const labelMatch = line.match(/label:\s*(\S+)=(\S+)/i);
    if (labelMatch) {
      intents.push({
        kind: 'label',
        id: `label-${labelMatch[1]}`,
        ruleId: 'DATA-AUTO',
        level: 2,
        key: labelMatch[1],
        value: labelMatch[2],
        description: `Data label ${labelMatch[1]}`,
      });
    }

    // Extract tool declarations from "tool: <name> (<risk>)" lines
    const toolMatch = line.match(/tool:\s*(\S+)\s*\((\w+)\)/i);
    if (toolMatch) {
      tools.push({
        name: toolMatch[1],
        riskLevel: toolMatch[2],
        description: `Tool ${toolMatch[1]}`,
        oboFlag: false,
        classification: 'custom',
      });
    }

    // Extract delegation from "delegate: <target>" lines
    const delegateMatch = line.match(/delegate:\s*(\S+)/i);
    if (delegateMatch) {
      delegationMap.push({
        ruleId: 'DEL-AUTO',
        target: delegateMatch[1],
        mechanism: 'hook',
      });
    }
  }

  return {
    capabilities: { tools, skills: [], agents: [], workflows: [] },
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
    intents,
    delegationMap,
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: '0.36.0',
      compiledAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };
}

describe('DiagnosticProvider integration', () => {
  let published: PublishDiagnosticsParams[];
  let server: ClawsServer;

  beforeEach(() => {
    vi.useFakeTimers();
    published = [];

    const opts: ServerOptions = {
      compileFn: async (uri, content) => simulateCompile(uri, content),
      publishDiagnostics: (params) => published.push(structuredClone(params)),
      batchMs: 0,
    };
    server = new ClawsServer(opts);
  });

  afterEach(() => {
    server.dispose();
    vi.useRealTimers();
  });

  it('editing TOOLS.md triggers a tension diagnostic on SOUL.md', async () => {
    // Open SOUL.md with a deny intent for "shell"
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///ws/SOUL.md',
        languageId: 'markdown',
        version: 1,
        text: '# Soul\ndeny: shell\nAllow safe tools',
      },
    });

    // Open TOOLS.md with a high-risk tool
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///ws/TOOLS.md',
        languageId: 'markdown',
        version: 1,
        text: '# Tools\ntool: shell (high)',
      },
    });

    // Find the tension diagnostic published for SOUL.md
    // After opening TOOLS.md, tensions should fire on SOUL.md
    const soulPublish = published.filter((p) => p.uri === 'file:///ws/SOUL.md');
    // There should be at least 2 publishes: initial open + tension from TOOLS.md
    expect(soulPublish.length).toBeGreaterThanOrEqual(2);

    const lastSoulPublish = soulPublish[soulPublish.length - 1]!;
    const tensionDiag = lastSoulPublish.diagnostics.find((d) => d.code === 'CLAWS-T001');
    expect(tensionDiag).toBeDefined();
    expect(tensionDiag!.message).toContain('TOOLS.md');
    expect(tensionDiag!.message).toContain('shell');

    // The tension should point to the line containing "shell" in SOUL.md
    // "deny: shell" is on line 2 (0-based: 1)
    expect(tensionDiag!.range.start.line).toBe(1);
  });

  it('editing AGENTS.md triggers delegation graph re-analysis', async () => {
    // Open RULES.md with a delegation entry
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///ws/RULES.md',
        languageId: 'markdown',
        version: 1,
        text: '# Rules\ndelegate: sub-agent\ndelegate: reviewer',
      },
    });

    // Open AGENTS.md
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///ws/AGENTS.md',
        languageId: 'markdown',
        version: 1,
        text: '# Agents\ndelegate: worker-1',
      },
    });

    // Now edit AGENTS.md — should trigger delegation tension on RULES.md
    published = []; // Clear previous publishes
    await server.onDidChange({
      textDocument: { uri: 'file:///ws/AGENTS.md', version: 2 },
      contentChanges: [{ text: '# Agents\ndelegate: worker-1\ndelegate: worker-2' }],
    });

    // RULES.md should have a tension diagnostic from AGENTS.md change
    const rulesPublish = published.filter((p) => p.uri === 'file:///ws/RULES.md');
    expect(rulesPublish.length).toBeGreaterThanOrEqual(1);

    const lastRulesPublish = rulesPublish[rulesPublish.length - 1]!;
    const tensionDiag = lastRulesPublish.diagnostics.find((d) => d.code === 'CLAWS-T002');
    expect(tensionDiag).toBeDefined();
    expect(tensionDiag!.message).toContain('AGENTS.md');
    expect(tensionDiag!.message).toContain('delegation');
  });

  it('multi-file tension pipeline: TOOLS change triggers both SOUL and MEMORY diagnostics', async () => {
    // Open SOUL.md with deny intent
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///ws/SOUL.md',
        languageId: 'markdown',
        version: 1,
        text: '# Soul\ndeny: file-write',
      },
    });

    // Open MEMORY.md with data labels
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///ws/MEMORY.md',
        languageId: 'markdown',
        version: 1,
        text: '# Memory\nlabel: pii=true\nlabel: retention=90d',
      },
    });

    // Open TOOLS.md and trigger a change
    await server.onDidOpen({
      textDocument: {
        uri: 'file:///ws/TOOLS.md',
        languageId: 'markdown',
        version: 1,
        text: '# Tools\ntool: file-write (critical)',
      },
    });

    // Now edit TOOLS.md
    published = [];
    await server.onDidChange({
      textDocument: { uri: 'file:///ws/TOOLS.md', version: 2 },
      contentChanges: [{ text: '# Tools\ntool: file-write (critical)\ntool: network (high)' }],
    });

    // SOUL.md should have a CLAWS-T001 tension
    const soulPublish = published.filter((p) => p.uri === 'file:///ws/SOUL.md');
    expect(soulPublish.length).toBeGreaterThanOrEqual(1);
    const soulDiags = soulPublish[soulPublish.length - 1]!.diagnostics;
    expect(soulDiags.some((d) => d.code === 'CLAWS-T001')).toBe(true);

    // MEMORY.md should have a CLAWS-T003 tension (tools change → data label review)
    const memPublish = published.filter((p) => p.uri === 'file:///ws/MEMORY.md');
    expect(memPublish.length).toBeGreaterThanOrEqual(1);
    const memDiags = memPublish[memPublish.length - 1]!.diagnostics;
    expect(memDiags.some((d) => d.code === 'CLAWS-T003')).toBe(true);

    // Both tension diagnostics should have correct sources
    const soulTension = soulDiags.find((d) => d.code === 'CLAWS-T001');
    expect(soulTension!.source).toBe('claws-tension');
    const memTension = memDiags.find((d) => d.code === 'CLAWS-T003');
    expect(memTension!.source).toBe('claws-tension');
  });
});
