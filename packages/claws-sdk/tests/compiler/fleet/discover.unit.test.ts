/**
 * L0 unit — workspace discovery (fleet/S01 AC-15/16).
 *
 * Lexicographic sort, non-directory filtering, directories without
 * lobster.yaml filtered, ENOENT on root surfaces as thrown error.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverWorkspaces } from '#src/compiler/fleet/discover.js';

function makeWorkspace(root: string, name: string, withLobster: boolean): void {
  const dir = join(root, name);
  mkdirSync(dir, { recursive: true });
  if (withLobster) {
    writeFileSync(join(dir, 'lobster.yaml'), 'name: ' + name + '\nsteps: []\n');
  }
}

describe('discoverWorkspaces (unit)', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'fleet-discover-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('returns immediate child directories containing lobster.yaml, lex-sorted', async () => {
    makeWorkspace(root, 'charlie', true);
    makeWorkspace(root, 'alpha', true);
    makeWorkspace(root, 'bravo', true);
    const result = await discoverWorkspaces(root);
    expect(result.map((r) => r.basename)).toEqual(['alpha', 'bravo', 'charlie']);
  });

  it('directories without lobster.yaml are silently skipped', async () => {
    makeWorkspace(root, 'alpha', true);
    makeWorkspace(root, 'no-lobster', false);
    makeWorkspace(root, 'bravo', true);
    const result = await discoverWorkspaces(root);
    expect(result.map((r) => r.basename)).toEqual(['alpha', 'bravo']);
  });

  it('plain files (non-directories) are skipped', async () => {
    writeFileSync(join(root, 'README.md'), '# fleet');
    makeWorkspace(root, 'alpha', true);
    const result = await discoverWorkspaces(root);
    expect(result.map((r) => r.basename)).toEqual(['alpha']);
  });

  it('ENOENT on fleet-dir root surfaces as thrown error', async () => {
    const missing = join(root, 'does-not-exist');
    await expect(discoverWorkspaces(missing)).rejects.toThrow();
  });
});
