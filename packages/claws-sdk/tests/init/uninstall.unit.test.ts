/**
 * L0 unit tests for uninstall.
 *
 * 4 tests:
 *  1. Backup creation — .claws/ backed up to ~/.claws-backups/{hash}/{timestamp}/
 *  2. Gitignore restore — claws entries removed from .gitignore
 *  3. Idempotency — no-op when .claws/ doesn't exist
 *  4. Audit chain archived separately in backup
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, mkdir, stat, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { uninstallWorkspace, workspaceHash } from '@bic/claws-sdk/init';

let tempDir: string;
let backupsDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-uninst-unit-'));
  backupsDir = await mkdtemp(join(tmpdir(), 'claws-backups-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
  await rm(backupsDir, { recursive: true, force: true });
});

describe('uninstall', () => {
  it('creates backup of .claws/ in backups directory', async () => {
    // Set up a .claws/ directory with some content
    const sidecarDir = join(tempDir, '.claws');
    await mkdir(join(sidecarDir, 'compiled'), { recursive: true });
    await writeFile(join(sidecarDir, 'compiled', 'policy.json'), '{"rules":[]}', 'utf-8');

    const result = await uninstallWorkspace(tempDir, backupsDir);

    expect(result.exitCode).toBe(0);
    expect(result.status).toBe('uninstalled');
    expect(result.backupPath).toBeDefined();

    // Backup directory should contain the sidecar backup
    const backupSidecar = join(result.backupPath!, 'sidecar');
    const s = await stat(backupSidecar);
    expect(s.isDirectory()).toBe(true);

    // Backed-up file should exist
    const backedUpFile = join(backupSidecar, 'compiled', 'policy.json');
    const content = await readFile(backedUpFile, 'utf-8');
    expect(content).toBe('{"rules":[]}');

    // .claws/ should be gone
    await expect(access(sidecarDir)).rejects.toThrow();

    // Backup path includes workspace hash
    const hash = workspaceHash(tempDir);
    expect(result.backupPath).toContain(hash);
  });

  it('reverts .gitignore additions made by init', async () => {
    // Set up .claws/ and a .gitignore with claws entries
    await mkdir(join(tempDir, '.claws'), { recursive: true });
    const gitignoreContent = [
      '# my project',
      'node_modules/',
      '',
      '# claws governance (sensitive)',
      '.claws/keys/',
      '.claws/secrets/',
      '',
    ].join('\n');
    await writeFile(join(tempDir, '.gitignore'), gitignoreContent, 'utf-8');

    const result = await uninstallWorkspace(tempDir, backupsDir);

    expect(result.status).toBe('uninstalled');
    expect(result.gitignoreRemoved).toContain('.claws/keys/');
    expect(result.gitignoreRemoved).toContain('.claws/secrets/');

    // .gitignore should no longer contain claws entries
    const updated = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(updated).not.toContain('.claws/keys/');
    expect(updated).not.toContain('.claws/secrets/');
    expect(updated).not.toContain('# claws governance (sensitive)');
    // Other entries preserved
    expect(updated).toContain('node_modules/');
  });

  it('is a no-op when .claws/ does not exist', async () => {
    const result = await uninstallWorkspace(tempDir, backupsDir);

    expect(result.exitCode).toBe(0);
    expect(result.status).toBe('no-op');
    expect(result.backupPath).toBeUndefined();
    expect(result.auditArchivePath).toBeUndefined();
  });

  it('archives audit chain separately in backup', async () => {
    // Set up .claws/ with an audit directory containing events
    const auditDir = join(tempDir, '.claws', 'audit');
    await mkdir(auditDir, { recursive: true });
    const auditEvent = JSON.stringify({ type: 'INIT', timestamp: '2026-01-01T00:00:00Z' });
    await writeFile(join(auditDir, 'events.jsonl'), auditEvent + '\n', 'utf-8');

    const result = await uninstallWorkspace(tempDir, backupsDir);

    expect(result.status).toBe('uninstalled');
    expect(result.auditArchivePath).toBeDefined();

    // Audit archive should contain the events file
    const archivedEvents = await readFile(
      join(result.auditArchivePath!, 'events.jsonl'),
      'utf-8',
    );
    expect(archivedEvents).toContain('INIT');

    // Audit also exists in the full sidecar backup
    const sidecarAudit = join(result.backupPath!, 'sidecar', 'audit', 'events.jsonl');
    const sidecarContent = await readFile(sidecarAudit, 'utf-8');
    expect(sidecarContent).toContain('INIT');
  });
});
