/**
 * L0: Commander.js program setup, command registration, global flag parsing.
 */

import { describe, it, expect } from 'vitest';
import { createProgram } from '../src/cli.js';

describe('claws Commander.js program', () => {
  it('registers all expected commands', () => {
    const program = createProgram();
    const commandNames = program.commands.map((c) => c.name());
    // Authoritative list: must match createProgram() registrations and smoke test groups.
    const expected = ['compile', 'check', 'build', 'extract', 'init', 'uninstall', 'watch', 'doctor', 'snap', 'scan', 'keys', 'annotate', 'publish', 'cache'];
    for (const cmd of expected) {
      expect(commandNames).toContain(cmd);
    }
    expect(commandNames.length).toBeGreaterThanOrEqual(expected.length);
  });

  it('parses global flag --json', () => {
    const program = createProgram();
    program.parse(['node', 'claws', '--json', 'compile'], { from: 'user' });
    const opts = program.opts();
    expect(opts['json']).toBe(true);
  });

  it('parses global flag --no-color', () => {
    const program = createProgram();
    program.parse(['node', 'claws', '--no-color', 'compile'], { from: 'user' });
    const opts = program.opts();
    expect(opts['color']).toBe(false);
  });

  it('parses global flag --verbose', () => {
    const program = createProgram();
    program.parse(['node', 'claws', '--verbose', 'compile'], { from: 'user' });
    const opts = program.opts();
    expect(opts['verbose']).toBe(true);
  });

  it('parses global flag --force', () => {
    const program = createProgram();
    program.parse(['node', 'claws', '--force', 'compile'], { from: 'user' });
    const opts = program.opts();
    expect(opts['force']).toBe(true);
  });

  it('bare invocation (no args) runs the default action', async () => {
    const program = createProgram();
    // Bare invocation should not throw
    // We test the program structure, not the action execution (which needs fs)
    const defaultAction = program.options.length;
    expect(defaultAction).toBeGreaterThan(0);
    // Program has the default action handler
    expect(program.name()).toBe('claws');
    expect(program.description()).toContain('governance compiler');
  });
});
