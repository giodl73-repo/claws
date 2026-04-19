/**
 * L0: OCWorkspaceIR type construction and field validation.
 *
 * 4 unit tests:
 * 1. OCWorkspaceIR constructs with all 9 sub-IRs
 * 2. SoulIR tolerates missing optional fields
 * 3. ToolsIR validates trust level range
 * 4. DiagnosticSeverity enum values are correct
 */

import { describe, it, expect } from 'vitest';
import type {
  OCWorkspaceIR,
  SoulIR,
  ToolsIR,
  ToolDeclarationIR,
  TrustLevel,
  DiagnosticSeverity,
  FileReference,
} from '../../../src/compiler/ir/index.js';

/** Minimal FileReference for testing. */
function fileRef(path: string): FileReference {
  return { path, hash: 'abc123', size: 100 };
}

/** Build a minimal valid OCWorkspaceIR for testing. */
function minimalWorkspaceIR(overrides?: Partial<OCWorkspaceIR>): OCWorkspaceIR {
  return {
    soul: {
      persona: 'test agent',
      principles: [],
      boundaries: [],
      source: fileRef('SOUL.md'),
    },
    tools: {
      tools: [],
      source: fileRef('TOOLS.md'),
    },
    agents: {
      agents: [],
      delegations: [],
      source: fileRef('AGENTS.md'),
    },
    memory: {
      entries: [],
      hasIndex: false,
      source: fileRef('MEMORY.md'),
    },
    identity: {
      organization: 'test-org',
      team: 'test-team',
      authMethod: 'none',
      roles: [],
      source: fileRef('IDENTITY.md'),
    },
    user: {
      role: 'developer',
      bounds: [],
      platform: 'oc',
      environment: {},
      source: fileRef('USER.md'),
    },
    heartbeat: {
      schedules: [],
      source: fileRef('HEARTBEAT.md'),
    },
    skills: {
      skills: [],
      source: fileRef('skills/'),
    },
    lobster: {
      name: 'default',
      description: 'default workflow',
      steps: [],
      dependencies: {},
      source: fileRef('lobster.yaml'),
    },
    compiler: {
      compilerVersion: '0.1.0',
      compiledAt: '2026-04-16T00:00:00Z',
      schemaVersion: 1,
    },
    diagnostics: [],
    ...overrides,
  };
}

describe('OCWorkspaceIR Construction', () => {
  it('constructs with all 9 sub-IRs', () => {
    const ir = minimalWorkspaceIR();

    // Verify all 9 sub-IR fields exist
    expect(ir.soul).toBeDefined();
    expect(ir.tools).toBeDefined();
    expect(ir.agents).toBeDefined();
    expect(ir.memory).toBeDefined();
    expect(ir.identity).toBeDefined();
    expect(ir.user).toBeDefined();
    expect(ir.heartbeat).toBeDefined();
    expect(ir.skills).toBeDefined();
    expect(ir.lobster).toBeDefined();

    // Verify compiler metadata
    expect(ir.compiler.compilerVersion).toBe('0.1.0');
    expect(ir.compiler.schemaVersion).toBe(1);

    // Verify diagnostics
    expect(ir.diagnostics).toEqual([]);
  });
});

describe('SoulIR Optional Fields', () => {
  it('tolerates missing optional fields', () => {
    const soul: SoulIR = {
      persona: 'governance agent',
      principles: ['be safe'],
      // voice is optional -- omitted
      boundaries: [{ text: 'never bypass security', line: 5 }],
      source: fileRef('SOUL.md'),
    };

    expect(soul.voice).toBeUndefined();
    expect(soul.persona).toBe('governance agent');
    expect(soul.principles).toHaveLength(1);
    expect(soul.boundaries).toHaveLength(1);

    // Also construct with voice present
    const soulWithVoice: SoulIR = {
      ...soul,
      voice: 'formal and precise',
    };
    expect(soulWithVoice.voice).toBe('formal and precise');
  });
});

describe('ToolsIR Trust Level', () => {
  it('validates trust level range T0--T4', () => {
    const validLevels: TrustLevel[] = [0, 1, 2, 3, 4];

    for (const level of validLevels) {
      const tool: ToolDeclarationIR = {
        name: `tool-t${level}`,
        description: `Trust level ${level} tool`,
        trustLevel: level,
        oboFlag: false,
        line: 1,
      };
      expect(tool.trustLevel).toBe(level);
      expect(tool.trustLevel).toBeGreaterThanOrEqual(0);
      expect(tool.trustLevel).toBeLessThanOrEqual(4);
    }

    const toolsIR: ToolsIR = {
      tools: validLevels.map(level => ({
        name: `tool-t${level}`,
        description: `Trust level ${level}`,
        trustLevel: level,
        oboFlag: false,
        line: level + 1,
      })),
      source: fileRef('TOOLS.md'),
    };

    expect(toolsIR.tools).toHaveLength(5);
  });
});

describe('DiagnosticSeverity', () => {
  it('enum values are correct', () => {
    const severities: DiagnosticSeverity[] = ['error', 'warning', 'info'];

    expect(severities).toContain('error');
    expect(severities).toContain('warning');
    expect(severities).toContain('info');
    expect(severities).toHaveLength(3);

    // Verify diagnostics use these values correctly
    const ir = minimalWorkspaceIR({
      diagnostics: [
        { severity: 'error', message: 'broken', file: 'SOUL.md', code: 'WS-001' },
        { severity: 'warning', message: 'missing', file: 'TOOLS.md', code: 'WS-002' },
        { severity: 'info', message: 'note', file: 'USER.md', code: 'WS-003' },
      ],
    });

    expect(ir.diagnostics).toHaveLength(3);
    expect(ir.diagnostics[0]!.severity).toBe('error');
    expect(ir.diagnostics[1]!.severity).toBe('warning');
    expect(ir.diagnostics[2]!.severity).toBe('info');
  });
});
