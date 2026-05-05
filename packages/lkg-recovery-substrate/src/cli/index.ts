/**
 * `openclaw-lkg` CLI — operator-facing access to the LKG store.
 * Self-hosters debugging recovery events use it to see which files
 * are tracked, what their last-known-good fingerprints look like,
 * and what happens when a file is observed.
 *
 * **Subcommands**:
 *
 *   `openclaw-lkg status [<workspace-dir>]`
 *     Walk the workspace manifest, register the default per-kind
 *     trackers, observe each tracked file once, and report the
 *     outcome (promoted / valid / recovered / skipped / failed)
 *     plus the last-known-good fingerprint hash. Exit 0 if every
 *     observation produced a known-good outcome; exit 1 if any
 *     observation failed (parse-throw / sentinel-detected /
 *     validate-throw).
 *
 *   `openclaw-lkg observe <file>`
 *     One-shot observe of a specific path. Useful for debugging
 *     why a file isn't promoting (wrong validator, sentinel in
 *     content, parse error, etc.). Returns the full LKGObservation
 *     payload.
 *
 *   `openclaw-lkg list-trackers [<workspace-dir>]`
 *     Print the canonical openclaw artifacts the manifest would
 *     register trackers for, without actually observing them. Same
 *     output as `policy list-generators` in spirit.
 *
 *   `openclaw-lkg fingerprint <file>`
 *     Compute the sha256 fingerprint of a file's bytes. Doesn't
 *     touch any LKG state — just a raw hash, useful for verifying
 *     that two copies of a file match.
 *
 *   `openclaw-lkg help`
 *
 * **Output**: TTY-aware (human / JSON), exit code semantics
 * (0/1/2 — same family convention).
 *
 * **Sentinel scrub**: every output goes through `scrubSentinel(...)`.
 * Same primitive as openclaw-path + pinch + openclaw-policy CLIs.
 *
 * @module @openclaw/lkg/cli
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import {
  REDACTED_SENTINEL,
  buildWorkspaceManifest,
  loadWorkspaceConfig,
  type WorkspaceManifest,
} from '@openclaw/oc-path';
import {
  resolveLkgOverrides,
  type WorkspaceLkgConfig,
} from '../plugin-sdk/lkg/workspace-config.js';
import { FsLKGStore } from '../extensions/lkg-fs/index.js';
import {
  registerOpenClawWorkspace,
  type OpenClawRegisteredEntry,
} from '../trackers/index.js';
import type { LKGObservation } from '../plugin-sdk/lkg/types.js';

// ── Output ──────────────────────────────────────────────────────────────

interface OutputContext {
  readonly mode: 'human' | 'json';
  readonly stdout: NodeJS.WritableStream;
  readonly stderr: NodeJS.WritableStream;
}

function makeOutput(argv: readonly string[]): OutputContext {
  const json = argv.includes('--json');
  const human = argv.includes('--human');
  const isTty = process.stdout.isTTY === true;
  const mode: 'human' | 'json' = json ? 'json' : human ? 'human' : isTty ? 'human' : 'json';
  return { mode, stdout: process.stdout, stderr: process.stderr };
}

const SCRUB_PLACEHOLDER = '[REDACTED]';
export function scrubSentinel(s: string): string {
  if (!s.includes(REDACTED_SENTINEL)) return s;
  return s.split(REDACTED_SENTINEL).join(SCRUB_PLACEHOLDER);
}

/**
 * Detect EPIPE on a write that targets a closed downstream (e.g.,
 * `openclaw-lkg ... | head -1` after `head` exits). On Windows
 * Node sometimes surfaces this as `EOF` or `ECONNRESET`; treat all
 * three as the same "downstream closed" signal so the CLI can exit
 * gracefully rather than throwing. Mirrors the `openclaw-policy`
 * helper of the same name.
 */
export function isClosedPipeError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as NodeJS.ErrnoException).code;
  return code === 'EPIPE' || code === 'EOF' || code === 'ECONNRESET';
}

function safeWrite(stream: NodeJS.WritableStream, text: string): boolean {
  try {
    stream.write(text);
    return true;
  } catch (err) {
    if (isClosedPipeError(err)) return false;
    throw err;
  }
}

function emit(out: OutputContext, payload: Record<string, unknown>, humanLines: readonly string[]): void {
  if (out.mode === 'json') {
    safeWrite(out.stdout, scrubSentinel(JSON.stringify(payload, null, 2)) + '\n');
  } else {
    for (const line of humanLines) {
      if (!safeWrite(out.stdout, scrubSentinel(line) + '\n')) return;
    }
  }
}

function emitError(out: OutputContext, msg: string, code = 'ERR'): void {
  const scrubbed = scrubSentinel(msg);
  if (out.mode === 'json') {
    safeWrite(out.stderr, JSON.stringify({ error: { code, message: scrubbed } }) + '\n');
  } else {
    safeWrite(out.stderr, `${code}: ${scrubbed}\n`);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function pickFlag(argv: readonly string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

function workspaceDirFrom(argv: readonly string[]): string {
  const positional = argv.filter((a) => !a.startsWith('-'));
  return resolvePath(positional[0] ?? process.cwd());
}

function summarizeObservation(obs: LKGObservation): {
  outcome: LKGObservation['outcome'];
  fingerprint: string | null;
  reason: string | null;
} {
  const outcome = obs.outcome;
  if (outcome === 'promoted' || outcome === 'valid') {
    return { outcome, fingerprint: obs.fingerprint.hash, reason: null };
  }
  if (outcome === 'recovered') {
    return {
      outcome,
      fingerprint: obs.restoredFrom.hash,
      reason: obs.reason,
    };
  }
  if (outcome === 'skipped' || outcome === 'failed') {
    return { outcome, fingerprint: null, reason: obs.reason };
  }
  return { outcome, fingerprint: null, reason: null };
}

// ── Subcommand: status ──────────────────────────────────────────────────

async function runCmdStatus(argv: readonly string[], out: OutputContext): Promise<number> {
  const dir = workspaceDirFrom(argv);
  const cliSkip = parseSkipFlags(argv);
  const wsConfig = await loadWorkspaceConfig(dir);
  const lkgSection = wsConfig?.['lkg'] as WorkspaceLkgConfig | undefined;
  const overrides = resolveLkgOverrides(lkgSection, { skip: cliSkip });

  const store = new FsLKGStore({ root: dir });
  const manifest = await buildWorkspaceManifest(dir);
  const registration = registerOpenClawWorkspace(store, manifest);

  // Observe each registered tracker once, filtering by workspace.json
  // and CLI --skip rules.
  const observations: Array<{
    relPath: string;
    role: string;
    ocPath: string;
    outcome: LKGObservation['outcome'];
    fingerprint: string | null;
    reason: string | null;
  }> = [];
  const skipped: Array<{ relPath: string; role: string; reason: string }> = [];
  let failedCount = 0;
  for (const entry of registration.registered) {
    if (overrides.shouldSkip({ roleId: entry.role.id, relPath: entry.relPath })) {
      skipped.push({
        relPath: entry.relPath,
        role: entry.role.id,
        reason: overrides.skipRoleIds.has(entry.role.id)
          ? `role-id matched skip list`
          : `relPath matched skip glob`,
      });
      continue;
    }
    const obs = await store.observe(entry.path);
    const summary = summarizeObservation(obs);
    observations.push({
      relPath: entry.relPath,
      role: entry.role.id,
      ocPath: entry.ocPath,
      ...summary,
    });
    if (summary.outcome === 'failed') failedCount++;
  }

  emit(
    out,
    {
      ok: failedCount === 0,
      workspaceDir: dir,
      walkedFiles: manifest.walkedFiles,
      tracked: registration.registered.length,
      observed: observations.length,
      skippedByConfig: skipped.length,
      observations,
      skipped,
      byOutcome: countByOutcome(observations.map((o) => o.outcome)),
    },
    [
      `openclaw-lkg status: ${dir}`,
      `  walked: ${manifest.walkedFiles} file(s)`,
      `  tracked: ${registration.registered.length} canonical artifact(s)`,
      ...(skipped.length > 0
        ? [`  skipped (config): ${skipped.length}`, ...skipped.map((s) => `    [skipped] ${s.relPath}  role=${s.role}  (${s.reason})`)]
        : []),
      ...observations.map(
        (o) =>
          `    [${o.outcome}] ${o.relPath}  role=${o.role}` +
          (o.fingerprint !== null ? `  fingerprint=${o.fingerprint.slice(0, 12)}…` : '') +
          (o.reason !== null ? `  reason=${o.reason}` : ''),
      ),
    ],
  );
  return failedCount === 0 ? 0 : 1;
}

/**
 * Collect every `--skip <token>` flag occurrence. Tokens are
 * disambiguated by `resolveLkgOverrides`: containing `*` or `/`
 * means path glob; otherwise role ID.
 */
function parseSkipFlags(argv: readonly string[]): readonly string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--skip' && argv[i + 1] !== undefined) {
      out.push(argv[i + 1]!);
      i++;
    }
  }
  return out;
}

function countByOutcome(
  outcomes: readonly LKGObservation['outcome'][],
): Readonly<Record<LKGObservation['outcome'], number>> {
  const counts: Record<LKGObservation['outcome'], number> = {
    valid: 0,
    promoted: 0,
    recovered: 0,
    skipped: 0,
    failed: 0,
  };
  for (const o of outcomes) counts[o]++;
  return counts;
}

// ── Subcommand: observe ─────────────────────────────────────────────────

async function runCmdObserve(argv: readonly string[], out: OutputContext): Promise<number> {
  const positional = argv.filter((a) => !a.startsWith('-'));
  const filePath = positional[0];
  if (filePath === undefined) {
    emitError(out, 'observe: <file> required', 'ERR_USAGE');
    return 2;
  }
  const abs = resolvePath(filePath);
  // Use the file's parent dir as the workspace root so the manifest
  // walker finds it. For one-off observe we just operate on the
  // single-file scope.
  const root = pickFlag(argv, '--root') !== undefined
    ? resolvePath(pickFlag(argv, '--root')!)
    : process.cwd();
  const store = new FsLKGStore({ root });
  const manifest = await buildWorkspaceManifest(root);
  const reg = registerOpenClawWorkspace(store, manifest);
  const target = reg.registered.find((e) => resolvePath(e.path) === abs);
  if (target === undefined) {
    emitError(
      out,
      `${abs} is not a canonical openclaw artifact under ${root}`,
      'ERR_NOT_TRACKED',
    );
    return 2;
  }
  const obs = await store.observe(target.path);
  const summary = summarizeObservation(obs);
  emit(
    out,
    {
      ok: summary.outcome !== 'failed',
      file: abs,
      role: target.role.id,
      ocPath: target.ocPath,
      ...summary,
      observation: obs,
    },
    [
      `openclaw-lkg observe ${target.relPath}`,
      `  role: ${target.role.id}`,
      `  outcome: ${summary.outcome}` +
        (summary.fingerprint !== null
          ? `  (fingerprint=${summary.fingerprint.slice(0, 12)}…)`
          : ''),
      ...(summary.reason !== null ? [`  reason: ${summary.reason}`] : []),
    ],
  );
  return summary.outcome === 'failed' ? 1 : 0;
}

// ── Subcommand: list-trackers ───────────────────────────────────────────

async function runCmdListTrackers(argv: readonly string[], out: OutputContext): Promise<number> {
  const dir = workspaceDirFrom(argv);
  const manifest: WorkspaceManifest = await buildWorkspaceManifest(dir);
  emit(
    out,
    {
      ok: true,
      workspaceDir: dir,
      walkedFiles: manifest.walkedFiles,
      byKind: manifest.byKind,
      byRole: manifest.byRole,
      entries: manifest.entries.map((e) => ({
        relPath: e.relPath,
        roleId: e.role.id,
        kind: e.role.kind,
        ocPath: e.ocPathString,
      })),
    },
    [
      `openclaw-lkg list-trackers: ${dir}`,
      `  walked: ${manifest.walkedFiles} file(s)`,
      `  tracked roles: ${Object.entries(manifest.byRole)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')}`,
      ...manifest.entries.map(
        (e) => `    ${e.relPath}  role=${e.role.id}  kind=${e.role.kind}`,
      ),
    ],
  );
  return 0;
}

// ── Subcommand: fingerprint ─────────────────────────────────────────────

async function runCmdFingerprint(argv: readonly string[], out: OutputContext): Promise<number> {
  const positional = argv.filter((a) => !a.startsWith('-'));
  const filePath = positional[0];
  if (filePath === undefined) {
    emitError(out, 'fingerprint: <file> required', 'ERR_USAGE');
    return 2;
  }
  const abs = resolvePath(filePath);
  let raw: Buffer;
  try {
    raw = await fs.readFile(abs);
  } catch (err) {
    emitError(out, `read failed: ${err instanceof Error ? err.message : String(err)}`, 'ERR_IO');
    return 2;
  }
  const hash = createHash('sha256').update(raw).digest('hex');
  emit(
    out,
    {
      ok: true,
      file: abs,
      bytes: raw.byteLength,
      hash,
    },
    [`${hash}  ${abs}  (${raw.byteLength} bytes)`],
  );
  return 0;
}

// ── Help ────────────────────────────────────────────────────────────────

function printHelp(out: OutputContext): void {
  if (out.mode === 'json') {
    out.stdout.write(
      JSON.stringify({
        bin: 'openclaw-lkg',
        usage: 'openclaw-lkg <subcommand> [args]',
        subcommands: ['status', 'observe', 'list-trackers', 'fingerprint', 'help'],
      }) + '\n',
    );
    return;
  }
  safeWrite(
    out.stdout,
    [
      'openclaw-lkg — operator-facing access to the LKG store',
      '',
      'Usage:',
      '  openclaw-lkg status [<workspace-dir>] [--skip <role-or-glob>...]',
      '      Walk the workspace, observe each tracked file, report outcomes.',
      '      --skip <role>     skip a canonical role (e.g., "session.jsonl")',
      '      --skip <glob>     skip relPaths matching a glob (e.g., "sessions/*")',
      '      Workspace-level defaults live under `lkg.skip` / `lkg.skipPaths`',
      '      in workspace.json; CLI flags add to (do not replace) those.',
      '  openclaw-lkg observe <file> [--root <workspace-dir>]',
      '      One-shot observe of a specific path.',
      '  openclaw-lkg list-trackers [<workspace-dir>]',
      '      Print canonical openclaw artifacts the manifest would track.',
      '  openclaw-lkg fingerprint <file>',
      '      Compute sha256 over file bytes; no LKG state touched.',
      '  openclaw-lkg help',
      '',
      'Output:',
      '  TTY-aware. Defaults to human-readable when stdout is a TTY;',
      '  switches to JSON otherwise. --json / --human override.',
      '',
      'Exit codes:',
      '  0  every observation produced a known-good outcome',
      '  1  at least one observation failed (parse-throw, sentinel, etc.)',
      '  2  argument / parse / I/O error',
      '',
    ].join('\n'),
  );
}

// ── Dispatch ────────────────────────────────────────────────────────────

/**
 * Install an `'error'` handler on stdout/stderr so async EPIPE
 * (`openclaw-lkg ... | head -1`) is swallowed instead of crashing.
 * Mirrors the openclaw-policy helper of the same name.
 */
function installPipeGuard(stream: NodeJS.WritableStream): () => void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = stream as any;
  if (typeof s.on !== 'function' || typeof s.off !== 'function') {
    return () => {};
  }
  const handler = (err: NodeJS.ErrnoException): void => {
    if (isClosedPipeError(err)) return;
    try {
      process.stderr.write(`ERR_INTERNAL: ${err.message}\n`);
    } catch {
      // stderr also closed; nothing we can do.
    }
    process.exitCode = 2;
  };
  s.on('error', handler);
  return () => s.off('error', handler);
}

export async function runCli(argv: readonly string[]): Promise<number> {
  const out = makeOutput(argv);
  const teardownStdout = installPipeGuard(out.stdout);
  const teardownStderr = installPipeGuard(out.stderr);
  const filtered = argv.filter((a) => a !== '--json' && a !== '--human');
  const subcmd = filtered[0];
  const rest = filtered.slice(1);
  try {
    switch (subcmd) {
      case undefined:
      case 'help':
      case '--help':
      case '-h':
        printHelp(out);
        return 0;
      case 'status':
        return await runCmdStatus(rest, out);
      case 'observe':
        return await runCmdObserve(rest, out);
      case 'list-trackers':
        return await runCmdListTrackers(rest, out);
      case 'fingerprint':
        return await runCmdFingerprint(rest, out);
      default:
        emitError(out, `unknown subcommand: ${subcmd}. Try "openclaw-lkg help".`, 'ERR_UNKNOWN_SUBCOMMAND');
        return 2;
    }
  } catch (err) {
    if (isClosedPipeError(err)) return 0;
    emitError(out, err instanceof Error ? err.message : String(err), 'ERR_INTERNAL');
    return 2;
  } finally {
    teardownStdout();
    teardownStderr();
  }
}

/** Re-exported for parity with the other CLI shims. */
export type { OpenClawRegisteredEntry };
