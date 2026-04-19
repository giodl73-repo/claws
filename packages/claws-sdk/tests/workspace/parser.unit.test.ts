import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  OC_PARSED_FILES,
  parseWorkspace,
  WorkspaceError,
} from '../../src/workspace/index.js';

const SOUL_CONTENT = `# Soul

Persona preamble line.

## Purpose

Deliver clean governance.

## Boundaries

- No PII logging
`;

const MEMORY_CONTENT = `## Retention

30 days.
`;

const IDENTITY_CONTENT = `## Organization

- Organization: Acme
- Team: Platform

## Deny Rules

### No prod writes

Block writes to prod DSNs.

## Knowledge Sources

### Runbooks

- runbook-ingest.md

## Entitlements

### Paid tier

- gpt-enterprise
`;

const TOOLS_CONTENT = `## bash

Shell access.

## web_fetch

Read-only HTTP.
`;

const AGENTS_CONTENT = `## planner

Plans work.
`;

const USER_CONTENT = `## Contact

- Email: u@example.test
`;

const HEARTBEAT_CONTENT = `## On Start

- Check registry
`;

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'wsparser-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('parseWorkspace', () => {
  it('parses a minimal workspace that only has SOUL.md', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL_CONTENT, 'utf-8');

    const state = await parseWorkspace(root);

    expect(state.workspaceRoot).toBe(root);
    expect(state.soul.preamble).toContain('Persona preamble line.');
    expect(state.soul.sections.map((s) => s.heading)).toEqual(['Purpose', 'Boundaries']);
    expect(state.memory).toBeNull();
    expect(state.identity).toBeNull();
    expect(state.tools).toBeNull();
    expect(state.agents).toBeNull();
    expect(state.user).toBeNull();
    expect(state.heartbeat).toBeNull();
  });

  it('parses a full 7-file markdown workspace into every typed section', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL_CONTENT, 'utf-8');
    await writeFile(join(root, 'MEMORY.md'), MEMORY_CONTENT, 'utf-8');
    await writeFile(join(root, 'IDENTITY.md'), IDENTITY_CONTENT, 'utf-8');
    await writeFile(join(root, 'TOOLS.md'), TOOLS_CONTENT, 'utf-8');
    await writeFile(join(root, 'AGENTS.md'), AGENTS_CONTENT, 'utf-8');
    await writeFile(join(root, 'USER.md'), USER_CONTENT, 'utf-8');
    await writeFile(join(root, 'HEARTBEAT.md'), HEARTBEAT_CONTENT, 'utf-8');

    const state = await parseWorkspace(root);

    expect(state.soul).not.toBeNull();
    expect(state.memory?.sections[0]?.heading).toBe('Retention');
    expect(state.identity?.sections.map((s) => s.heading)).toEqual([
      'Organization',
      'Deny Rules',
      'Knowledge Sources',
      'Entitlements',
    ]);
    expect(state.tools?.sections.map((s) => s.heading)).toEqual(['bash', 'web_fetch']);
    expect(state.agents?.sections[0]?.heading).toBe('planner');
    expect(state.user?.sections[0]?.heading).toBe('Contact');
    expect(state.heartbeat?.sections[0]?.heading).toBe('On Start');
    expect(OC_PARSED_FILES).toHaveLength(7);
  });

  it('returns null for each missing optional file without throwing', async () => {
    await writeFile(join(root, 'SOUL.md'), SOUL_CONTENT, 'utf-8');
    await writeFile(join(root, 'TOOLS.md'), TOOLS_CONTENT, 'utf-8');

    const state = await parseWorkspace(root);

    expect(state.tools).not.toBeNull();
    expect(state.memory).toBeNull();
    expect(state.identity).toBeNull();
    expect(state.agents).toBeNull();
    expect(state.user).toBeNull();
    expect(state.heartbeat).toBeNull();
  });

  it('throws WorkspaceError when SOUL.md is missing', async () => {
    await writeFile(join(root, 'TOOLS.md'), TOOLS_CONTENT, 'utf-8');

    await expect(parseWorkspace(root)).rejects.toBeInstanceOf(WorkspaceError);
    await expect(parseWorkspace(root)).rejects.toMatchObject({
      code: 'WORKSPACE_SOUL_MISSING',
      workspaceRoot: root,
    });
  });

  it('preserves raw content byte-for-byte', async () => {
    const trickyRaw = '# Soul\n\n## Purpose\n\n  Weird  trailing spaces    \nNo final newline';
    await writeFile(join(root, 'SOUL.md'), trickyRaw, 'utf-8');

    const state = await parseWorkspace(root);

    expect(state.soul.raw).toBe(trickyRaw);
  });

  it('preserves BOM and CRLF in raw while still parsing sections', async () => {
    const bomCrlf = '\uFEFF# Soul\r\n\r\n## Purpose\r\n\r\nShip it.\r\n';
    await writeFile(join(root, 'SOUL.md'), bomCrlf, 'utf-8');
    // Empty optional file still parses without crashing.
    await writeFile(join(root, 'USER.md'), '', 'utf-8');

    const state = await parseWorkspace(root);

    expect(state.soul.raw).toBe(bomCrlf);
    expect(state.soul.raw.startsWith('\uFEFF')).toBe(true);
    expect(state.soul.raw.includes('\r\n')).toBe(true);
    expect(state.soul.sections[0]?.heading).toBe('Purpose');
    expect(state.user).not.toBeNull();
    expect(state.user?.sections).toEqual([]);
    expect(state.user?.preamble).toBe('');
  });
});
