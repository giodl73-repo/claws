/**
 * L3: Doctor command path — claws doctor health checks on real workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { claws, initTempWorkspace } from './helpers.js';

describe('claws doctor', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('runs health checks without import errors', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['doctor'], { cwd: ws.dir });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  });

  it('doctor --format json produces JSON output', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['doctor', '--format', 'json'], { cwd: ws.dir });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  });
});
