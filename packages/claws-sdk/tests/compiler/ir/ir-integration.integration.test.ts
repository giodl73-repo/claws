/**
 * L1: Integration tests for OCWorkspaceIR and serialization.
 *
 * 2 integration tests:
 * 1. Reader output (fixture) maps to OCWorkspaceIR
 * 2. IR serialization round-trip preserves all field types including dates and enums
 */

import { describe, it, expect } from 'vitest';
import type {
  OCWorkspaceIR,
  FileReference,
  TrustLevel,
  Platform,
  AuthMethod,
  DataSensitivity,
} from '../../../src/compiler/ir/index.js';
import {
  serializeWorkspaceIR,
  deserializeWorkspaceIR,
} from '../../../src/compiler/ir/index.js';

/** File reference builder. */
function fileRef(path: string, hash: string, size: number): FileReference {
  return { path, hash, size };
}

/**
 * Build a full OCWorkspaceIR simulating what the 9 readers from pulse 1
 * would produce from the full-workspace fixture.
 */
function readerOutputFixture(): OCWorkspaceIR {
  return {
    soul: {
      persona: 'enterprise governance agent',
      principles: [
        'enforce security policies',
        'audit all tool usage',
        'fail-closed for R5 rules',
      ],
      voice: 'authoritative and precise',
      boundaries: [
        { text: 'never bypass security policies', line: 10 },
        { text: 'always audit tool usage', line: 11 },
      ],
      source: fileRef('SOUL.md', 'a1b2c3d4e5f6', 512),
    },
    tools: {
      tools: [
        {
          name: 'bash',
          description: 'Execute shell commands',
          trustLevel: 2 as TrustLevel,
          oboFlag: false,
          line: 1,
        },
        {
          name: 'database-write',
          description: 'Write to production database',
          trustLevel: 4 as TrustLevel,
          oboFlag: true,
          line: 5,
        },
      ],
      source: fileRef('TOOLS.md', 'b2c3d4e5f6a1', 300),
    },
    agents: {
      agents: [
        {
          name: 'scanner',
          description: 'Security scanner agent',
          tools: ['bash'],
          line: 1,
        },
        {
          name: 'deployer',
          description: 'Deployment agent',
          tools: ['bash', 'database-write'],
          line: 5,
        },
      ],
      delegations: [
        { from: 'main', to: 'scanner', tools: ['bash'], line: 10 },
        { from: 'main', to: 'deployer', tools: ['bash', 'database-write'], line: 11 },
      ],
      source: fileRef('AGENTS.md', 'c3d4e5f6a1b2', 450),
    },
    memory: {
      entries: [
        { label: 'scan-results', sensitivity: 'internal' as DataSensitivity, retention: 'session', line: 1 },
        { label: 'credentials', sensitivity: 'restricted' as DataSensitivity, retention: '1h', line: 3 },
      ],
      hasIndex: true,
      source: fileRef('MEMORY.md', 'd4e5f6a1b2c3', 200),
    },
    identity: {
      organization: 'enterprise-corp',
      team: 'platform-security',
      authMethod: 'sso' as AuthMethod,
      ssoProvider: 'azure-ad',
      roles: [
        { role: 'security-admin', permissions: ['read', 'write', 'audit'] },
        { role: 'deployer', permissions: ['read', 'deploy'] },
      ],
      source: fileRef('IDENTITY.md', 'e5f6a1b2c3d4', 180),
    },
    user: {
      role: 'security-engineer',
      bounds: ['code-review', 'deploy-staging'],
      platform: 'claude-code' as Platform,
      environment: { SHELL: 'bash', NODE_ENV: 'production' },
      source: fileRef('USER.md', 'f6a1b2c3d4e5', 150),
    },
    heartbeat: {
      schedules: [
        { trigger: 'on_start', actions: ['health-check', 'load-policies'], line: 1 },
        { trigger: 'every_5m', actions: ['heartbeat-ping'], line: 3 },
      ],
      lastHeartbeat: '2026-04-16T12:30:00Z',
      status: 'healthy',
      source: fileRef('HEARTBEAT.md', 'a1c2e3f4b5d6', 120),
    },
    skills: {
      skills: [
        {
          name: 'scan-code',
          description: 'Run security scan on code changes',
          requiredTools: ['bash'],
          path: 'skills/scan-code',
        },
        {
          name: 'deploy-staging',
          description: 'Deploy to staging environment',
          requiredTools: ['bash', 'database-write'],
          path: 'skills/deploy-staging',
        },
      ],
      source: fileRef('skills/', 'b2d4f6a1c3e5', 400),
    },
    lobster: {
      name: 'security-check',
      description: 'Run security validation pipeline',
      steps: [
        { name: 'scan', command: 'npm audit' },
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
      ],
      dependencies: { lint: ['scan'], test: ['lint'] },
      source: fileRef('lobster.yaml', 'c3e5a1b2d4f6', 250),
    },
    compiler: {
      compilerVersion: '0.1.0',
      compiledAt: '2026-04-16T00:00:00Z',
      schemaVersion: 1,
    },
    diagnostics: [
      {
        severity: 'warning',
        message: 'OBO tool database-write has no elicitation gate',
        file: 'TOOLS.md',
        line: 5,
        column: 1,
        code: 'WS-OBO-001',
      },
    ],
  };
}

describe('Reader Output to OCWorkspaceIR', () => {
  it('reader output (fixture) maps to OCWorkspaceIR', () => {
    const ir = readerOutputFixture();

    // Verify all 9 sub-IRs have content
    expect(ir.soul.persona).toBe('enterprise governance agent');
    expect(ir.soul.principles).toHaveLength(3);
    expect(ir.soul.boundaries).toHaveLength(2);

    expect(ir.tools.tools).toHaveLength(2);
    expect(ir.tools.tools[0]!.trustLevel).toBe(2);
    expect(ir.tools.tools[1]!.oboFlag).toBe(true);

    expect(ir.agents.agents).toHaveLength(2);
    expect(ir.agents.delegations).toHaveLength(2);

    expect(ir.memory.entries).toHaveLength(2);
    expect(ir.memory.hasIndex).toBe(true);

    expect(ir.identity.authMethod).toBe('sso');
    expect(ir.identity.ssoProvider).toBe('azure-ad');
    expect(ir.identity.roles).toHaveLength(2);

    expect(ir.user.platform).toBe('claude-code');
    expect(ir.user.environment['SHELL']).toBe('bash');

    expect(ir.heartbeat.schedules).toHaveLength(2);
    expect(ir.heartbeat.lastHeartbeat).toBe('2026-04-16T12:30:00Z');

    expect(ir.skills.skills).toHaveLength(2);

    expect(ir.lobster.steps).toHaveLength(3);
    expect(ir.lobster.dependencies['test']).toEqual(['lint']);

    // Verify diagnostics
    expect(ir.diagnostics).toHaveLength(1);
    expect(ir.diagnostics[0]!.severity).toBe('warning');
  });
});

describe('Serialization Round-Trip Preserves Complex Types', () => {
  it('preserves all field types including dates and enums', () => {
    const ir = readerOutputFixture();
    const json = serializeWorkspaceIR(ir);
    const restored = deserializeWorkspaceIR(json);

    // Deep equality covers all fields
    expect(restored).toEqual(ir);

    // Explicitly verify date strings survive round-trip
    expect(restored.compiler.compiledAt).toBe('2026-04-16T00:00:00Z');
    expect(restored.heartbeat.lastHeartbeat).toBe('2026-04-16T12:30:00Z');

    // Verify enum-like string values survive
    expect(restored.identity.authMethod).toBe('sso');
    expect(restored.user.platform).toBe('claude-code');
    expect(restored.memory.entries[0]!.sensitivity).toBe('internal');
    expect(restored.memory.entries[1]!.sensitivity).toBe('restricted');
    expect(restored.diagnostics[0]!.severity).toBe('warning');

    // Verify trust levels survive as numbers
    expect(restored.tools.tools[0]!.trustLevel).toBe(2);
    expect(restored.tools.tools[1]!.trustLevel).toBe(4);

    // Verify nested objects survive
    expect(restored.user.environment).toEqual({ SHELL: 'bash', NODE_ENV: 'production' });
    expect(restored.lobster.dependencies).toEqual({ lint: ['scan'], test: ['lint'] });

    // Verify determinism: second round-trip produces identical JSON
    const json2 = serializeWorkspaceIR(restored);
    expect(json2).toBe(json);
  });
});
