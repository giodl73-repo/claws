/**
 * Commander.js program for the claws CLI.
 *
 * Registers commands (compile, check, build, init) and global flags.
 * This is the command surface only — no business logic.
 *
 * @module claws-cli/cli
 */

import { join } from 'node:path';
import { Command } from 'commander';
import { preCommand } from './hooks/pre-command.js';
import { createTimer, postCommand } from './hooks/post-command.js';
import { runCompile } from './commands/compile.js';
import { runCheck } from './commands/check.js';
import { runBuild } from './commands/build.js';
import { runExtract } from './commands/extract.js';
import { runInit } from './commands/init.js';
import { runUninstall } from './commands/uninstall.js';
import { runWatch } from './commands/watch.js';
import { runDoctorCmd } from './commands/doctor.js';
import {
  runSnapSave,
  runSnapRestore,
  runSnapList,
  runSnapDelete,
} from './commands/snap.js';
import { runScan } from './commands/scan.js';
import { runKeysGenerate, runKeysList, runKeysRotate, runKeysRevoke, runKeysCeremonyInit, runKeysCeremonyReconstruct } from './commands/keys.js';
import { runInitSkill } from './commands/init.js';
import { runAnnotate } from './commands/annotate.js';
import { runPublish } from './commands/publish.js';
import {
  runCacheStatus,
  runCacheExport,
  runCacheImport,
  runCacheClear,
} from './commands/cache.js';
import type { SkillTemplateTier } from '@bic/claws-sdk/scaffold';
import {
  formatError,
  formatErrorJson,
  noWorkspaceError,
} from './output/errors.js';
import { CLI_VERSION } from './version.js';
import type { FormatName } from './format/index.js';
import { getFormatter, FORMAT_NAMES } from './format/index.js';
import { LLM_HELP_TEXT, createLLMProvider } from './core/llm.js';

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
    .version(CLI_VERSION, '-V, --version', 'Show claws version')
    .description('claws — enterprise governance compiler for agent workspaces')
    .option('--json', 'Output in JSON format', false)
    .option('--no-color', 'Disable colored output')
    .option('--verbose', 'Show detailed output', false)
    .option('--force', 'Force recompilation (ignore cache)', false);

  // ── compile ──────────────────────────────────────────────────────────
  program
    .command('compile')
    .description('Compile governance policies from workspace files')
    .option('--llm', LLM_HELP_TEXT, false)
    .option('--llm-model <model>', 'Override LLM model (default: claude-sonnet-4-20250514)')
    .action(async (cmdOpts: { llm: boolean; llmModel?: string }) => {
      const opts = program.opts<GlobalOpts>();
      const timer = createTimer();
      const ctx = await preCommand();
      const exitCode = await runCompile(ctx, {
        force: opts.force,
        json: opts.json,
        verbose: opts.verbose,
      }, { llm: cmdOpts.llm, ...(cmdOpts.llmModel !== undefined ? { llmModel: cmdOpts.llmModel } : {}) });
      postCommand('compile', timer.elapsed(), exitCode === 0);
      process.exitCode = exitCode;
    });

  // ── check ────────────────────────────────────────────────────────────
  program
    .command('check')
    .description('Check governance compliance without writing output')
    .option(`--format <name>`, `Output format (${FORMAT_NAMES.join(', ')})`)
    .option('--llm', LLM_HELP_TEXT, false)
    .option('--llm-model <model>', 'Override LLM model (default: claude-sonnet-4-20250514)')
    .action(async (cmdOpts: { format?: string; llm: boolean; llmModel?: string }) => {
      const opts = program.opts<GlobalOpts>();
      const timer = createTimer();
      const ctx = await preCommand();
      const checkOpts: { json: boolean; verbose: boolean; color: boolean; format?: FormatName } = {
        json: opts.json,
        verbose: opts.verbose,
        color: opts.color,
      };
      if (cmdOpts.format) checkOpts.format = cmdOpts.format as FormatName;
      const exitCode = await runCheck(ctx, checkOpts, { llm: cmdOpts.llm, ...(cmdOpts.llmModel !== undefined ? { llmModel: cmdOpts.llmModel } : {}) });
      postCommand('check', timer.elapsed(), exitCode === 0);
      process.exitCode = exitCode;
    });

  // ── build ────────────────────────────────────────────────────────────
  program
    .command('build [target]')
    .description('Compile + emit platform-specific governance artifacts')
    .option('--llm', LLM_HELP_TEXT, false)
    .option('--llm-model <model>', 'Override LLM model (default: claude-sonnet-4-20250514)')
    .action(async (target: string | undefined, cmdOpts: { llm: boolean; llmModel?: string }) => {
      const opts = program.opts<GlobalOpts>();
      const timer = createTimer();
      const ctx = await preCommand();
      const exitCode = await runBuild(ctx, {
        force: opts.force,
        json: opts.json,
        verbose: opts.verbose,
      }, target, { llm: cmdOpts.llm, ...(cmdOpts.llmModel !== undefined ? { llmModel: cmdOpts.llmModel } : {}) });
      postCommand('build', timer.elapsed(), exitCode === 0);
      process.exitCode = exitCode;
    });

  // ── extract ──────────────────────────────────────────────────────────
  program
    .command('extract')
    .description('Preview LLM extraction results without modifying GovernanceIR')
    .option('--preview', 'Show extraction results (default behavior)', true)
    .option('--llm-model <model>', 'Override LLM model (default: claude-sonnet-4-20250514)')
    .action(async (cmdOpts: { preview: boolean; llmModel?: string }) => {
      const opts = program.opts<GlobalOpts>();
      const timer = createTimer();
      const ctx = await preCommand();
      const exitCode = await runExtract(ctx, {
        json: opts.json,
        verbose: opts.verbose,
        preview: cmdOpts.preview,
      }, { llm: true, ...(cmdOpts.llmModel !== undefined ? { llmModel: cmdOpts.llmModel } : {}) });
      postCommand('extract', timer.elapsed(), exitCode === 0);
      process.exitCode = exitCode;
    });

  // ── init ─────────────────────────────────────────────────────────────
  const initCmd = program
    .command('init')
    .description('Initialize workspace, scaffold skills, and apply templates')
    .option('--template <name>', 'Use a starter template (e.g. soc2)')
    .option('--scaffold', 'Create starter workspace files (SOUL.md, TOOLS.md, etc.)')
    .action(async (cmdOpts: { template?: string; scaffold?: boolean }) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runInit(workspaceRoot, {
        json: opts.json,
        template: cmdOpts.template,
        scaffold: cmdOpts.scaffold === true,
      });
      process.exitCode = exitCode;
    });

  // ── init skill ──────────────────────────────────────────────────────
  initCmd
    .command('skill <name>')
    .description('Scaffold a new skill in skills/{name}/')
    .option('--tier <tier>', 'Skill template tier (declared, typed, verified)', 'declared')
    .action(async (name: string, cmdOpts: { tier: string }) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runInitSkill(workspaceRoot, name, {
        json: opts.json,
        tier: cmdOpts.tier as SkillTemplateTier,
      });
      process.exitCode = exitCode;
    });

  // ── uninstall ───────────────────────────────────────────────────────
  program
    .command('uninstall')
    .description('Remove .claws/ directory with backup and revert .gitignore changes')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runUninstall(workspaceRoot, {
        json: opts.json,
      });
      process.exitCode = exitCode;
    });

  // ── watch ───────────────────────────────────────────────────────────
  program
    .command('watch')
    .description('Watch workspace files and re-check on changes')
    .option('--llm', LLM_HELP_TEXT, false)
    .option('--llm-model <model>', 'Override LLM model (default: claude-sonnet-4-20250514)')
    .action(async (cmdOpts: { llm: boolean; llmModel?: string }) => {
      const opts = program.opts<GlobalOpts>();
      const ctx = await preCommand();

      const llmResult = await createLLMProvider(
        { llm: cmdOpts.llm, ...(cmdOpts.llmModel !== undefined ? { llmModel: cmdOpts.llmModel } : {}) },
        opts.json,
      );
      if (llmResult !== null && !llmResult.ok) {
        process.exitCode = llmResult.exitCode;
        return;
      }
      const llmProvider = llmResult?.provider;

      const exitCode = await runWatch(ctx, {
        json: opts.json,
        verbose: opts.verbose,
        color: opts.color,
        ...(cmdOpts.llm ? { llm: true } : {}),
        ...(llmProvider !== undefined ? { llmProvider } : {}),
      });
      process.exitCode = exitCode;
    });

  // ── doctor ──────────────────────────────────────────────────────────
  program
    .command('doctor')
    .description('Run workspace health diagnostics')
    .option('--post-upgrade', 'Run only post-upgrade checks', false)
    .option('--fix', 'Apply automatic fixes where possible', false)
    .action(async (cmdOpts: { postUpgrade: boolean; fix: boolean }) => {
      const opts = program.opts<GlobalOpts>();
      const ctx = await preCommand();
      const exitCode = await runDoctorCmd(ctx, {
        json: opts.json,
        color: opts.color,
        postUpgrade: cmdOpts.postUpgrade,
        fix: cmdOpts.fix,
      });
      process.exitCode = exitCode;
    });

  // ── snap ────────────────────────────────────────────────────────────
  const snap = program
    .command('snap')
    .description('Snapshot save, restore, list, delete');

  snap
    .command('save <name>')
    .description('Save a governance snapshot')
    .action(async (name: string) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runSnapSave(workspaceRoot, name, { json: opts.json });
      process.exitCode = exitCode;
    });

  snap
    .command('restore <name>')
    .description('Restore a governance snapshot')
    .action(async (name: string) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runSnapRestore(workspaceRoot, name, { json: opts.json });
      process.exitCode = exitCode;
    });

  snap
    .command('list')
    .description('List all snapshots')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runSnapList(workspaceRoot, { json: opts.json });
      process.exitCode = exitCode;
    });

  snap
    .command('delete <name>')
    .description('Delete a snapshot')
    .action(async (name: string) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runSnapDelete(workspaceRoot, name, { json: opts.json });
      process.exitCode = exitCode;
    });

  // ── scan ────────────────────────────────────────────────────────────
  program
    .command('scan [dir]')
    .description('Discover and classify OC workspaces in a directory tree')
    .option('--recursive', 'Scan subdirectories recursively', false)
    .action(async (dir: string | undefined, cmdOpts: { recursive: boolean }) => {
      const opts = program.opts<GlobalOpts>();
      const scanDir = dir ?? process.cwd();
      const exitCode = await runScan(scanDir, {
        json: opts.json,
        recursive: cmdOpts.recursive,
      });
      process.exitCode = exitCode;
    });

  // ── keys ────────────────────────────────────────────────────────────
  const keys = program
    .command('keys')
    .description('Key management: generate, list');

  keys
    .command('generate')
    .description('Generate a governance key')
    .option('--algorithm <alg>', 'Key algorithm (ed25519, hmac)', 'ed25519')
    .option('--storage <tier>', 'Storage tier (file, env)', 'file')
    .action(async (cmdOpts: { algorithm: string; storage: string }) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const algorithm = cmdOpts.algorithm === 'hmac' ? 'hmac-sha256' : cmdOpts.algorithm;
      const exitCode = await runKeysGenerate(workspaceRoot, {
        json: opts.json,
        algorithm: algorithm as 'ed25519' | 'hmac-sha256',
        storage: cmdOpts.storage as 'file' | 'env' | 'kms',
      });
      process.exitCode = exitCode;
    });

  keys
    .command('list')
    .description('List all governance keys')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runKeysList(workspaceRoot, {
        json: opts.json,
      });
      process.exitCode = exitCode;
    });

  keys
    .command('rotate <keyId>')
    .description('Rotate a key: generate new version, re-sign artifacts, archive old')
    .action(async (keyId: string) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runKeysRotate(workspaceRoot, keyId, {
        json: opts.json,
      });
      process.exitCode = exitCode;
    });

  keys
    .command('revoke <keyId>')
    .description('Revoke a key and block further signing')
    .option('--reason <reason>', 'Revocation reason', 'manual revocation')
    .action(async (keyId: string, cmdOpts: { reason: string }) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runKeysRevoke(workspaceRoot, keyId, {
        json: opts.json,
        reason: cmdOpts.reason,
      });
      process.exitCode = exitCode;
    });

  const ceremony = keys
    .command('ceremony')
    .description('M-of-N key ceremony operations');

  ceremony
    .command('init')
    .description('Split a root key into N shares with threshold M')
    .option('--shares <n>', 'Number of shares', parseInt)
    .option('--threshold <m>', 'Reconstruction threshold', parseInt)
    .option('--output-dir <dir>', 'Directory for share files (default: .claws/ceremony/)')
    .option('--single-dev', 'Derive key from passphrase instead of ceremony', false)
    .option('--passphrase <pass>', 'Passphrase for single-dev mode')
    .option('--salt <salt>', 'Salt for single-dev key derivation')
    .option('--participants <names>', 'Comma-separated participant names')
    .action(async (cmdOpts: { shares?: number; threshold?: number; outputDir?: string; singleDev: boolean; passphrase?: string; salt?: string; participants?: string }) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runKeysCeremonyInit(workspaceRoot, {
        json: opts.json,
        shares: cmdOpts.shares,
        threshold: cmdOpts.threshold,
        outputDir: cmdOpts.outputDir,
        singleDev: cmdOpts.singleDev,
        passphrase: cmdOpts.passphrase,
        salt: cmdOpts.salt,
        participants: cmdOpts.participants?.split(',').map(s => s.trim()),
      });
      process.exitCode = exitCode;
    });

  ceremony
    .command('reconstruct')
    .description('Reconstruct a root key from M shares')
    .requiredOption('--shares <shares>', 'Comma-separated index:hex pairs (e.g. 1:ab12,3:cd34,5:ef56)')
    .requiredOption('--ceremony-id <id>', 'Ceremony ID from init output')
    .requiredOption('--expected-hash <hash>', 'Expected hash from init output')
    .action(async (cmdOpts: { shares: string; ceremonyId: string; expectedHash: string }) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const parsedShares = cmdOpts.shares.split(',').map(s => {
        const colonIdx = s.trim().indexOf(':');
        if (colonIdx === -1) throw new Error(`Invalid share format: ${s}. Expected index:hex`);
        const idx = s.trim().slice(0, colonIdx);
        const data = s.trim().slice(colonIdx + 1);
        return { index: parseInt(idx, 10), data };
      });
      const exitCode = await runKeysCeremonyReconstruct(workspaceRoot, {
        json: opts.json,
        shares: parsedShares,
        ceremonyId: cmdOpts.ceremonyId,
        expectedHash: cmdOpts.expectedHash,
      });
      process.exitCode = exitCode;
    });

  // ── annotate ────────────────────────────────────────────────────────
  program
    .command('annotate [skill-dir]')
    .description('Infer governance annotations from skill source code')
    .option('--dry-run', 'Show proposed annotations without modifying files', false)
    .action(async (dir: string | undefined, cmdOpts: { dryRun: boolean }) => {
      const opts = program.opts<GlobalOpts>();
      const skillDir = dir ?? join(process.cwd(), 'skills');
      const exitCode = await runAnnotate(skillDir, {
        json: opts.json,
        dryRun: cmdOpts.dryRun,
      });
      process.exitCode = exitCode;
    });

  // ── publish ─────────────────────────────────────────────────────────
  program
    .command('publish [skill-dir]')
    .description('Publish a skill to the registry')
    .option('--registry <url>', 'Override registry endpoint')
    .option('--dry-run', 'Report what would be published without side effects', false)
    .action(async (dir: string | undefined, cmdOpts: { registry?: string; dryRun: boolean }) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const skillDir = dir ?? join(workspaceRoot, 'skills');
      const exitCode = await runPublish(workspaceRoot, skillDir, {
        json: opts.json,
        dryRun: cmdOpts.dryRun,
        registry: cmdOpts.registry,
      });
      process.exitCode = exitCode;
    });

  // ── cache ────────────────────────────────────────────────────────────
  const cache = program
    .command('cache')
    .description('LLM extraction cache management');

  cache
    .command('status')
    .description('Show cache statistics')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runCacheStatus(workspaceRoot, { json: opts.json });
      process.exitCode = exitCode;
    });

  cache
    .command('export')
    .description('Export cache as JSON to stdout')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runCacheExport(workspaceRoot, { json: opts.json });
      process.exitCode = exitCode;
    });

  cache
    .command('import <file>')
    .description('Import cache from a JSON file')
    .action(async (file: string) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runCacheImport(workspaceRoot, file, { json: opts.json });
      process.exitCode = exitCode;
    });

  cache
    .command('clear')
    .description('Clear all LLM cache entries')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runCacheClear(workspaceRoot, { json: opts.json });
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
        console.log('  claws init                     Create workspace + config');
        console.log('  claws init --template soc2     Start with SOC2 template');
        console.log('  claws init skill my-skill      Scaffold a new skill\n');
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
