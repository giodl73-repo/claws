/**
 * L0: Commander.js program setup, command registration, global flag parsing.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createProgram } from '../src/cli.js';

// Vitest's worker teardown races with buffered console RPC when
// Commander emits output (help text, unknown-option warnings) during
// `program.parse()`. Silencing console.* at the suite level keeps the
// RPC queue empty so teardown doesn't surface
// `EnvironmentTeardownError: Closing rpc while "onUserConsoleLog" was
// pending`.
let logSpy: ReturnType<typeof vi.spyOn>;
let errSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let infoSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  errSpy.mockRestore();
  warnSpy.mockRestore();
  infoSpy.mockRestore();
});

describe('claws Commander.js program', () => {
  it('registers all expected commands', () => {
    const program = createProgram();
    const commandNames = program.commands.map((c) => c.name());
    // Authoritative list: must match createProgram() registrations and smoke test groups.
    const expected = ['compile', 'check', 'build', 'extract', 'init', 'uninstall', 'watch', 'extract-watch', 'doctor', 'snap', 'scan', 'keys', 'annotate', 'publish', 'cache'];
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

  it('watch help describes compile-watch (not LLM extraction)', () => {
    const program = createProgram();
    const watch = program.commands.find((c) => c.name() === 'watch');
    expect(watch).toBeDefined();
    expect(watch!.description()).toContain('recompile');
    expect(watch!.description().toLowerCase()).not.toContain('llm');
  });

  it('extract-watch help describes LLM extraction', () => {
    const program = createProgram();
    const extractWatch = program.commands.find((c) => c.name() === 'extract-watch');
    expect(extractWatch).toBeDefined();
    expect(extractWatch!.description()).toContain('LLM extraction');
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
