/**
 * L3: Snapshot command path — claws snap save/list/restore on real workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { claws, initTempWorkspace } from './helpers.js';

describe('claws snap', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => cleanup?.());

  it('snap save creates a named snapshot', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    // Build first so there's something to snapshot
    await claws(['build'], { cwd: ws.dir, timeout: 60_000 });
    const r = await claws(['snap', 'save', 'test-snap'], { cwd: ws.dir });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(r.exitCode).toBe(0);
    expect(existsSync(join(ws.dir, '.claws', 'snapshots', 'test-snap'))).toBe(true);
  });

  it('snap list runs without import errors', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['snap', 'list'], { cwd: ws.dir });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  });
});
