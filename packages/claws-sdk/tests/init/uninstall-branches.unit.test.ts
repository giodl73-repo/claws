/**
 * L0: uninstall — branch coverage for claws.json backup/removal,
 * .gitignore with no claws entries, and trailing blank line cleanup.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtemp,
  writeFile,
  readFile,
  rm,
  mkdir,
  access,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { uninstallWorkspace } from '@bic/claws-sdk/init';

let tempDir: string;
let backupsDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-uninst-br-'));
  backupsDir = await mkdtemp(join(tmpdir(), 'claws-backups-br-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
  await rm(backupsDir, { recursive: true, force: true });
});

describe('uninstall — branch coverage', () => {
  it('backs up and removes claws.json when present', async () => {
    await mkdir(join(tempDir, '.claws'), { recursive: true });
    await writeFile(join(tempDir, 'claws.json'), '{"version":1}', 'utf-8');

    const result = await uninstallWorkspace(tempDir, backupsDir);
    expect(result.status).toBe('uninstalled');

    // claws.json should be backed up
    const backedUp = await readFile(
      join(result.backupPath!, 'claws.json'),
      'utf-8',
    );
    expect(backedUp).toBe('{"version":1}');

    // claws.json should be removed from workspace
    await expect(access(join(tempDir, 'claws.json'))).rejects.toThrow();
  });

  it('handles workspace without claws.json (no backup of config)', async () => {
    await mkdir(join(tempDir, '.claws'), { recursive: true });
    // No claws.json created

    const result = await uninstallWorkspace(tempDir, backupsDir);
    expect(result.status).toBe('uninstalled');
    // Should not throw even when claws.json is absent
    expect(result.backupPath).toBeDefined();
  });

  it('.gitignore with no claws entries leaves file unchanged', async () => {
    await mkdir(join(tempDir, '.claws'), { recursive: true });
    const originalContent = '# project\nnode_modules/\ndist/\n';
    await writeFile(join(tempDir, '.gitignore'), originalContent, 'utf-8');

    const result = await uninstallWorkspace(tempDir, backupsDir);
    expect(result.status).toBe('uninstalled');
    expect(result.gitignoreRemoved).toBeUndefined();

    // .gitignore should be unchanged
    const content = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(content).toBe(originalContent);
  });

  it('.gitignore does not exist — no error', async () => {
    await mkdir(join(tempDir, '.claws'), { recursive: true });
    // No .gitignore at all

    const result = await uninstallWorkspace(tempDir, backupsDir);
    expect(result.status).toBe('uninstalled');
    expect(result.gitignoreRemoved).toBeUndefined();
  });

  it('cleans up trailing blank lines after removing claws entries', async () => {
    await mkdir(join(tempDir, '.claws'), { recursive: true });
    // .gitignore with claws entries followed by trailing blank lines
    const gitignoreContent = [
      'node_modules/',
      '',
      '# claws governance (sensitive)',
      '.claws/keys/',
      '.claws/secrets/',
      '.claws/cache/',
      '.claws/runtime/',
      '',
      '',
    ].join('\n');
    await writeFile(join(tempDir, '.gitignore'), gitignoreContent, 'utf-8');

    const result = await uninstallWorkspace(tempDir, backupsDir);
    expect(result.gitignoreRemoved).toBeDefined();
    expect(result.gitignoreRemoved!.length).toBeGreaterThan(0);

    const updated = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    // Should not have trailing blank lines
    expect(updated.endsWith('\n\n')).toBe(false);
    // Should still have node_modules
    expect(updated).toContain('node_modules/');
  });

  it('handles .gitignore that becomes empty after removal', async () => {
    await mkdir(join(tempDir, '.claws'), { recursive: true });
    // .gitignore with ONLY claws entries
    const gitignoreContent = [
      '# claws governance (sensitive)',
      '.claws/keys/',
      '.claws/secrets/',
    ].join('\n');
    await writeFile(join(tempDir, '.gitignore'), gitignoreContent, 'utf-8');

    const result = await uninstallWorkspace(tempDir, backupsDir);
    expect(result.gitignoreRemoved!.length).toBeGreaterThan(0);

    const updated = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    // Should be empty (or just empty string)
    expect(updated).toBe('');
  });

  it('uses default backups root (~/.claws-backups) when not provided', async () => {
    await mkdir(join(tempDir, '.claws'), { recursive: true });

    const result = await uninstallWorkspace(tempDir);
    expect(result.status).toBe('uninstalled');
    expect(result.backupPath).toBeDefined();
    // Default root is ~/.claws-backups
    expect(result.backupPath!).toContain('.claws-backups');

    // Cleanup the default backup
    const { rm: rmAsync } = await import('node:fs/promises');
    const { homedir } = await import('node:os');
    const { join: pathJoin } = await import('node:path');
    const { workspaceHash: wsHash } = await import('@bic/claws-sdk/init');
    const hash = wsHash(tempDir);
    const defaultBackup = pathJoin(homedir(), '.claws-backups', hash);
    try {
      await rmAsync(defaultBackup, { recursive: true, force: true });
    } catch {
      // best effort
    }
  });

  it('audit directory is always created (GOVERNANCE_REMOVED event)', async () => {
    await mkdir(join(tempDir, '.claws', 'compiled'), { recursive: true });
    // No .claws/audit directory initially, but uninstall creates it
    // via appendAuditEvent(GOVERNANCE_REMOVED) before archiving

    const result = await uninstallWorkspace(tempDir, backupsDir);
    expect(result.status).toBe('uninstalled');
    // auditArchivePath should be defined because uninstall creates audit dir
    expect(result.auditArchivePath).toBeDefined();
  });
});
