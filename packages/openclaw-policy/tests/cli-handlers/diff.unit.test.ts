import { describe, it, expect } from 'vitest';

import { handle } from '../../src/cli-handlers/diff.js';
import type { PolicyIR } from '../../src/types/index.js';
import { waffles } from '../helpers/fixture.js';

describe('policy diff handler', () => {
  it('loads two snapshots, renders the delta, and returns exit 0', async () => {
    const a = waffles();
    const b = waffles({
      tools: [
        ...a.tools.slice(0, 2),
        { name: 'new-tool', riskLevel: 1, capabilities: ['READ'] },
      ],
    });
    const store = new Map<string, PolicyIR>([
      ['snap-a', a],
      ['snap-b', b],
    ]);
    const result = await handle(
      {
        binaryName: 'claws',
        args: ['snap-a', 'snap-b', '--workspace', '/ws'],
        cwd: '/cwd',
      },
      async (_ws, id) => {
        const ir = store.get(id);
        if (ir === undefined) throw new Error(`unknown snapshot: ${id}`);
        return ir;
      },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('changed');
    expect(result.stdout).toMatch(/added:.*new-tool/);
    expect(result.stdout).toMatch(/removed:.*vibe-check/);
  });

  it('reports identical when both snapshots canonicalize the same', async () => {
    const ir = waffles();
    const result = await handle(
      { binaryName: 'claws', args: ['a', 'b'], cwd: '/cwd' },
      async () => ir,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('identical');
    expect(result.stdout).not.toMatch(/added:/);
  });

  it('accepts --from/--to flag form in addition to positional args', async () => {
    let calls: string[] = [];
    const result = await handle(
      {
        binaryName: 'claws',
        args: ['--from', 'a1', '--to', 'b2', '--workspace', '/ws'],
        cwd: '/cwd',
      },
      async (_ws, id) => {
        calls.push(id);
        return waffles();
      },
    );
    expect(result.exitCode).toBe(0);
    expect(calls).toEqual(['a1', 'b2']);
  });

  it('returns exit 2 when fewer than two snapshot ids are supplied', async () => {
    const result = await handle(
      { binaryName: 'claws', args: ['only-one'], cwd: '/cwd' },
      async () => waffles(),
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('two snapshot ids required');
  });

  it('returns exit 2 when workspace cannot be resolved', async () => {
    const result = await handle(
      { binaryName: 'claws', args: ['a', 'b', '--workspace', ''], cwd: '' },
      async () => waffles(),
    );
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('workspace path required');
  });

  it('returns exit 1 with loader message when a snapshot is missing', async () => {
    const result = await handle(
      { binaryName: 'claws', args: ['a', 'missing'], cwd: '/cwd' },
      async (_ws, id) => {
        if (id === 'missing') throw new Error('ENOENT: snapshot missing not found');
        return waffles();
      },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('ENOENT');
  });

  it('returns exit 1 when the library diff throws mid-call', async () => {
    const broken = {} as PolicyIR;
    const result = await handle(
      { binaryName: 'claws', args: ['a', 'b'], cwd: '/cwd' },
      async () => broken,
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toMatch(/claws policy diff:/);
  });

  it('renders modified tools when a name collides but the spec changed', async () => {
    const a = waffles();
    const b = waffles({
      tools: [
        { name: 'draft-reply', riskLevel: 2, capabilities: ['READ'] },
        ...a.tools.filter((t) => t.name !== 'draft-reply'),
      ],
    });
    const store = new Map<string, PolicyIR>([
      ['a', a],
      ['b', b],
    ]);
    const result = await handle(
      { binaryName: 'claws', args: ['a', 'b'], cwd: '/cwd' },
      async (_ws, id) => store.get(id)!,
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/modified:.*draft-reply/);
  });
});
