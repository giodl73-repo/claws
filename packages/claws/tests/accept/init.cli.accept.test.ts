/**
 * L3: Init command path — claws init on real filesystem.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { claws, makeTempWorkspace } from './helpers.js';

describe('claws init', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('creates claws.json with valid agent platform', async () => {
    const ws = makeTempWorkspace();
    cleanup = ws.cleanup;
    const r = await claws(['init'], { cwd: ws.dir });
    expect(r.exitCode).toBe(0);
    expect(existsSync(join(ws.dir, 'claws.json'))).toBe(true);

    const config = JSON.parse(readFileSync(join(ws.dir, 'claws.json'), 'utf-8'));
    const validPlatforms = ['openclaw', 'cursor', 'claude-code', 'github-copilot', 'bedrock', 'langgraph', 'crewai'];
    expect(validPlatforms).toContain(config.platform);
    expect(config.trustTier).toBe(2);
  });

  it('scaffolds .claws/ sidecar with expected subdirectories', async () => {
    const ws = makeTempWorkspace();
    cleanup = ws.cleanup;
    await claws(['init'], { cwd: ws.dir });

    expect(existsSync(join(ws.dir, '.claws'))).toBe(true);
    expect(existsSync(join(ws.dir, '.claws', 'compiled'))).toBe(true);
    expect(existsSync(join(ws.dir, '.claws', 'cache'))).toBe(true);
  });

  it('scaffolds starter workspace files with --scaffold flag', async () => {
    const ws = makeTempWorkspace();
    cleanup = ws.cleanup;
    await claws(['init', '--scaffold'], { cwd: ws.dir });

    expect(existsSync(join(ws.dir, 'SOUL.md'))).toBe(true);
    expect(existsSync(join(ws.dir, 'TOOLS.md'))).toBe(true);
  });

  it('does not scaffold workspace files without --scaffold flag', async () => {
    const ws = makeTempWorkspace();
    cleanup = ws.cleanup;
    await claws(['init'], { cwd: ws.dir });

    expect(existsSync(join(ws.dir, 'SOUL.md'))).toBe(false);
    expect(existsSync(join(ws.dir, 'TOOLS.md'))).toBe(false);
    expect(existsSync(join(ws.dir, '.claws'))).toBe(true);
  });

  it('exits 2 on already-initialized workspace', async () => {
    const ws = makeTempWorkspace();
    cleanup = ws.cleanup;
    await claws(['init'], { cwd: ws.dir });
    const r = await claws(['init'], { cwd: ws.dir });
    expect(r.exitCode).toBe(2);
  });
});
