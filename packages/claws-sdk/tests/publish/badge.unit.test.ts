/**
 * L0: Badge freshness — reads current SKILL.md frontmatter at publish time.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import {
  readFreshBadge,
  parseBadgeFromFrontmatter,
  writeBadgeVersion,
  readBadgeStore,
} from '../../src/publish/badge.js';

function tempDir(): string {
  return join(tmpdir(), `claws-test-badge-${randomBytes(4).toString('hex')}`);
}

describe('readFreshBadge', () => {
  let dir: string;

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('returns null when SKILL.md does not exist', async () => {
    const badge = await readFreshBadge(dir, '1.0.0');
    expect(badge).toBeNull();
  });

  it('reads fresh badge data from SKILL.md frontmatter', async () => {
    const skillMd = [
      '---',
      'name: test-skill',
      'tier: verified',
      'heuristic-risk: R3',
      'heuristic-obo: true',
      'heuristic-risk-confidence: 0.85',
      'heuristic-data-classification: internal',
      '---',
      '',
      '# Test Skill',
    ].join('\n');

    await writeFile(join(dir, 'SKILL.md'), skillMd, 'utf-8');

    const badge = await readFreshBadge(dir, '1.0.0');
    expect(badge).not.toBeNull();
    expect(badge!.name).toBe('test-skill');
    expect(badge!.tier).toBe('verified');
    expect(badge!.risk).toBe('R3');
    expect(badge!.obo).toBe(true);
    expect(badge!.confidence).toBe(0.85);
    expect(badge!.dataClassification).toBe('internal');
    expect(badge!.version).toBe('1.0.0');
    expect(badge!.capturedAt).toBeTruthy();
  });

  it('reads fresh from disk each time (no cache)', async () => {
    // Write version 1
    await writeFile(join(dir, 'SKILL.md'), '---\nname: v1\ntier: declared\n---\n');
    const badge1 = await readFreshBadge(dir, '1.0.0');
    expect(badge1!.name).toBe('v1');

    // Update on disk
    await writeFile(join(dir, 'SKILL.md'), '---\nname: v2\ntier: verified\n---\n');
    const badge2 = await readFreshBadge(dir, '2.0.0');
    expect(badge2!.name).toBe('v2');
    expect(badge2!.tier).toBe('verified');
  });
});

describe('parseBadgeFromFrontmatter', () => {
  it('extracts all badge fields', () => {
    const content = '---\nname: my-skill\ntier: typed\nrisk: R2\nobo: false\n---\n';
    const badge = parseBadgeFromFrontmatter(content, '3.0.0');
    expect(badge.name).toBe('my-skill');
    expect(badge.tier).toBe('typed');
    expect(badge.risk).toBe('R2');
    expect(badge.obo).toBe(false);
    expect(badge.version).toBe('3.0.0');
  });

  it('uses defaults for missing fields', () => {
    const content = '---\n---\n';
    const badge = parseBadgeFromFrontmatter(content, '1.0.0');
    expect(badge.name).toBe('unknown');
    expect(badge.tier).toBe('declared');
    expect(badge.risk).toBe('R1');
    expect(badge.obo).toBe(false);
    expect(badge.dataClassification).toBe('public');
    expect(badge.confidence).toBeNull();
  });
});

describe('writeBadgeVersion + readBadgeStore', () => {
  let dir: string;

  beforeEach(async () => {
    dir = tempDir();
    await mkdir(dir, { recursive: true });
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it('writes and reads back badge versions', async () => {
    const badge1 = parseBadgeFromFrontmatter('---\nname: s1\ntier: declared\n---\n', '1.0.0');
    await writeBadgeVersion(dir, badge1);

    const badge2 = parseBadgeFromFrontmatter('---\nname: s1\ntier: typed\n---\n', '2.0.0');
    await writeBadgeVersion(dir, badge2);

    const store = await readBadgeStore(dir);
    expect(store.versions).toHaveLength(2);
    expect(store.versions[0]!.version).toBe('2.0.0');
    expect(store.versions[1]!.version).toBe('1.0.0');
  });

  it('returns empty store when no badges exist', async () => {
    const store = await readBadgeStore(dir);
    expect(store.versions).toHaveLength(0);
  });
});
