/**
 * L3: CLI acceptance — `claws protect secrets` init/set/get/list/delete.
 *
 * Verifies the CLI surface for vault operations produces correct output
 * and exit codes on a reference workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { claws } from '../accept/helpers.js';

const PASSPHRASE = 'cli-accept-strong-passphrase!';

describe('CLI acceptance: claws protect secrets', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('init + set + get + list + delete lifecycle exits 0', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cli-secrets-'));
    const envWithPass = { CLAWS_VAULT_PASSPHRASE: PASSPHRASE };

    // Write minimal claws.json so workspace detection succeeds
    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({ trustTier: 2 }), 'utf-8');

    // 1. Init vault
    const initResult = await claws(
      ['protect', 'secrets', 'init'],
      { cwd: tempDir, env: envWithPass },
    );
    expect(initResult.exitCode).toBe(0);
    expect(initResult.stdout).toContain('Vault initialized');

    // 2. Set a secret
    const setResult = await claws(
      ['protect', 'secrets', 'set', 'api-key', 'sk-12345'],
      { cwd: tempDir, env: envWithPass },
    );
    expect(setResult.exitCode).toBe(0);
    expect(setResult.stdout).toContain('stored');

    // 3. Get the secret
    const getResult = await claws(
      ['protect', 'secrets', 'get', 'api-key'],
      { cwd: tempDir, env: envWithPass },
    );
    expect(getResult.exitCode).toBe(0);
    expect(getResult.stdout).toContain('sk-12345');

    // 4. List secrets
    const listResult = await claws(
      ['protect', 'secrets', 'list'],
      { cwd: tempDir },
    );
    expect(listResult.exitCode).toBe(0);
    expect(listResult.stdout).toContain('api-key');

    // 5. Delete the secret
    const deleteResult = await claws(
      ['protect', 'secrets', 'delete', 'api-key'],
      { cwd: tempDir, env: envWithPass },
    );
    expect(deleteResult.exitCode).toBe(0);
    expect(deleteResult.stdout).toContain('deleted');

    // 6. List again — should be empty
    const listAfter = await claws(
      ['protect', 'secrets', 'list'],
      { cwd: tempDir },
    );
    expect(listAfter.exitCode).toBe(0);
    expect(listAfter.stdout).toContain('No secrets stored');
  });

  it('get with wrong passphrase exits 1 with error message', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cli-secrets-wrong-'));

    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({ trustTier: 2 }), 'utf-8');

    // Init and set with correct passphrase
    await claws(
      ['protect', 'secrets', 'init'],
      { cwd: tempDir, env: { CLAWS_VAULT_PASSPHRASE: PASSPHRASE } },
    );
    await claws(
      ['protect', 'secrets', 'set', 'token', 'secret-value'],
      { cwd: tempDir, env: { CLAWS_VAULT_PASSPHRASE: PASSPHRASE } },
    );

    // Get with wrong passphrase via env var
    const result = await claws(
      ['protect', 'secrets', 'get', 'token'],
      { cwd: tempDir, env: { CLAWS_VAULT_PASSPHRASE: 'totally-wrong-passphrase!' } },
    );
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('wrong passphrase');
  });

  it('JSON output mode works for init and list', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-cli-secrets-json-'));
    const envWithPass = { CLAWS_VAULT_PASSPHRASE: PASSPHRASE };

    await writeFile(join(tempDir, 'claws.json'), JSON.stringify({ trustTier: 2 }), 'utf-8');

    // Init with --json
    const initResult = await claws(
      ['--json', 'protect', 'secrets', 'init'],
      { cwd: tempDir, env: envWithPass },
    );
    expect(initResult.exitCode).toBe(0);
    const initParsed = JSON.parse(initResult.stdout);
    expect(initParsed.status).toBe('initialized');
    expect(initParsed.kdf).toBe('scrypt');

    // Set a secret
    await claws(
      ['protect', 'secrets', 'set', 'key1', 'val1'],
      { cwd: tempDir, env: envWithPass },
    );

    // List with --json
    const listResult = await claws(
      ['--json', 'protect', 'secrets', 'list'],
      { cwd: tempDir },
    );
    expect(listResult.exitCode).toBe(0);
    const listParsed = JSON.parse(listResult.stdout);
    expect(listParsed.status).toBe('ok');
    expect(listParsed.keys).toEqual(['key1']);
  });
});
