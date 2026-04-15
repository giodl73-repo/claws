/**
 * L3: Scaffold + Annotate command path — claws scaffold, claws annotate.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { claws, initTempWorkspace } from './helpers.js';

describe('claws init skill', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => cleanup?.());

  it('claws init skill runs without import errors', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['init', 'skill', 'test-skill'], { cwd: ws.dir });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  });
});

describe('claws annotate', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => cleanup?.());

  it('runs annotation without import errors', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['annotate'], { cwd: ws.dir });
    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
  });
});
