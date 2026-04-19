/**
 * L0 unit tests for `claws cache list`.
 *
 * Asserts:
 *   1. empty cache → 0 bytes stdout, exit 0; dir not created (S02-F04, S02-F06)
 *   2. `--json` emits ndjson — each line JSON-parseable; whole stream NOT a
 *      JSON array (S01-F03)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CompilationCache, resolveCacheDir } from '@bic/claws-sdk/compiler/cache';
import { runCacheList } from '#src/commands/cache/list.js';

describe('claws cache list (unit)', () => {
  let workspaceRoot: string;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'claws-cli-list-'));
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('default stdout writer delegates to process.stdout.write', async () => {
    // Seed a minimal cache so list has output to emit, then invoke without
    // passing the writeStdout injector to exercise the default path.
    const cacheDir = resolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 1024 });
    await seed.set('x', 'x');
    await seed.flush();

    const original = process.stdout.write.bind(process.stdout);
    const captured: string[] = [];
    (process.stdout as unknown as { write: (c: string | Uint8Array) => boolean }).write = (chunk) => {
      captured.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf-8'));
      return true;
    };
    try {
      const code = await runCacheList(workspaceRoot, { json: true });
      expect(code).toBe(0);
      expect(captured.join('')).toContain('"x"');
    } finally {
      (process.stdout as unknown as { write: typeof original }).write = original;
    }
  });

  it('empty cache → 0 bytes on stdout, exit 0, dir not created', async () => {
    const cacheDir = resolveCacheDir(workspaceRoot);
    expect(existsSync(cacheDir)).toBe(false);

    let captured = '';
    const code = await runCacheList(workspaceRoot, { json: false }, (s) => {
      captured += s;
    });
    expect(code).toBe(0);
    expect(captured).toBe('');
    expect(existsSync(cacheDir)).toBe(false);

    // Same guarantee for --json on an empty cache.
    captured = '';
    const codeJson = await runCacheList(workspaceRoot, { json: true }, (s) => {
      captured += s;
    });
    expect(codeJson).toBe(0);
    expect(captured).toBe('');
    expect(existsSync(cacheDir)).toBe(false);
  });

  it('default (non-JSON) emits a human-readable table with header row', async () => {
    const cacheDir = resolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 4096 });
    await seed.set('alpha', 'aaaa');
    await seed.set('beta', 'bbbb');
    await seed.flush();

    let captured = '';
    const code = await runCacheList(workspaceRoot, { json: false }, (s) => {
      captured += s;
    });
    expect(code).toBe(0);
    // Table must lead with the header row and list both keys.
    const lines = captured.split('\n').filter((l) => l.length > 0);
    expect(lines[0]).toMatch(/^key\s+stage\s+sizeBytes\s+created\s+lastAccess\s*$/);
    expect(captured).toContain('alpha');
    expect(captured).toContain('beta');
  });

  it('--json emits ndjson: each line parses alone, concat is NOT a JSON array', async () => {
    const cacheDir = resolveCacheDir(workspaceRoot);
    const seed = new CompilationCache({ cacheDir, maxSize: 4096 });
    await seed.set('alpha', 'a'.repeat(8));
    await new Promise((r) => setTimeout(r, 5));
    await seed.set('beta', 'b'.repeat(16));
    await seed.flush();

    let captured = '';
    const code = await runCacheList(workspaceRoot, { json: true }, (s) => {
      captured += s;
    });
    expect(code).toBe(0);
    expect(captured.endsWith('\n')).toBe(true);

    const lines = captured.split('\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(2);
    // Each line parses independently.
    for (const line of lines) {
      const obj = JSON.parse(line) as Record<string, unknown>;
      expect(typeof obj.key).toBe('string');
      expect(typeof obj.sizeBytes).toBe('number');
    }
    // Concatenated payload is NOT a JSON array.
    expect(() => JSON.parse(captured)).toThrow();
  });
});
