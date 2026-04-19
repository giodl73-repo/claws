/**
 * L0 unit tests for agents-reader.ts
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { agentsReader } from '#src/compiler/readers/agents-reader.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('agentsReader', () => {
  it('parses AGENTS.md with agent definitions and tools', async () => {
    const result = await agentsReader.read(resolve(FIXTURES, 'full-workspace'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.agents.length).toBe(2);
    expect(result.data.agents[0]!.name).toBe('Security Auditor');
    expect(result.data.agents[0]!.tools).toContain('Read');
    expect(result.data.agents[1]!.name).toBe('Compliance Checker');
  });

  it('parses AGENTS.md with no agents defined', async () => {
    const result = await agentsReader.read(resolve(FIXTURES, 'reader-test-empty-content'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.agents).toHaveLength(0);
  });

  it('handles agent with no Tools field (empty tools array)', async () => {
    const result = await agentsReader.read(resolve(FIXTURES, 'reader-test-agent-no-tools'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.agents.length).toBe(1);
    expect(result.data.agents[0]!.name).toBe('Simple Agent');
    expect(result.data.agents[0]!.description).toContain('no tools');
    expect(result.data.agents[0]!.tools).toEqual([]);
  });

  it('handles agent with no key-value list items (bare text body)', async () => {
    const result = await agentsReader.read(resolve(FIXTURES, 'reader-test-agent-bare'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.agents.length).toBe(1);
    expect(result.data.agents[0]!.name).toBe('Bare Agent');
    expect(result.data.agents[0]!.description).toBe('');
    expect(result.data.agents[0]!.tools).toEqual([]);
  });

  it('returns warning for missing optional AGENTS.md', async () => {
    const result = await agentsReader.read('/nonexistent/path');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]!.severity).toBe('warning');
      expect(result.diagnostics[0]!.code).toBe('WORKSPACE-MISSING-OPTIONAL');
    }
  });
});
