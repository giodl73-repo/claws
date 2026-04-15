/**
 * L0: claws-cli package scaffold verification.
 *
 * Verifies the CLI entry point module exists and exports cleanly.
 */

import { describe, it, expect } from 'vitest';

describe('claws-cli scaffold', () => {
  it('entry point module resolves', async () => {
    const mod = await import('../src/index.js');
    expect(mod).toBeDefined();
  }, 30_000);
});
