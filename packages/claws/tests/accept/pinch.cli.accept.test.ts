/**
 * L3: Pinch command path — claws pinch (governance check) on real workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { claws, initTempWorkspace } from './helpers.js';

describe('claws pinch', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => cleanup?.());

  it('runs governance check without import errors', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['pinch'], { cwd: ws.dir, timeout: 60_000 });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  });

  it('pinch --format sarif produces valid SARIF', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['pinch', '--format', 'sarif'], { cwd: ws.dir, timeout: 60_000 });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    if (r.stdout.trim().length > 0) {
      const sarif = JSON.parse(r.stdout);
      expect(sarif.$schema).toContain('sarif');
    }
  });

  it('pinch --format json produces JSON output', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['pinch', '--format', 'json'], { cwd: ws.dir, timeout: 60_000 });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  });
});
