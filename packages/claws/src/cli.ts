/**
 * Commander.js program for the claws CLI.
 *
 * Registers commands (compile, check, build, init) and global flags.
 * This is the command surface only — no business logic.
 *
 * @module claws-cli/cli
 */

import { join } from 'node:path';
import { statSync } from 'node:fs';
import { Command } from 'commander';

function isPolicyWorkspace(cwd: string): boolean {
  try {
    return statSync(join(cwd, '.openclaw', 'policy', 'policy-ir.json')).isFile();
  } catch {
    return false;
  }
}
import { preCommand } from './hooks/pre-command.js';
import { createTimer, postCommand } from './hooks/post-command.js';
import { runCompile } from './commands/compile.js';
import { runCheck } from './commands/check.js';
import { runBuild } from './commands/build.js';
import { runExtract } from './commands/extract.js';
import { runInit } from './commands/init.js';
import { runUninstall } from './commands/uninstall.js';
import { runWatch, parseDebounceFlag } from './commands/watch.js';
import { runExtractWatch } from './commands/extract-watch.js';
import { runDoctorCmd } from './commands/doctor.js';
import {
  runSnapSave,
  runSnapRestore,
  runSnapList,
  runSnapDelete,
} from './commands/snap.js';
import { runRouter as runPolicyRouter } from '@bic/openclaw-policy/cli-handlers';
import {
  runSnapCapture,
  runSnapPromote as runSnapStorePromote,
  runSnapRollback as runSnapStoreRollback,
  runSnapDiscard,
  runSnapStatus,
  runSnapRegistry,
  runSnapCheckout,
  runSnapRead,
  runSnapDiff as runSnapStoreDiff,
} from './commands/snap-store.js';
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
import {
  runCacheStats as runCompileCacheStats,
  runCacheList as runCompileCacheList,
  runCachePrune as runCompileCachePrune,
  runCacheClear as runCompileCacheClear,
} from './commands/cache/index.js';
import {
  runProtectBudget,
  runProtectBudgetFleet,
  runSecretsInit,
  runSecretsSet,
  runSecretsGet,
  runSecretsList,
  runSecretsDelete,
  runIdentityConfigure,
  runIdentityShow,
} from './commands/protect.js';
import { runComplySOC2, runComplyHIPAA } from './commands/comply.js';
import { runComplyEUAIAct } from './commands/comply-eu-ai-act.js';
import { runServe } from './commands/serve.js';
import { runFleetCompile, parseMaxConcurrency } from './commands/fleet-compile.js';
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

  // ── watch (pulse-81 compile-watch) ──────────────────────────────────
  program
    .command('watch')
    .description('Watch workspace files and recompile on changes (debounced)')
    .option('--debounce <ms>', 'Debounce window in milliseconds (default: 300, minimum 50)')
    .action(async (cmdOpts: { debounce?: string }) => {
      const opts = program.opts<GlobalOpts>();
      const ctx = await preCommand();
      const debounceMs = parseDebounceFlag(cmdOpts.debounce);
      const exitCode = await runWatch(ctx, {
        json: opts.json,
        verbose: opts.verbose,
        color: opts.color,
        ...(debounceMs !== undefined ? { debounceMs } : {}),
      });
      process.exitCode = exitCode;
    });

  // ── extract-watch (legacy LLM-integrated extraction watcher) ────────
  program
    .command('extract-watch')
    .description('Watch workspace files and re-run LLM extraction on changes (legacy)')
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

      const exitCode = await runExtractWatch(ctx, {
        json: opts.json,
        verbose: opts.verbose,
        color: opts.color,
        ...(cmdOpts.llm ? { llm: true } : {}),
        ...(llmProvider !== undefined ? { llmProvider } : {}),
      });
      process.exitCode = exitCode;
    });

  // ── serve ───────────────────────────────────────────────────────────
  program
    .command('serve')
    .description('Start the governance HTTP/WebSocket server')
    .option('--port <port>', 'Server port (default: 3939, or CLAWS_PORT env)', parseInt)
    .option('--host <host>', 'Bind address (default: 127.0.0.1)')
    .option('--no-ws', 'Disable WebSocket endpoint')
    .action(async (cmdOpts: { port?: number; host?: string; ws: boolean }) => {
      const opts = program.opts<GlobalOpts>();
      const exitCode = await runServe({
        port: cmdOpts.port,
        host: cmdOpts.host,
        noWs: !cmdOpts.ws,
        json: opts.json,
      });
      process.exitCode = exitCode;
    });

  // ── doctor ──────────────────────────────────────────────────────────
  // Two-mode dispatch:
  //   - workspaces with `.openclaw/policy/policy-ir.json` → policy router
  //     doctor (realPolicyProbe: stat policy-ir + verify audit chain).
  //   - everything else → legacy claws-sdk doctor (needs claws.json).
  // The policy-workspace check is a cheap statSync; it lets the governed-
  // agent surface use `claws doctor` as documented in openclaw-upstream
  // without colliding with the legacy check-suite path.
  program
    .command('doctor')
    .description('Run workspace health diagnostics')
    .option('--post-upgrade', 'Run only post-upgrade checks', false)
    .option('--fix', 'Apply automatic fixes where possible', false)
    .action(async (cmdOpts: { postUpgrade: boolean; fix: boolean }) => {
      const opts = program.opts<GlobalOpts>();
      const cwd = process.cwd();
      if (isPolicyWorkspace(cwd)) {
        const result = await runPolicyRouter({
          binaryName: 'claws',
          argv: ['doctor'],
          cwd,
          env: process.env,
        });
        if (result.stdout !== '') process.stdout.write(result.stdout);
        if (result.stderr !== '') process.stderr.write(result.stderr);
        process.exitCode = result.exitCode;
        return;
      }
      const ctx = await preCommand();
      const exitCode = await runDoctorCmd(ctx, {
        json: opts.json,
        color: opts.color,
        postUpgrade: cmdOpts.postUpgrade,
        fix: cmdOpts.fix,
      });
      process.exitCode = exitCode;
    });

  // ── upgrade ─────────────────────────────────────────────────────────
  // Policy-artifact migrator. `--check` is the openclaw-upstream spelling
  // for "inspect without writing"; internally it maps to `--dry-run` on
  // the policy upgrade handler.
  program
    .command('upgrade')
    .description('Migrate policy artifacts to current schema version')
    .option('--check', 'Inspect without writing (dry run)', false)
    .option('--dry-run', 'Alias for --check', false)
    .action(async (cmdOpts: { check: boolean; dryRun: boolean }) => {
      const cwd = process.cwd();
      const flags: string[] = [];
      if (cmdOpts.check || cmdOpts.dryRun) flags.push('--dry-run');
      const result = await runPolicyRouter({
        binaryName: 'claws',
        argv: ['upgrade', ...flags],
        cwd,
        env: process.env,
      });
      if (result.stdout !== '') process.stdout.write(result.stdout);
      if (result.stderr !== '') process.stderr.write(result.stderr);
      process.exitCode = result.exitCode;
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

  // ── snap v2 (in-process SnapshotStore + RefStore via @bic/openclaw-snap) ───
  // capture / promote / rollback / discard / status / registry / diff /
  // checkout / read — each binds a filesystemStore + workspaceRefStore
  // rooted at <workspace>/.openclaw/snapshots/. No HTTP transport.

  snap
    .command('capture')
    .description('Capture the workspace into a new snapshot bundle (sets STAGE)')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      process.exitCode = await runSnapCapture(process.cwd(), { json: opts.json });
    });

  snap
    .command('promote')
    .description('Promote STAGE to HEAD')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      process.exitCode = await runSnapStorePromote(process.cwd(), { json: opts.json });
    });

  snap
    .command('rollback [id]')
    .description('Set HEAD to a prior snapshot id (or the latest history entry)')
    .action(async (id: string | undefined) => {
      const opts = program.opts<GlobalOpts>();
      process.exitCode = await runSnapStoreRollback(process.cwd(), id, { json: opts.json });
    });

  snap
    .command('discard')
    .description('Clear STAGE pointer (bytes stay in store for GC)')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      process.exitCode = await runSnapDiscard(process.cwd(), { json: opts.json });
    });

  snap
    .command('status')
    .description('Show HEAD, STAGE, and history depth for this workspace')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      process.exitCode = await runSnapStatus(process.cwd(), { json: opts.json });
    });

  snap
    .command('registry')
    .description('List snapshots in the store (newest first)')
    .option('--limit <n>', 'Cap on entries returned', (v) => parseInt(v, 10))
    .action(async (cmdOpts: { limit?: number }) => {
      const opts = program.opts<GlobalOpts>();
      const callOpts: { json: boolean; limit?: number } = { json: opts.json };
      if (cmdOpts.limit !== undefined) callOpts.limit = cmdOpts.limit;
      process.exitCode = await runSnapRegistry(process.cwd(), callOpts);
    });

  snap
    .command('checkout <id>')
    .description('Restore workspace files from a snapshot')
    .action(async (id: string) => {
      const opts = program.opts<GlobalOpts>();
      process.exitCode = await runSnapCheckout(process.cwd(), id, { json: opts.json });
    });

  snap
    .command('read <id> <path>')
    .description('Print bytes of a path inside a snapshot')
    .action(async (id: string, internalPath: string) => {
      const opts = program.opts<GlobalOpts>();
      process.exitCode = await runSnapRead(process.cwd(), id, internalPath, { json: opts.json });
    });

  snap
    .command('store-diff [id1] [id2]')
    .description('Path-level diff between two snapshots (or HEAD vs STAGE if omitted)')
    .action(async (id1: string | undefined, id2: string | undefined) => {
      const opts = program.opts<GlobalOpts>();
      process.exitCode = await runSnapStoreDiff(process.cwd(), id1, id2, { json: opts.json });
    });

  // ── policy (openclaw-upstream verbs via @bic/openclaw-policy/cli-handlers) ──
  // Delegates the entire `claws policy <verb> [args...]` surface to the
  // shared router, which dispatches to check / generate / watch / comply /
  // test / sim / report / verify / diff. Also routes `claws doctor` and
  // `claws upgrade` through the same top-level handlers.
  program
    .command('policy [verb] [args...]')
    .description('Policy surface: check / generate / watch / comply / test / sim / report / verify / diff')
    .allowUnknownOption()
    .helpOption(false)
    .action(async (verb: string | undefined, args: string[] = []) => {
      // Commander consumes `--json` at the program level, so the policy
      // router never sees it in `args`. Re-inject when set so verbs that
      // honour --json (comply, test) can emit machine-readable output.
      const opts = program.opts<GlobalOpts>();
      const verbArgs = opts.json ? ['--json', ...args] : args;
      const result = await runPolicyRouter({
        binaryName: 'claws',
        argv: ['policy', ...(verb !== undefined ? [verb] : []), ...verbArgs],
        cwd: process.cwd(),
        env: process.env,
      });
      if (result.stdout !== '') process.stdout.write(result.stdout);
      if (result.stderr !== '') process.stderr.write(result.stderr);
      process.exitCode = result.exitCode;
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

  // ── extract-cache (LLM extraction cache) ─────────────────────────────
  const extractCache = program
    .command('extract-cache')
    .description('LLM extraction cache management');

  extractCache
    .command('status')
    .description('Show cache statistics')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runCacheStatus(workspaceRoot, { json: opts.json });
      process.exitCode = exitCode;
    });

  extractCache
    .command('export')
    .description('Export cache as JSON to stdout')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runCacheExport(workspaceRoot, { json: opts.json });
      process.exitCode = exitCode;
    });

  extractCache
    .command('import <file>')
    .description('Import cache from a JSON file')
    .action(async (file: string) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runCacheImport(workspaceRoot, file, { json: opts.json });
      process.exitCode = exitCode;
    });

  extractCache
    .command('clear')
    .description('Clear all LLM cache entries')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runCacheClear(workspaceRoot, { json: opts.json });
      process.exitCode = exitCode;
    });

  // ── cache (compilation cache) ────────────────────────────────────────
  const cache = program
    .command('cache')
    .description('Compilation cache management');

  cache
    .command('stats')
    .description('Show compilation cache statistics as JSON')
    .action(async () => {
      const workspaceRoot = process.cwd();
      const exitCode = await runCompileCacheStats(workspaceRoot);
      process.exitCode = exitCode;
    });

  cache
    .command('list')
    .description('List compilation cache entries (sorted by lastAccess DESC)')
    .option('--json', 'Emit newline-delimited JSON instead of a table', false)
    .action(async (cmdOpts: { json: boolean }) => {
      // Honor either the global `--json` or the subcommand-local `--json`;
      // Commander's parent-option precedence means the global flag wins when
      // users type `claws --json cache list`, but `claws cache list --json`
      // sets the local flag.
      const globalOpts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runCompileCacheList(workspaceRoot, {
        json: cmdOpts.json || globalOpts.json,
      });
      process.exitCode = exitCode;
    });

  cache
    .command('prune')
    .description('Remove compile-cache entries older than a duration (e.g. 7d, 24h, 15m, 30s)')
    .requiredOption('--older-than <duration>', 'Maximum age: /^\\d+(s|m|h|d)$/')
    .action(async (cmdOpts: { olderThan: string }) => {
      const workspaceRoot = process.cwd();
      const exitCode = await runCompileCachePrune(workspaceRoot, { olderThan: cmdOpts.olderThan });
      process.exitCode = exitCode;
    });

  cache
    .command('clear')
    .description('Clear the compilation cache; use --yes to skip prompt')
    .option('--yes', 'Skip interactive confirmation', false)
    .option('--reset-counters', 'Also zero hit/miss counters', false)
    .action(async (cmdOpts: { yes: boolean; resetCounters: boolean }) => {
      const workspaceRoot = process.cwd();
      const exitCode = await runCompileCacheClear(workspaceRoot, {
        yes: cmdOpts.yes,
        resetCounters: cmdOpts.resetCounters,
      });
      process.exitCode = exitCode;
    });

  // ── protect ─────────────────────────────────────────────────────────
  const protect = program
    .command('protect')
    .description('Security and budget management');

  protect
    .command('budget')
    .description('Show workspace budget usage and threshold alerts')
    .option('--period <period>', 'Reporting period (daily, weekly, monthly)', 'monthly')
    .option('--fleet', 'Aggregate budget across all fleet workspaces')
    .action(async (cmdOpts: { period?: string; fleet?: boolean }) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();

      if (cmdOpts.fleet) {
        const exitCode = await runProtectBudgetFleet(workspaceRoot, {
          json: opts.json,
        });
        process.exitCode = exitCode;
        return;
      }

      const exitCode = await runProtectBudget(workspaceRoot, {
        json: opts.json,
        ...(cmdOpts.period !== undefined ? { period: cmdOpts.period } : {}),
      });
      process.exitCode = exitCode;
    });

  // ── protect secrets ─────────────────────────────────────────────────
  const secrets = protect
    .command('secrets')
    .description('Encrypted secrets vault');

  secrets
    .command('init')
    .description('Initialize a new encrypted vault')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runSecretsInit(workspaceRoot, {
        json: opts.json,
      });
      process.exitCode = exitCode;
    });

  secrets
    .command('set <key> <value>')
    .description('Store an encrypted secret')
    .action(async (key: string, value: string) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runSecretsSet(workspaceRoot, key, value, {
        json: opts.json,
      });
      process.exitCode = exitCode;
    });

  secrets
    .command('get <key>')
    .description('Retrieve and decrypt a secret')
    .action(async (key: string) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runSecretsGet(workspaceRoot, key, {
        json: opts.json,
      });
      process.exitCode = exitCode;
    });

  secrets
    .command('list')
    .description('List stored secret keys')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runSecretsList(workspaceRoot, {
        json: opts.json,
      });
      process.exitCode = exitCode;
    });

  secrets
    .command('delete <key>')
    .description('Delete a secret')
    .action(async (key: string) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runSecretsDelete(workspaceRoot, key, {
        json: opts.json,
      });
      process.exitCode = exitCode;
    });

  // ── protect identity ───────────────────────────────────────────────
  const identity = protect
    .command('identity')
    .description('SSO/RBAC identity provider management');

  identity
    .command('configure')
    .description('Register an OIDC or SAML identity provider')
    .requiredOption('--provider <type>', 'Provider type (OIDC or SAML)')
    .option('--issuer <url>', 'OIDC issuer URL')
    .option('--client-id <id>', 'OIDC client ID')
    .option('--redirect-uri <uri>', 'OIDC redirect URI')
    .option('--scopes <scopes>', 'OIDC scopes (comma-separated)')
    .option('--entity-id <id>', 'SAML entity ID')
    .option('--sso-url <url>', 'SAML SSO URL')
    .option('--certificate <cert>', 'SAML certificate (PEM)')
    .option('--role-mapping <mapping>', 'Role-to-tier mapping (role1:tier1,role2:tier2)')
    .action(async (cmdOpts: {
      provider: string;
      issuer?: string;
      clientId?: string;
      redirectUri?: string;
      scopes?: string;
      entityId?: string;
      ssoUrl?: string;
      certificate?: string;
      roleMapping?: string;
    }) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runIdentityConfigure(workspaceRoot, {
        json: opts.json,
        provider: cmdOpts.provider,
        issuer: cmdOpts.issuer,
        clientId: cmdOpts.clientId,
        redirectUri: cmdOpts.redirectUri,
        scopes: cmdOpts.scopes,
        entityId: cmdOpts.entityId,
        ssoUrl: cmdOpts.ssoUrl,
        certificate: cmdOpts.certificate,
        roleMapping: cmdOpts.roleMapping,
      });
      process.exitCode = exitCode;
    });

  identity
    .command('show')
    .description('Show current identity provider configuration')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runIdentityShow(workspaceRoot, {
        json: opts.json,
      });
      process.exitCode = exitCode;
    });

  // ── comply ──────────────────────────────────────────────────────────
  const comply = program
    .command('comply')
    .description('Compliance evidence generation (SOC2, HIPAA, EU AI Act)');

  comply
    .command('soc2')
    .description('Generate SOC2 Type II compliance evidence')
    .option('--observation-start <date>', 'Observation period start (ISO 8601)')
    .option('--observation-end <date>', 'Observation period end (ISO 8601)')
    .action(async (cmdOpts: { observationStart?: string; observationEnd?: string }) => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const complyOpts: { json: boolean; observationStart?: string; observationEnd?: string } = {
        json: opts.json,
      };
      if (cmdOpts.observationStart !== undefined) complyOpts.observationStart = cmdOpts.observationStart;
      if (cmdOpts.observationEnd !== undefined) complyOpts.observationEnd = cmdOpts.observationEnd;
      const exitCode = await runComplySOC2(workspaceRoot, complyOpts);
      process.exitCode = exitCode;
    });

  comply
    .command('hipaa')
    .description('Generate HIPAA Security Rule compliance evidence')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runComplyHIPAA(workspaceRoot, { json: opts.json });
      process.exitCode = exitCode;
    });

  comply
    .command('eu-ai-act')
    .description('Generate EU AI Act assessment (Article 6/Annex III classification)')
    .action(async () => {
      const opts = program.opts<GlobalOpts>();
      const workspaceRoot = process.cwd();
      const exitCode = await runComplyEUAIAct(workspaceRoot, { json: opts.json });
      process.exitCode = exitCode;
    });

  // ── fleet ────────────────────────────────────────────────────────────
  const fleet = program
    .command('fleet')
    .description('Fleet-wide operations across multiple workspaces');

  fleet
    .command('compile <fleet-dir>')
    .description('Compile every workspace under <fleet-dir> with bounded parallelism')
    .option(
      '--max-concurrency <n>',
      'Cap in-flight compiles; positive integer (default: os.cpus().length). Tune down on memory-limited CI runners.',
    )
    .option('--json', 'Emit newline-delimited JSON (one result per line + final summary)', false)
    .option('--stats', 'Include peak-concurrency and parallelism ratio in the human summary', false)
    .option('--output-dir <path>', 'Base output directory; each workspace gets a subdirectory', '.claws/fleet-out')
    .action(async (
      fleetDir: string,
      cmdOpts: { maxConcurrency?: string; json?: boolean; stats?: boolean; outputDir: string },
    ) => {
      const opts = program.opts<GlobalOpts>();
      let maxConcurrency: number;
      try {
        maxConcurrency = parseMaxConcurrency(cmdOpts.maxConcurrency);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (opts.json || cmdOpts.json === true) {
          process.stderr.write(`${JSON.stringify({ error: msg })}\n`);
        } else {
          process.stderr.write(`claws fleet compile: ${msg}\n`);
        }
        process.exitCode = 1;
        return;
      }
      const exitCode = await runFleetCompile(fleetDir, {
        maxConcurrency,
        json: opts.json || cmdOpts.json === true,
        stats: cmdOpts.stats === true,
        outputDir: cmdOpts.outputDir,
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
          commands: ['init', 'protect'],
        }));
      } else {
        console.log('claws — enterprise governance compiler\n');
        console.log('No claws.json found in this directory.\n');
        console.log('Get started:');
        console.log('  claws init                     Create workspace + config');
        console.log('  claws init --template soc2     Start with SOC2 template');
        console.log('  claws init skill my-skill      Scaffold a new skill\n');
        console.log('Security & budget:');
        console.log('  claws protect budget           Show budget usage');
        console.log('  claws protect secrets           Encrypted secrets vault');
        console.log('  claws protect identity          SSO/RBAC management\n');
        console.log('Run `claws --help` for all commands.');
      }
    } else {
      if (opts.json) {
        console.log(JSON.stringify({
          status: 'workspace-detected',
          workspaceRoot: ctx.workspaceRoot,
          commands: ['compile', 'check', 'build', 'protect'],
        }));
      } else {
        console.log('claws — enterprise governance compiler\n');
        console.log(`Workspace: ${ctx.workspaceRoot}\n`);
        console.log('Next steps:');
        console.log('  claws compile   Compile governance policies');
        console.log('  claws check     Check compliance (read-only)');
        console.log('  claws build     Compile + emit artifacts\n');
        console.log('Security & budget:');
        console.log('  claws protect   Budget, secrets, identity management\n');
        console.log('Run `claws --help` for all commands.');
      }
    }
  });

  return program;
}
