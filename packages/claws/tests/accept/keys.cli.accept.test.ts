/**
 * L3: Keys command path — claws keys generate/list on real workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { claws, initTempWorkspace } from './helpers.js';

describe('claws keys', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => cleanup?.());

  it('keys list runs without import errors', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['keys', 'list'], { cwd: ws.dir });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(r.exitCode).toBe(0);
  });

  it('keys generate creates a signing key', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['keys', 'generate', '--algorithm', 'hmac'], { cwd: ws.dir });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(r.exitCode).toBe(0);
  });
});
