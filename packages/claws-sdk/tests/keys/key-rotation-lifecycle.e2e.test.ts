/**
 * L2: Full rotation lifecycle — generate key → sign artifact → rotate →
 * verify new signatures on .claws/compiled/ artifacts → claws keys list →
 * verify rotation version incremented and old key archived.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { sign as cryptoSign, verify as cryptoVerify } from 'node:crypto';
import {
  generateKey,
  createStorage,
  registerKey,
  listKeys,
  rotateKey,
} from '../../src/keys/index.js';

describe('Full rotation lifecycle', () => {
  let tempDir: string;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('generate → sign → rotate → verify → list → verify version + archive', async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'claws-e2e-rot-'));

    // ── 1. Generate key ──────────────────────────────────────────────
    const generated = generateKey('ed25519');
    const storage = createStorage('file', tempDir);
    const entry = await registerKey(tempDir, {
      id: 'e2e-lifecycle-1',
      algorithm: 'ed25519',
      storageTier: 'file',
      rotationSchedule: { enabled: true, intervalDays: 90 },
    });
    await storage.write(entry.id, generated.privateKey);
    if (generated.publicKey) {
      await storage.write(`${entry.id}.pub`, generated.publicKey);
    }

    // ── 2. Sign a compiled artifact ──────────────────────────────────
    const compiledDir = join(tempDir, '.claws', 'compiled');
    await mkdir(compiledDir, { recursive: true });
    const content = 'governance-policy-v1-data';
    await writeFile(join(compiledDir, 'policy.json'), content, 'utf-8');

    const originalSig = cryptoSign(null, Buffer.from(content), generated.privateKey).toString('hex');
    await writeFile(join(compiledDir, 'policy.json.sig'), originalSig, 'utf-8');

    // ── 3. Rotate ────────────────────────────────────────────────────
    const rotResult = await rotateKey(tempDir, 'e2e-lifecycle-1');
    expect(rotResult.entry.version).toBe(2);
    expect(rotResult.previousVersion).toBe(1);
    expect(rotResult.artifactsReSigned).toBe(1);

    // ── 4. Verify new signatures on compiled artifacts ───────────────
    const newPubKey = await storage.read(`${entry.id}.pub`);
    expect(newPubKey).toBeTruthy();

    const newSig = await readFile(join(compiledDir, 'policy.json.sig'), 'utf-8');
    expect(cryptoVerify(null, Buffer.from(content), newPubKey!, Buffer.from(newSig, 'hex'))).toBe(true);

    // ── 5. claws keys list ───────────────────────────────────────────
    const listResult = await listKeys(tempDir);
    expect(listResult.keys).toHaveLength(1);
    expect(listResult.keys[0]!.id).toBe('e2e-lifecycle-1');
    expect(listResult.keys[0]!.version).toBe(2);
    expect(listResult.keys[0]!.rotatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(listResult.table).toContain('e2e-lifecycle-1');

    // ── 6. Verify old key is archived ────────────────────────────────
    const keysDir = join(tempDir, '.claws', 'keys');
    const archivedKey = await readFile(join(keysDir, 'e2e-lifecycle-1.v1.key'), 'utf-8');
    expect(archivedKey).toBe(generated.privateKey);

    // ── 7. Verify new key is different from archived ─────────────────
    const currentKey = await storage.read('e2e-lifecycle-1');
    expect(currentKey).toBeTruthy();
    expect(currentKey).not.toBe(archivedKey);
  });
});
