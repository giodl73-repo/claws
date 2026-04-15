/**
 * L3: Amend command path — claws amend on real workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { claws, initTempWorkspace } from './helpers.js';

describe('claws amend', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('amend runs without import errors on initialized workspace', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    // Build first so amend has something to re-evaluate
    await claws(['build'], { cwd: ws.dir, timeout: 60_000 });
    const r = await claws(['amend'], { cwd: ws.dir, timeout: 60_000 });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  });
});
