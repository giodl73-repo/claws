/**
 * Commander.js program for the claws CLI.
 *
 * Registers commands (compile, check, build, init) and global flags.
 * This is the command surface only — no business logic.
 *
 * @module claws-cli/cli
 */

import { Command } from 'commander';
import { preCommand } from './hooks/pre-command.js';
import { createTimer, postCommand } from './hooks/post-command.js';
import { runCompile } from './commands/compile.js';
import { runCheck } from './commands/check.js';
import { runBuild } from './commands/build.js';
import { runInit } from './commands/init.js';
import {
  formatError,
  formatErrorJson,
  noWorkspaceError,
} from './output/errors.js';

/** claws CLI version, kept in sync with package.json. */
const VERSION = '0.36.0';

/**
 * Global options parsed from Commander.
 */
export interface GlobalOpts {
  json: boolean;
  color: boolean;
  verbose: boolean;
  force: boolean;
}

/**
 * Create and configure the Commander.js program.
 */
export function createProgram(): Command {
  const program = new Command();

  program
    .name('claws')
    .version(VERSION, '-V, --version', 'Show claws version')
    .description('claws — enterprise governance compiler for agent workspaces')
    .option('--json', 'Output in JSON format', false)
    .option('--no-color', 'Disable colored output')
    .option('--verbose', 'Show detailed output', false)
    .option('--force', 'Force recompilation (ignore cache)', false);

  // ── compile ──────────────────────────────────────────────────────────
  program
    .command('compile')
    .description('Compile governance policies from workspace files')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const timer = createTimer();
      const ctx = await preCommand();
      const exitCode = await runCompile(ctx, {
        force: opts.force,
        json: opts.json,
        verbose: opts.verbose,
      });
      postCommand('compile', timer.elapsed(), exitCode === 0);
      process.exitCode = exitCode;
    });

  // ── check ────────────────────────────────────────────────────────────
  program
    .command('check')
    .description('Check governance compliance without writing output')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const timer = createTimer();
      const ctx = await preCommand();
      const exitCode = await runCheck(ctx, {
        json: opts.json,
        verbose: opts.verbose,
        color: opts.color,
      });
      postCommand('check', timer.elapsed(), exitCode === 0);
      process.exitCode = exitCode;
    });

  // ── build ────────────────────────────────────────────────────────────
  program
    .command('build [target]')
    .description('Compile + emit platform-specific governance artifacts')
    .action(async (target?: string) => {
      const opts = program.opts<GlobalOpts>();
      const timer = createTimer();
      const ctx = await preCommand();
      const exitCode = await runBuild(ctx, {
        force: opts.force,
        json: opts.json,
        verbose: opts.verbose,
      }, target);
      postCommand('build', timer.elapsed(), exitCode === 0);
      process.exitCode = exitCode;
    });

  // ── init ─────────────────────────────────────────────────────────────
  program
    .command('init')
    .description('Initialize governance configuration for this workspace')
    .option('--template <name>', 'Use a starter template (e.g. soc2)')
    .action(async (cmdOpts: { template?: string }) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runInit(workspaceRoot, {
        json: opts.json,
        template: cmdOpts.template,
      });
      process.exitCode = exitCode;
    });

  // ── bare invocation ──────────────────────────────────────────────────
  // When no command is given, show workspace-aware status
  program.action(async () => {
    const opts = program.opts<GlobalOpts>();
    const ctx = await preCommand();

    if (!ctx.hasConfig) {
      if (opts.json) {
        console.log(JSON.stringify({
          status: 'no-workspace',
          message: 'No claws.json found. Run `claws init` to get started.',
          commands: ['init'],
        }));
      } else {
        console.log('claws — enterprise governance compiler\n');
        console.log('No claws.json found in this directory.\n');
        console.log('Get started:');
        console.log('  claws init                 Create governance config');
        console.log('  claws init --template soc2 Start with SOC2 template\n');
        console.log('Run `claws --help` for all commands.');
      }
    } else {
      if (opts.json) {
        console.log(JSON.stringify({
          status: 'workspace-detected',
          workspaceRoot: ctx.workspaceRoot,
          commands: ['compile', 'check', 'build'],
        }));
      } else {
        console.log('claws — enterprise governance compiler\n');
        console.log(`Workspace: ${ctx.workspaceRoot}\n`);
        console.log('Next steps:');
        console.log('  claws compile   Compile governance policies');
        console.log('  claws check     Check compliance (read-only)');
        console.log('  claws build     Compile + emit artifacts\n');
        console.log('Run `claws --help` for all commands.');
      }
    }
  });

  return program;
}
