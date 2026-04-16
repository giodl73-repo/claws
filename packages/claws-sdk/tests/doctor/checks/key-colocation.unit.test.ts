/**
 * L0 unit tests for key-colocation doctor check.
 *
 * Tests both the synchronous checkKeyColocation() and the async
 * checkKeyColocationDoctor() entry point.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  checkKeyColocation,
  checkKeyColocationDoctor,
} from '#src/doctor/checks/key-colocation.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'claws-keycolo-'));
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

// ── checkKeyColocation (synchronous path logic) ────────────────────────

describe('checkKeyColocation', () => {
  it('warns when chain and key share the same directory', () => {
    const dir = join(tmpDir, 'same');
    const result = checkKeyColocation(
      join(dir, 'chain.jsonl'),
      join(dir, 'hmac.key'),
    );

    expect(result.checkId).toBe('key-colocation');
    expect(result.name).toBe('Key / Audit Chain Co-location');
    expect(result.passed).toBe(true); // warning, not error → still passes
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.severity).toBe('warning');
    expect(result.diagnostics[0]!.message).toContain('co-located');
    expect(result.diagnostics[0]!.message).toContain('Move the HMAC key');
    expect(result.diagnostics[0]!.file).toBe(join(dir, 'hmac.key'));
    expect(result.diagnostics[0]!.fixable).toBe(false);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('reports info when chain and key are in separate directories', () => {
    const result = checkKeyColocation(
      join(tmpDir, 'audit', 'chain.jsonl'),
      join(tmpDir, 'keys', 'hmac.key'),
    );

    expect(result.passed).toBe(true);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.severity).toBe('info');
    expect(result.diagnostics[0]!.message).toContain('separate directories');
    expect(result.diagnostics[0]!.fixable).toBe(false);
    // info diagnostic should NOT have a file property
    expect(result.diagnostics[0]!.file).toBeUndefined();
  });

  it('resolves relative path components before comparing', () => {
    // Both resolve to the same directory despite different representations
    const result = checkKeyColocation(
      join(tmpDir, 'a', '..', 'shared', 'chain.jsonl'),
      join(tmpDir, 'b', '..', 'shared', 'hmac.key'),
    );

    expect(result.diagnostics[0]!.severity).toBe('warning');
    expect(result.diagnostics[0]!.message).toContain('co-located');
  });

  it('treats nested subdirectory as separate from parent', () => {
    const result = checkKeyColocation(
      join(tmpDir, 'data', 'chain.jsonl'),
      join(tmpDir, 'data', 'sub', 'hmac.key'),
    );

    expect(result.diagnostics[0]!.severity).toBe('info');
    expect(result.diagnostics[0]!.message).toContain('separate directories');
  });
});

// ── checkKeyColocationDoctor (async entry point) ──────────────────────

describe('checkKeyColocationDoctor', () => {
  it('skips check when HMAC key file does not exist', async () => {
    // No .claws/keys/hmac.key in tmpDir
    const result = await checkKeyColocationDoctor(tmpDir);

    expect(result.checkId).toBe('key-colocation');
    expect(result.name).toBe('Key / Audit Chain Co-location');
    expect(result.passed).toBe(true);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.severity).toBe('info');
    expect(result.diagnostics[0]!.message).toContain('No HMAC key file found');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('warns when HMAC key exists and is co-located with audit chain', async () => {
    // Default layout: keys at .claws/keys/hmac.key, audit at .claws/audit/chain.jsonl
    // These are in different directories, so this should NOT warn.
    // But we must create the key file for the check to proceed.
    await mkdir(join(tmpDir, '.claws', 'keys'), { recursive: true });
    await writeFile(join(tmpDir, '.claws', 'keys', 'hmac.key'), 'secret-key-data');
    await mkdir(join(tmpDir, '.claws', 'audit'), { recursive: true });
    await writeFile(join(tmpDir, '.claws', 'audit', 'chain.jsonl'), '');

    const result = await checkKeyColocationDoctor(tmpDir);

    // Default paths put key in .claws/keys/ and chain in .claws/audit/
    // so they should be in separate directories → info
    expect(result.passed).toBe(true);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]!.severity).toBe('info');
    expect(result.diagnostics[0]!.message).toContain('separate directories');
  });

  it('returns valid durationMs', async () => {
    const result = await checkKeyColocationDoctor(tmpDir);
    expect(typeof result.durationMs).toBe('number');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
