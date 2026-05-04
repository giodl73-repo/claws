/**
 * `pinch` CLI — shell-level access to the lint runner. Self-hosters
 * invoke it as a standalone bin (`pinch ...`) or as `openclaw pinch
 * ...` once the umbrella dispatcher lands.
 *
 * Cargo:Clippy ↔ OpenClaw:Pinch — same precedent (a branded CLI
 * over an underlying lint framework).
 *
 * **Subcommands**:
 *
 *   `pinch run [--rules <pack>] [--severity-min <level>] [<workspace-dir>]`
 *     Walk the workspace via `buildWorkspaceManifest`, parse each
 *     canonical file, run the starter rule pack (or `<pack>`), print
 *     diagnostics. Default `<workspace-dir>` = cwd.
 *
 *   `pinch lint <file...> [--rules <pack>]`
 *     Lint specific files (no manifest walk). For one-off use.
 *
 *   `pinch list-rules [--pack <name>]`
 *     Print the registered rule pack with id, severity, description,
 *     and `appliesTo` glob.
 *
 *   `pinch help`
 *     Print usage and exit.
 *
 * **Output**: TTY-aware. Human-readable by default; `--json` switches
 * to machine-parseable. Exit codes:
 *   0 — clean (no findings, or only `info`-severity)
 *   1 — findings at warning or error severity
 *   2 — argument / parse / I/O error
 *
 * @module @bic/pinch/cli
 */

import { promises as fs } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import {
  REDACTED_SENTINEL,
  buildWorkspaceManifest,
  parseJsonc,
  parseJsonl,
  parseMd,
  parseYaml,
  type OcAst,
  type OcKind,
  type WorkspaceManifestEntry,
} from '@bic/oc-paths-substrate';
import { runLint, type LintFile } from '../oc-lint/runner.js';
import { STARTER_RULES_V0 } from '../extensions/oclint-rules-starter/index.js';
import type { Diagnostic, LintRule, LintSeverity } from '../plugin-sdk/oc-lint/types.js';

// ── Output mode ─────────────────────────────────────────────────────────

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

/**
 * Output-boundary sentinel scrub. Replaces any occurrence of the
 * redaction sentinel (`__OPENCLAW_REDACTED__`) with a fixed
 * placeholder before writing to stdout. Defense-in-depth: even if
 * a future rule's diagnostic message echoes raw file content
 * containing the sentinel, the CLI MUST NOT print it verbatim.
 *
 * The substrate's emit-time guard catches sentinels during file
 * writes; this is the read-side equivalent for CLI output.
 */
const SCRUB_PLACEHOLDER = '[REDACTED]';
export function scrubSentinel(s: string): string {
  if (!s.includes(REDACTED_SENTINEL)) return s;
  return s.split(REDACTED_SENTINEL).join(SCRUB_PLACEHOLDER);
}

function emit(out: OutputContext, payload: Record<string, unknown>, humanLines: readonly string[]): void {
  if (out.mode === 'json') {
    out.stdout.write(scrubSentinel(JSON.stringify(payload)) + '\n');
  } else {
    for (const line of humanLines) out.stdout.write(scrubSentinel(line) + '\n');
  }
}

// ── Glue ────────────────────────────────────────────────────────────────

function parseForKind(kind: OcKind, raw: string): OcAst {
  switch (kind) {
    case 'md':
      return parseMd(raw).ast;
    case 'jsonc':
      return parseJsonc(raw).ast;
    case 'jsonl':
      return parseJsonl(raw).ast;
    case 'yaml':
      return parseYaml(raw).ast;
  }
}

async function entryToLintFile(entry: WorkspaceManifestEntry): Promise<LintFile> {
  const raw = await fs.readFile(entry.path, 'utf-8');
  return {
    name: entry.relPath.split('/').pop() ?? entry.relPath,
    ast: parseForKind(entry.role.kind, raw),
  };
}

const SEVERITY_RANK: Record<LintSeverity, number> = {
  info: 0,
  warning: 1,
  error: 2,
};

function exitCodeFor(diagnostics: readonly Diagnostic[]): 0 | 1 {
  return diagnostics.some((d) => SEVERITY_RANK[d.severity] >= 1) ? 1 : 0;
}

// ── Subcommand: run ─────────────────────────────────────────────────────

async function runCmdRun(
  argv: readonly string[],
  out: OutputContext,
): Promise<number> {
  const positional = argv.filter((a) => !a.startsWith('-'));
  const dir = resolvePath(positional[0] ?? process.cwd());
  const severityMin = parseSeverityMin(argv);
  const rules = STARTER_RULES_V0;

  const manifest = await buildWorkspaceManifest(dir);
  const files = await Promise.all(manifest.entries.map(entryToLintFile));
  const result = runLint({ rules, files });

  const filtered = result.diagnostics.filter(
    (d) => SEVERITY_RANK[d.severity] >= severityMin,
  );

  emit(
    out,
    {
      ok: filtered.length === 0,
      workspaceDir: dir,
      filesLinted: files.length,
      diagnostics: filtered.map((d) => ({
        ruleId: d.ruleId,
        severity: d.severity,
        fileName: d.fileName,
        line: d.line,
        ocPath: d.ocPath,
        message: d.message,
      })),
    },
    [
      `pinch: ran ${rules.length} rule(s) over ${files.length} file(s) in ${dir}`,
      ...(filtered.length === 0
        ? ['  no findings ✓']
        : filtered.map(
            (d) =>
              `  [${d.severity}] ${d.fileName}:${d.line}  ${d.ruleId}  — ${d.message}`,
          )),
    ],
  );

  return exitCodeFor(filtered);
}

function parseSeverityMin(argv: readonly string[]): number {
  const idx = argv.indexOf('--severity-min');
  if (idx === -1) return 0;
  const v = argv[idx + 1];
  if (v === undefined) return 0;
  const r = SEVERITY_RANK[v as LintSeverity];
  return r ?? 0;
}

// ── Subcommand: lint (specific files) ───────────────────────────────────

async function runCmdLint(
  argv: readonly string[],
  out: OutputContext,
): Promise<number> {
  const filePaths = argv.filter((a) => !a.startsWith('-'));
  if (filePaths.length === 0) {
    emit(out, { ok: false, error: 'no files specified' }, [
      'pinch lint: at least one file required',
    ]);
    return 2;
  }
  const rules = STARTER_RULES_V0;
  const files: LintFile[] = [];
  for (const p of filePaths) {
    const raw = await fs.readFile(p, 'utf-8');
    const name = p.split(/[\\/]/).pop() ?? p;
    const kind = inferKindFromName(name);
    if (kind === null) {
      emit(out, { ok: false, error: `unknown kind: ${name}` }, [
        `pinch lint: ${name}: cannot infer kind from extension`,
      ]);
      return 2;
    }
    files.push({ name, ast: parseForKind(kind, raw) });
  }
  const result = runLint({ rules, files });
  emit(
    out,
    {
      ok: result.diagnostics.length === 0,
      filesLinted: files.length,
      diagnostics: result.diagnostics.map((d) => ({
        ruleId: d.ruleId,
        severity: d.severity,
        fileName: d.fileName,
        line: d.line,
        ocPath: d.ocPath,
        message: d.message,
      })),
    },
    [
      `pinch: ran ${rules.length} rule(s) over ${files.length} file(s)`,
      ...(result.diagnostics.length === 0
        ? ['  no findings ✓']
        : result.diagnostics.map(
            (d) =>
              `  [${d.severity}] ${d.fileName}:${d.line}  ${d.ruleId}  — ${d.message}`,
          )),
    ],
  );
  return exitCodeFor(result.diagnostics);
}

function inferKindFromName(name: string): OcKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.md')) return 'md';
  if (lower.endsWith('.jsonc') || lower.endsWith('.json')) return 'jsonc';
  if (lower.endsWith('.jsonl') || lower.endsWith('.ndjson')) return 'jsonl';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml') || lower.endsWith('.lobster'))
    return 'yaml';
  return null;
}

// ── Subcommand: list-rules ──────────────────────────────────────────────

async function runCmdListRules(
  _argv: readonly string[],
  out: OutputContext,
): Promise<number> {
  const rules: readonly LintRule[] = STARTER_RULES_V0;
  emit(
    out,
    {
      pack: 'starter-v0',
      count: rules.length,
      rules: rules.map((r) => ({
        id: r.id,
        severity: r.severity,
        appliesTo: r.appliesTo,
        description: r.description,
      })),
    },
    [
      `pinch starter-v0: ${rules.length} rule(s)`,
      ...rules.map((r) => `  [${r.severity}] ${r.id}  appliesTo=${r.appliesTo}`),
    ],
  );
  return 0;
}

// ── Help ────────────────────────────────────────────────────────────────

function printHelp(out: OutputContext): void {
  if (out.mode === 'json') {
    out.stdout.write(
      JSON.stringify({
        bin: 'pinch',
        usage: 'pinch <subcommand> [args]',
        subcommands: ['run', 'lint', 'list-rules', 'help'],
      }) + '\n',
    );
    return;
  }
  out.stdout.write(
    [
      'pinch — OpenClaw lint runner (Cargo:Clippy ↔ OpenClaw:Pinch)',
      '',
      'Usage:',
      '  pinch run [--severity-min <level>] [<workspace-dir>]',
      '      Walk the workspace manifest and lint every canonical artifact.',
      '  pinch lint <file...>',
      '      Lint specific files; kind inferred from extension.',
      '  pinch list-rules',
      '      Print the registered rule pack.',
      '  pinch help',
      '      Print this message.',
      '',
      'Output:',
      '  TTY-aware. Defaults to human-readable when stdout is a TTY;',
      '  switches to JSON otherwise. --json and --human override.',
      '',
      'Exit codes:',
      '  0  clean or only info-severity findings',
      '  1  warning or error findings',
      '  2  argument / parse / I/O error',
      '',
    ].join('\n'),
  );
}

// ── Dispatch ────────────────────────────────────────────────────────────

export async function runCli(argv: readonly string[]): Promise<number> {
  const out = makeOutput(argv);
  // Strip global flags (--json / --human) before subcommand dispatch
  // so `pinch --json help` and `pinch help --json` are equivalent.
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
      case 'run':
        return await runCmdRun(rest, out);
      case 'lint':
        return await runCmdLint(rest, out);
      case 'list-rules':
        return await runCmdListRules(rest, out);
      default:
        emit(
          out,
          { ok: false, error: `unknown subcommand: ${subcmd}` },
          [`pinch: unknown subcommand "${subcmd}". Try "pinch help".`],
        );
        return 2;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    emit(out, { ok: false, error: msg }, [`pinch: error: ${msg}`]);
    return 2;
  }
}
