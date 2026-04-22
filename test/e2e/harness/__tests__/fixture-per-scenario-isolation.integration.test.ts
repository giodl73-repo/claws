import { describe, it, expect, afterEach } from 'vitest';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
  stat,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyFixture } from '../fixture-copier.ts';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop()!;
    await rm(dir, { recursive: true, force: true });
  }
});

async function makeSharedSource(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'pulse36-shared-'));
  createdDirs.push(dir);
  await mkdir(join(dir, 'policies'), { recursive: true });
  await writeFile(join(dir, 'SOUL.md'), '# shared source\n', 'utf8');
  await writeFile(join(dir, 'policies', 'rule.yaml'), 'rule: one\n', 'utf8');
  return dir;
}

describe('fixture isolation — three parallel scenarios', () => {
  it('each scenario gets its own tmp dir and source is unmodified', async () => {
    const shared = await makeSharedSource();
    const sourceBefore = await readFile(join(shared, 'SOUL.md'), 'utf8');

    const [a, b, c] = await Promise.all([
      copyFixture(shared, 'scenario-a'),
      copyFixture(shared, 'scenario-b'),
      copyFixture(shared, 'scenario-c'),
    ]);
    createdDirs.push(a, b, c);

    // All three dests are distinct, all three exist, none collide with
    // the shared source.
    expect(new Set([a, b, c]).size).toBe(3);
    expect(a).not.toBe(shared);
    expect(b).not.toBe(shared);
    expect(c).not.toBe(shared);

    // Mutate each copy independently — no bleed between scenarios.
    await writeFile(join(a, 'SOUL.md'), 'A-mutated\n', 'utf8');
    await writeFile(join(b, 'SOUL.md'), 'B-mutated\n', 'utf8');
    // c left untouched.

    expect(await readFile(join(a, 'SOUL.md'), 'utf8')).toBe('A-mutated\n');
    expect(await readFile(join(b, 'SOUL.md'), 'utf8')).toBe('B-mutated\n');
    expect(await readFile(join(c, 'SOUL.md'), 'utf8')).toBe('# shared source\n');

    // Shared source is byte-identical to what we wrote before the copy.
    const sourceAfter = await readFile(join(shared, 'SOUL.md'), 'utf8');
    expect(sourceAfter).toBe(sourceBefore);
  });

  it('tmp dirs are labelled for presuite-hygiene sweep discovery', async () => {
    const shared = await makeSharedSource();
    const dest = await copyFixture(shared, 'sweep-label');
    createdDirs.push(dest);

    // Pulse 37 presuite-hygiene relies on the `claws-harness-` prefix +
    // the scenarioId segment to decide what to sweep.
    const basename = dest.split(/[\\/]/).pop() ?? '';
    expect(basename).toMatch(/^claws-harness-sweep-label-[0-9a-f-]+$/);
  });

  it('parallel copies preserve nested file bytes independently', async () => {
    const shared = await makeSharedSource();
    const [a, b, c] = await Promise.all([
      copyFixture(shared, 'parallel-a'),
      copyFixture(shared, 'parallel-b'),
      copyFixture(shared, 'parallel-c'),
    ]);
    createdDirs.push(a, b, c);

    // Every copy must contain the nested rule file untouched.
    for (const dest of [a, b, c]) {
      const st = await stat(join(dest, 'policies', 'rule.yaml'));
      expect(st.isFile()).toBe(true);
      const bytes = await readFile(join(dest, 'policies', 'rule.yaml'), 'utf8');
      expect(bytes).toBe('rule: one\n');
    }
  });
});
