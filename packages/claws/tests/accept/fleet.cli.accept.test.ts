/**
 * L3: Fleet command path — claws fleet scan/drift on real workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { claws, initTempWorkspace } from './helpers.js';

describe('claws fleet', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('fleet scan runs without import errors', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['fleet', 'scan', '--dir', ws.dir], { cwd: ws.dir });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  });

  it('fleet drift runs without import errors', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['fleet', 'drift', '--dir', ws.dir], { cwd: ws.dir });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  });
});
