import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { OC_PARSED_FILES, parseWorkspace } from '../../src/workspace/index.js';

const FIXTURE_DIR = join(__dirname, '../fixtures/workspace-parser-full');

describe('parseWorkspace — e2e', () => {
  it('parses the fixture end-to-end and produces a serve-ready state', async () => {
    const state = await parseWorkspace(FIXTURE_DIR);

    // All 7 markdown files present means every WorkspaceState field is populated
    expect(state.workspaceRoot).toBe(FIXTURE_DIR);
    expect(state.soul.sections.length).toBeGreaterThan(0);

    // Every file in OC_PARSED_FILES has a section on the state.
    const stateByName: Record<string, unknown> = {
      'SOUL.md': state.soul,
      'MEMORY.md': state.memory,
      'IDENTITY.md': state.identity,
      'TOOLS.md': state.tools,
      'AGENTS.md': state.agents,
      'USER.md': state.user,
      'HEARTBEAT.md': state.heartbeat,
    };
    for (const name of OC_PARSED_FILES) {
      expect(stateByName[name], `expected ${name} populated`).not.toBeNull();
    }

    // The serve-layer chunk assembler joins WorkspaceState with GovernanceIR.
    // Proof that a chunk-shaped projection is constructible from the result:
    const chunks = [
      { id: 'soul', body: state.soul.raw },
      { id: 'tools', body: state.tools?.raw ?? '' },
      { id: 'identity', body: state.identity?.raw ?? '' },
      { id: 'user', body: state.user?.raw ?? '' },
    ];
    expect(chunks.every((c) => c.body.length > 0)).toBe(true);
    expect(chunks[0]!.body).toMatch(/^# Soul/);
  });
});
