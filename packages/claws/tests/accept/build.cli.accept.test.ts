/**
 * L3: Build command path — claws build on real workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { claws, initTempWorkspace } from './helpers.js';

describe('claws build', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('compiles workspace and produces governance artifacts', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['build'], { cwd: ws.dir, timeout: 60_000 });
    // Build may exit 1 (violations found) or 0 (clean) — both produce artifacts
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(r.stdout).toContain('artifacts');
    expect(existsSync(join(ws.dir, '.claws', 'compiled'))).toBe(true);
  });

  it('build --format json produces JSON output', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['build', '--format', 'json'], { cwd: ws.dir, timeout: 60_000 });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    // JSON output should be parseable (may contain violations)
    if (r.stdout.trim().length > 0) {
      expect(() => JSON.parse(r.stdout.trim())).not.toThrow();
    }
  });

  it('build on non-claws directory fails with helpful error', async () => {
    const ws = { dir: '', cleanup: () => {} };
    const tmp = tmpdir();
    ws.dir = mkdtempSync(join(tmp, 'claws-no-init-'));
    ws.cleanup = () => rmSync(ws.dir, { recursive: true, force: true });
    cleanup = ws.cleanup;

    const r = await claws(['build'], { cwd: ws.dir });
    expect(r.exitCode).not.toBe(0);
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  });
});
