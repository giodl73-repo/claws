import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseWorkspace,
  type WorkspaceState,
} from '../../src/workspace/index.js';

const FIXTURE_DIR = join(__dirname, '../fixtures/workspace-parser-full');

describe('parseWorkspace — integration', () => {
  it('parses the full 7-file markdown fixture and resolves cross-file references', async () => {
    const state = await parseWorkspace(FIXTURE_DIR);

    // Soul sections anchor the persona
    const soulHeadings = state.soul.sections.map((s) => s.heading);
    expect(soulHeadings).toContain('Purpose');
    expect(soulHeadings).toContain('Boundaries');

    // Every optional section is present in the fixture
    expect(state.memory).not.toBeNull();
    expect(state.identity).not.toBeNull();
    expect(state.tools).not.toBeNull();
    expect(state.agents).not.toBeNull();
    expect(state.user).not.toBeNull();
    expect(state.heartbeat).not.toBeNull();

    // Cross-file: tools declared in TOOLS.md are referenced by AGENTS.md
    const toolHeadings = new Set(state.tools!.sections.map((s) => s.heading));
    const agentBodies = state.agents!.sections.map((s) => s.body).join('\n');
    expect(toolHeadings.has('bash')).toBe(true);
    expect(toolHeadings.has('web_fetch')).toBe(true);
    expect(toolHeadings.has('database_query')).toBe(true);
    expect(agentBodies).toMatch(/web_fetch/);
    expect(agentBodies).toMatch(/bash/);

    // IDENTITY.md carries the CAP subsections (Deny Rules, Knowledge Sources,
    // Entitlements) that used to live in standalone files. They appear as
    // H2 sections on IDENTITY.md and their H3 entries carry the data.
    const identityHeadings = state.identity!.sections.map((s) => s.heading);
    expect(identityHeadings).toContain('Deny Rules');
    expect(identityHeadings).toContain('Knowledge Sources');
    expect(identityHeadings).toContain('Entitlements');

    const denyBody = state.identity!.sections.find((s) => s.heading === 'Deny Rules')!.body;
    expect(denyBody).toMatch(/bash/);
    expect(denyBody).toMatch(/web_fetch/);

    const entitlementsBody = state.identity!.sections.find(
      (s) => s.heading === 'Entitlements',
    )!.body;
    expect(entitlementsBody).toMatch(/analytics-warehouse/);
  });

  it('feeds a CompilationHost-style adapter without errors', async () => {
    // Emulates the pulse 24-27 chunk assembler: a consumer receives the
    // WorkspaceState and derives a deterministic summary identity from it.
    // This validates the parser's public surface is sufficient for the
    // serve layer without any SDK-internal helpers leaking in.
    async function fakeHostCompile(root: string): Promise<{
      soulDigest: string;
      optionalPresent: number;
      toolCount: number;
    }> {
      const state: WorkspaceState = await parseWorkspace(root);
      const optionalPresent = [
        state.memory,
        state.identity,
        state.tools,
        state.agents,
        state.user,
        state.heartbeat,
      ].filter((s) => s !== null).length;
      return {
        soulDigest: state.soul.preamble.slice(0, 32),
        optionalPresent,
        toolCount: state.tools?.sections.length ?? 0,
      };
    }

    const result = await fakeHostCompile(FIXTURE_DIR);
    expect(result.optionalPresent).toBe(6);
    expect(result.toolCount).toBe(3);
    expect(result.soulDigest.length).toBeGreaterThan(0);

    // And with a partial tree, the same consumer still works
    const partialRoot = await mkdtemp(join(tmpdir(), 'wsparser-int-'));
    try {
      await writeFile(
        join(partialRoot, 'SOUL.md'),
        '# Soul\n\n## Purpose\n\nMinimal.\n',
        'utf-8',
      );
      const partial = await fakeHostCompile(partialRoot);
      expect(partial.optionalPresent).toBe(0);
      expect(partial.toolCount).toBe(0);
    } finally {
      await rm(partialRoot, { recursive: true, force: true });
    }
  });
});
