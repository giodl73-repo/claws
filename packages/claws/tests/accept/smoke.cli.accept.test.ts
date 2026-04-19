/**
 * L3: CLI binary smoke tests — every command group loads without import errors.
 *
 * If any tsup entry point is missing, `--help` crashes with ERR_MODULE_NOT_FOUND.
 * This is the packaging validation layer that unit/integration tests cannot provide.
 *
 * @module claws-cli/tests/accept/smoke
 */

import { describe, it, expect } from 'vitest';
import { claws } from './helpers.js';

describe('CLI binary loads without import errors', () => {
  it('claws --help exits 0', async () => {
    const r = await claws(['--help']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain('claws');
  });

  it('claws --version exits 0', async () => {
    const r = await claws(['--version']);
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/\d+\.\d+\.\d+/);
  });

  const commandGroups = [
    'compile', 'check', 'build', 'extract', 'init',
    'uninstall', 'watch', 'extract-watch', 'doctor', 'snap', 'scan',
    'keys', 'annotate', 'publish', 'cache',
  ];

  for (const cmd of commandGroups) {
    it(`claws ${cmd} --help exits 0`, async () => {
      const r = await claws([cmd, '--help']);
      expect(r.exitCode).toBe(0);
      expect(r.stdout.length).toBeGreaterThan(0);
    });
  }
});
