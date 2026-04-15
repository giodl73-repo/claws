/**
 * L1 integration tests for uninstall.
 *
 * 2 tests:
 *  1. Uninstall round-trip produces clean workspace (no .claws/ remnants)
 *  2. Bypass audit chain contains BYPASS_ACTIVATED event after checkBypass
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, readdir, access, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { initWorkspace, uninstallWorkspace } from '@bic/claws-sdk/init';
import { checkBypass, CLAWS_BYPASS_ENV } from '@bic/claws-sdk/init';

let tempDir: string;
let backupsDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-uninst-int-'));
  backupsDir = await mkdtemp(join(tmpdir(), 'claws-backups-int-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
  await rm(backupsDir, { recursive: true, force: true });
});

describe('uninstall integration', () => {
  it('init → uninstall produces clean workspace with no .claws/ remnants', async () => {
    // Set up a Node.js workspace
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test-project', version: '1.0.0' }),
      'utf-8',
    );

    // Capture original .gitignore state (none)
    const hadGitignore = await fileExists(join(tempDir, '.gitignore'));
    expect(hadGitignore).toBe(false);

    // Init
    const initResult = await initWorkspace(tempDir);
    expect(initResult.exitCode).toBe(0);

    // Verify .claws/ exists
    const sidecarStat = await stat(join(tempDir, '.claws'));
    expect(sidecarStat.isDirectory()).toBe(true);

    // Uninstall
    const uninstallResult = await uninstallWorkspace(tempDir, backupsDir);
    expect(uninstallResult.exitCode).toBe(0);
    expect(uninstallResult.status).toBe('uninstalled');
    expect(uninstallResult.backupPath).toBeDefined();

    // .claws/ should be gone
    await expect(access(join(tempDir, '.claws'))).rejects.toThrow();

    // .gitignore should not contain claws entries
    const gitignore = await readFile(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignore).not.toContain('.claws/keys/');
    expect(gitignore).not.toContain('.claws/secrets/');

    // Backup should exist and contain the sidecar
    const backupContents = await readdir(join(uninstallResult.backupPath!, 'sidecar'));
    expect(backupContents.length).toBeGreaterThan(0);
  });

  it('bypass audit chain contains BYPASS_ACTIVATED event', async () => {
    // Init workspace
    await writeFile(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'test-project' }),
      'utf-8',
    );
    await initWorkspace(tempDir);

    // Activate bypass
    const env = { [CLAWS_BYPASS_ENV]: '1' };
    const bypassResult = await checkBypass(tempDir, undefined, env);
    expect(bypassResult.bypassed).toBe(true);
    expect(bypassResult.auditRecorded).toBe(true);

    // Read the signed audit chain and verify the event
    const auditFile = join(tempDir, '.claws', 'audit', 'chain.jsonl');
    const content = await readFile(auditFile, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines.length).toBeGreaterThanOrEqual(1);

    const event = JSON.parse(lines[0]);
    expect(event.eventType).toBe('BYPASS_ACTIVATED');
    expect(event.actor).toBeTruthy();
    expect(event.hmacSignature).toMatch(/^[0-9a-f]{64}$/);
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
