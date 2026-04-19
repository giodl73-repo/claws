/**
 * L0: OCWorkspaceIR serialization round-trip and error handling.
 *
 * 2 unit tests:
 * 1. Round-trip serialize -> deserialize produces identical IR
 * 2. Deserialize rejects malformed JSON with error
 */

import { describe, it, expect } from 'vitest';
import type {
  OCWorkspaceIR,
  FileReference,
} from '../../../src/compiler/ir/index.js';
import {
  serializeWorkspaceIR,
  deserializeWorkspaceIR,
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
      principles: ['principle-1'],
      voice: 'professional',
      boundaries: [{ text: 'never bypass security', line: 3 }],
      source: fileRef('SOUL.md'),
    },
    tools: {
      tools: [
        {
          name: 'bash',
          description: 'Execute commands',
          trustLevel: 2,
          oboFlag: false,
          line: 1,
        },
      ],
      source: fileRef('TOOLS.md'),
    },
    agents: {
      agents: [
        {
          name: 'worker',
          description: 'Worker agent',
          tools: ['bash'],
          line: 1,
        },
      ],
      delegations: [
        { from: 'main', to: 'worker', tools: ['bash'], line: 2 },
      ],
      source: fileRef('AGENTS.md'),
    },
    memory: {
      entries: [
        { label: 'context', sensitivity: 'internal', retention: 'session', line: 1 },
      ],
      hasIndex: true,
      source: fileRef('MEMORY.md'),
    },
    identity: {
      organization: 'acme',
      team: 'platform',
      authMethod: 'sso',
      ssoProvider: 'entra-id',
      roles: [{ role: 'admin', permissions: ['read', 'write'] }],
      source: fileRef('IDENTITY.md'),
    },
    user: {
      role: 'engineer',
      bounds: ['code-review', 'deploy'],
      platform: 'claude-code',
      environment: { SHELL: 'bash', EDITOR: 'vim' },
      source: fileRef('USER.md'),
    },
    heartbeat: {
      schedules: [
        { trigger: 'on_start', actions: ['health-check'], line: 1 },
      ],
      lastHeartbeat: '2026-04-16T12:00:00Z',
      status: 'healthy',
      source: fileRef('HEARTBEAT.md'),
    },
    skills: {
      skills: [
        {
          name: 'code-review',
          description: 'Review code changes',
          requiredTools: ['bash'],
          path: 'skills/code-review',
        },
      ],
      source: fileRef('skills/'),
    },
    lobster: {
      name: 'ci-pipeline',
      description: 'Run CI checks',
      steps: [
        { name: 'lint', command: 'npm run lint' },
        { name: 'test', command: 'npm test' },
      ],
      dependencies: { test: ['lint'] },
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

describe('OCWorkspaceIR Serialization', () => {
  it('round-trip serialize -> deserialize produces identical IR', () => {
    const ir = minimalWorkspaceIR();
    const json = serializeWorkspaceIR(ir);
    const restored = deserializeWorkspaceIR(json);

    expect(restored).toEqual(ir);

    // Verify double round-trip produces identical JSON (determinism)
    const json2 = serializeWorkspaceIR(restored);
    expect(json2).toBe(json);
  });

  it('deserialize rejects malformed JSON with error', () => {
    // Invalid JSON syntax
    expect(() => deserializeWorkspaceIR('{not valid json}')).toThrow(
      'Failed to parse OCWorkspaceIR JSON',
    );

    // Non-object input (null, array, primitive)
    expect(() => deserializeWorkspaceIR('null')).toThrow(
      'OCWorkspaceIR must be a non-null object',
    );
    expect(() => deserializeWorkspaceIR('"string"')).toThrow(
      'OCWorkspaceIR must be a non-null object',
    );
    expect(() => deserializeWorkspaceIR('42')).toThrow(
      'OCWorkspaceIR must be a non-null object',
    );

    // Valid JSON but missing required fields
    expect(() => deserializeWorkspaceIR('{}')).toThrow(
      'OCWorkspaceIR.soul must be a non-null object',
    );

    // Has soul but missing other sub-IRs
    expect(() => deserializeWorkspaceIR('{"soul": {"persona": "x"}}')).toThrow(
      'OCWorkspaceIR.tools must be a non-null object',
    );

    // Null sub-IR
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify({
        soul: null,
        tools: { tools: [] },
        agents: { agents: [] },
        memory: { entries: [] },
        identity: { organization: 'x' },
        user: { environment: {} },
        heartbeat: { schedules: [] },
        skills: { skills: [] },
        lobster: { steps: [] },
        compiler: {},
        diagnostics: [],
      })),
    ).toThrow('OCWorkspaceIR.soul must be a non-null object');

    // Shallow sub-IR with garbage content (S-M5: deepened validation)
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify({
        soul: { garbage: true },
        tools: { tools: [] },
        agents: { agents: [] },
        memory: { entries: [] },
        identity: { organization: 'x' },
        user: { environment: {} },
        heartbeat: { schedules: [] },
        skills: { skills: [] },
        lobster: { steps: [] },
        compiler: { compilerVersion: '0.1.0', compiledAt: '2026-04-16T00:00:00Z', schemaVersion: 1 },
        diagnostics: [],
      })),
    ).toThrow('OCWorkspaceIR.soul.persona must be a string');

    // Missing compiler metadata (sub-IRs are valid)
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify({
        soul: { persona: 'x' },
        tools: { tools: [] },
        agents: { agents: [] },
        memory: { entries: [] },
        identity: { organization: 'x' },
        user: { environment: {} },
        heartbeat: { schedules: [] },
        skills: { skills: [] },
        lobster: { steps: [] },
        diagnostics: [],
      })),
    ).toThrow('OCWorkspaceIR.compiler must be a non-null object');

    // Invalid compiler metadata: compilerVersion not a string
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify({
        soul: { persona: 'x' },
        tools: { tools: [] },
        agents: { agents: [] },
        memory: { entries: [] },
        identity: { organization: 'x' },
        user: { environment: {} },
        heartbeat: { schedules: [] },
        skills: { skills: [] },
        lobster: { steps: [] },
        compiler: { compilerVersion: 42 },
        diagnostics: [],
      })),
    ).toThrow('OCWorkspaceIR.compiler.compilerVersion must be a string');

    // Invalid compiler metadata: compiledAt not a string
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify({
        soul: { persona: 'x' },
        tools: { tools: [] },
        agents: { agents: [] },
        memory: { entries: [] },
        identity: { organization: 'x' },
        user: { environment: {} },
        heartbeat: { schedules: [] },
        skills: { skills: [] },
        lobster: { steps: [] },
        compiler: { compilerVersion: '0.1.0', compiledAt: 12345 },
        diagnostics: [],
      })),
    ).toThrow('OCWorkspaceIR.compiler.compiledAt must be a string');

    // Invalid compiler metadata: schemaVersion not a number
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify({
        soul: { persona: 'x' },
        tools: { tools: [] },
        agents: { agents: [] },
        memory: { entries: [] },
        identity: { organization: 'x' },
        user: { environment: {} },
        heartbeat: { schedules: [] },
        skills: { skills: [] },
        lobster: { steps: [] },
        compiler: { compilerVersion: '0.1.0', compiledAt: '2026-04-16T00:00:00Z', schemaVersion: 'v1' },
        diagnostics: [],
      })),
    ).toThrow('OCWorkspaceIR.compiler.schemaVersion must be a number');

    // Missing diagnostics array
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify({
        soul: { persona: 'x' },
        tools: { tools: [] },
        agents: { agents: [] },
        memory: { entries: [] },
        identity: { organization: 'x' },
        user: { environment: {} },
        heartbeat: { schedules: [] },
        skills: { skills: [] },
        lobster: { steps: [] },
        compiler: { compilerVersion: '0.1.0', compiledAt: '2026-04-16T00:00:00Z', schemaVersion: 1 },
      })),
    ).toThrow('OCWorkspaceIR.diagnostics must be an array');
  });

  it('rejects each sub-IR with invalid inner field types', () => {
    // Helper: build a valid-shape object, then override one sub-IR field
    function validBase(overrides: Record<string, unknown> = {}) {
      return {
        soul: { persona: 'x' },
        tools: { tools: [] },
        agents: { agents: [] },
        memory: { entries: [] },
        identity: { organization: 'x' },
        user: { environment: {} },
        heartbeat: { schedules: [] },
        skills: { skills: [] },
        lobster: { steps: [] },
        compiler: { compilerVersion: '0.1.0', compiledAt: '2026-04-16T00:00:00Z', schemaVersion: 1 },
        diagnostics: [],
        ...overrides,
      };
    }

    // tools.tools must be an array
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify(validBase({ tools: { tools: 'not-array' } }))),
    ).toThrow('OCWorkspaceIR.tools.tools must be an array');

    // agents.agents must be an array
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify(validBase({ agents: { agents: 42 } }))),
    ).toThrow('OCWorkspaceIR.agents.agents must be an array');

    // memory.entries must be an array
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify(validBase({ memory: { entries: {} } }))),
    ).toThrow('OCWorkspaceIR.memory.entries must be an array');

    // identity.organization must be a string
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify(validBase({ identity: { organization: 123 } }))),
    ).toThrow('OCWorkspaceIR.identity.organization must be a string');

    // heartbeat.schedules must be an array
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify(validBase({ heartbeat: { schedules: 'nope' } }))),
    ).toThrow('OCWorkspaceIR.heartbeat.schedules must be an array');

    // skills.skills must be an array
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify(validBase({ skills: { skills: null } }))),
    ).toThrow('OCWorkspaceIR.skills.skills must be an array');

    // lobster.steps must be an array
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify(validBase({ lobster: { steps: false } }))),
    ).toThrow('OCWorkspaceIR.lobster.steps must be an array');

    // user.environment must be an object (not null)
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify(validBase({ user: { environment: null } }))),
    ).toThrow('OCWorkspaceIR.user.environment must be an object');

    // user.environment must be an object (not a string)
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify(validBase({ user: { environment: 'string' } }))),
    ).toThrow('OCWorkspaceIR.user.environment must be an object');
  });

  it('rejects each sub-IR when set to null individually', () => {
    function validBase(overrides: Record<string, unknown> = {}) {
      return {
        soul: { persona: 'x' },
        tools: { tools: [] },
        agents: { agents: [] },
        memory: { entries: [] },
        identity: { organization: 'x' },
        user: { environment: {} },
        heartbeat: { schedules: [] },
        skills: { skills: [] },
        lobster: { steps: [] },
        compiler: { compilerVersion: '0.1.0', compiledAt: '2026-04-16T00:00:00Z', schemaVersion: 1 },
        diagnostics: [],
        ...overrides,
      };
    }

    // Each sub-IR null triggers the "must be a non-null object" branch
    expect(() => deserializeWorkspaceIR(JSON.stringify(validBase({ tools: null })))).toThrow(
      'OCWorkspaceIR.tools must be a non-null object',
    );
    expect(() => deserializeWorkspaceIR(JSON.stringify(validBase({ agents: null })))).toThrow(
      'OCWorkspaceIR.agents must be a non-null object',
    );
    expect(() => deserializeWorkspaceIR(JSON.stringify(validBase({ memory: null })))).toThrow(
      'OCWorkspaceIR.memory must be a non-null object',
    );
    expect(() => deserializeWorkspaceIR(JSON.stringify(validBase({ identity: null })))).toThrow(
      'OCWorkspaceIR.identity must be a non-null object',
    );
    expect(() => deserializeWorkspaceIR(JSON.stringify(validBase({ user: null })))).toThrow(
      'OCWorkspaceIR.user must be a non-null object',
    );
    expect(() => deserializeWorkspaceIR(JSON.stringify(validBase({ heartbeat: null })))).toThrow(
      'OCWorkspaceIR.heartbeat must be a non-null object',
    );
    expect(() => deserializeWorkspaceIR(JSON.stringify(validBase({ skills: null })))).toThrow(
      'OCWorkspaceIR.skills must be a non-null object',
    );
    expect(() => deserializeWorkspaceIR(JSON.stringify(validBase({ lobster: null })))).toThrow(
      'OCWorkspaceIR.lobster must be a non-null object',
    );
  });

  it('rejects array input at sub-IR validation', () => {
    // Arrays pass typeof === 'object' but fail sub-IR checks
    expect(() => deserializeWorkspaceIR('[]')).toThrow(
      'OCWorkspaceIR.soul must be a non-null object',
    );
  });

  it('serializer handles arrays and primitives without sorting', () => {
    // Arrays should pass through without being sorted as objects
    const ir = minimalWorkspaceIR();
    const json = serializeWorkspaceIR(ir);
    const parsed = JSON.parse(json);

    // tools.tools is an array and should remain intact
    expect(Array.isArray(parsed.tools.tools)).toBe(true);
    // diagnostics is an array and should remain intact
    expect(Array.isArray(parsed.diagnostics)).toBe(true);
  });

  it('rejects compiler as null', () => {
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify({
        soul: { persona: 'x' },
        tools: { tools: [] },
        agents: { agents: [] },
        memory: { entries: [] },
        identity: { organization: 'x' },
        user: { environment: {} },
        heartbeat: { schedules: [] },
        skills: { skills: [] },
        lobster: { steps: [] },
        compiler: null,
        diagnostics: [],
      })),
    ).toThrow('OCWorkspaceIR.compiler must be a non-null object');
  });

  it('rejects diagnostics as non-array types', () => {
    expect(() =>
      deserializeWorkspaceIR(JSON.stringify({
        soul: { persona: 'x' },
        tools: { tools: [] },
        agents: { agents: [] },
        memory: { entries: [] },
        identity: { organization: 'x' },
        user: { environment: {} },
        heartbeat: { schedules: [] },
        skills: { skills: [] },
        lobster: { steps: [] },
        compiler: { compilerVersion: '0.1.0', compiledAt: '2026-04-16T00:00:00Z', schemaVersion: 1 },
        diagnostics: 'not-array',
      })),
    ).toThrow('OCWorkspaceIR.diagnostics must be an array');
  });
});
