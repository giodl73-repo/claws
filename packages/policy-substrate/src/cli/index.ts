/**
 * `openclaw-policy` CLI — shell-level access to the policy
 * generator + evaluator. Self-hosters invoke it as a standalone bin
 * (`openclaw-policy ...`) or as `openclaw policy ...` once the
 * umbrella dispatcher (#182) lands.
 *
 * **Subcommands**:
 *
 *   `openclaw-policy generate <workspace-dir> [--generator <id>] [--out <path>]`
 *     Walk the workspace via `buildWorkspaceManifest`, parse each
 *     canonical artifact, dispatch to the registered generator
 *     (default `'md'`), and emit the resulting PolicyIR. Stamps
 *     a deterministic `policyId` via RFC 8785 JCS.
 *
 *   `openclaw-policy check <policy-ir-path>`
 *     Read a PolicyIR from disk, recompute `policyId` over the
 *     body, verify it matches. Exit 0 on match, 1 on mismatch
 *     (tampered IR), 2 on parse / read failure.
 *
 *   `openclaw-policy diff <a.json> <b.json>`
 *     Semantic diff between two PolicyIRs — added/removed/changed
 *     tools and deny rules. Useful for `git diff`-style reviews
 *     during operator-facing policy migrations.
 *
 *   `openclaw-policy evaluate <policy-ir-path> <tool-id> [--args <json>]`
 *     Given a tool call, return the upstream Decision shape
 *     (`allow` / `deny` / `requires-approval` / `params`). Mirrors
 *     what a guardrail's `evaluate(event, ctx)` would compute.
 *
 *   `openclaw-policy list-generators`
 *     Print registered generators with id + description.
 *
 *   `openclaw-policy help`
 *
 * **Output**: TTY-aware. Defaults to human-readable when stdout is
 * a TTY; JSON otherwise. `--json` / `--human` flags override.
 *
 * **Sentinel scrub**: every output goes through `scrubSentinel(...)`.
 * Mirrors the openclaw-path + pinch CLI guards.
 *
 * @module @bic/policy-substrate/cli
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
import type { LKGFingerprint } from '@bic/lkg-recovery-substrate';
import {
  computePolicyId,
  evaluateDecision,
  getPolicyGenerator,
  listPolicyGenerators,
  type PolicyExtractFile,
  type PolicyIR,
  type ToolCallInput,
} from '../plugin-sdk/policy/index.js';

// Importing the starter pack registers the `md` generator.
import '../extensions/policy-from-md-starter/generator.js';
import type { MdGeneratorInput } from '../extensions/policy-from-md-starter/generator.js';

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

const SCRUB_PLACEHOLDER = '[REDACTED]';
export function scrubSentinel(s: string): string {
  if (!s.includes(REDACTED_SENTINEL)) return s;
  return s.split(REDACTED_SENTINEL).join(SCRUB_PLACEHOLDER);
}

function emit(out: OutputContext, payload: Record<string, unknown>, humanLines: readonly string[]): void {
  if (out.mode === 'json') {
    out.stdout.write(scrubSentinel(JSON.stringify(payload, null, 2)) + '\n');
  } else {
    for (const line of humanLines) out.stdout.write(scrubSentinel(line) + '\n');
  }
}

function emitError(out: OutputContext, msg: string, code = 'ERR'): void {
  const scrubbed = scrubSentinel(msg);
  if (out.mode === 'json') {
    out.stderr.write(JSON.stringify({ error: { code, message: scrubbed } }) + '\n');
  } else {
    out.stderr.write(`${code}: ${scrubbed}\n`);
  }
}

// ── Manifest → PolicyExtractFile[] ──────────────────────────────────────

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

async function entryToExtractFile(
  entry: WorkspaceManifestEntry,
): Promise<PolicyExtractFile> {
  const raw = await fs.readFile(entry.path, 'utf-8');
  return {
    name: entry.relPath.split('/').pop() ?? entry.relPath,
    path: entry.path,
    relPath: entry.relPath,
    raw,
    ast: parseForKind(entry.role.kind, raw),
  };
}

// ── Subcommand: generate ────────────────────────────────────────────────

async function runCmdGenerate(
  argv: readonly string[],
  out: OutputContext,
): Promise<number> {
  const positional = argv.filter((a) => !a.startsWith('-'));
  const dir = resolvePath(positional[0] ?? process.cwd());
  const generatorId = pickFlag(argv, '--generator') ?? 'md';
  const outPath = pickFlag(argv, '--out');

  const spec = getPolicyGenerator(generatorId);
  if (spec === null) {
    emitError(out, `unknown generator: ${generatorId}`, 'ERR_UNKNOWN_GENERATOR');
    return 2;
  }

  const manifest = await buildWorkspaceManifest(dir);
  const files = await Promise.all(manifest.entries.map(entryToExtractFile));

  // Build a placeholder LKG fingerprint over the manifest's bytes.
  // Real callers thread an actual LKGFingerprint from the LKG store;
  // the CLI computes a content hash so each `generate` run produces
  // a deterministic anchor without mocking.
  const anchor = await computeWorkspaceAnchor(files);

  // Cast: the registry type-erases TValidated; the md generator
  // expects `MdGeneratorInput { files }`. We construct that shape.
  const input: MdGeneratorInput = { files };
  const ir = await spec.generator.generate(
    input as unknown as Parameters<typeof spec.generator.generate>[0],
    anchor,
  );

  if (outPath !== undefined) {
    await fs.writeFile(resolvePath(outPath), JSON.stringify(ir, null, 2) + '\n', 'utf-8');
  }

  emit(
    out,
    {
      ok: true,
      generator: generatorId,
      workspaceDir: dir,
      filesProcessed: files.length,
      writtenTo: outPath !== undefined ? resolvePath(outPath) : null,
      policyId: ir.policyId,
      tools: ir.tools.length,
      denyRules: ir.denyRules.length,
      // Always include the IR in the payload — callers can pipe
      // through `jq .ir` if they don't want to write to a file.
      ir,
    },
    [
      `openclaw-policy generate (generator=${generatorId})`,
      `  workspace: ${dir}`,
      `  files processed: ${files.length}`,
      `  policyId: ${ir.policyId}`,
      `  tools: ${ir.tools.length}`,
      `  deny rules: ${ir.denyRules.length}`,
      ...(outPath !== undefined ? [`  written to: ${resolvePath(outPath)}`] : []),
    ],
  );
  return 0;
}

async function computeWorkspaceAnchor(
  files: readonly PolicyExtractFile[],
): Promise<LKGFingerprint> {
  const { createHash } = await import('node:crypto');
  const h = createHash('sha256');
  let bytes = 0;
  for (const f of files) {
    h.update(f.relPath);
    h.update('\0');
    h.update(f.raw);
    bytes += f.raw.length;
  }
  return {
    hash: h.digest('hex'),
    bytes,
    observedAt: new Date().toISOString(),
  };
}

// ── Subcommand: check ───────────────────────────────────────────────────

async function runCmdCheck(
  argv: readonly string[],
  out: OutputContext,
): Promise<number> {
  const positional = argv.filter((a) => !a.startsWith('-'));
  const path = positional[0];
  if (path === undefined) {
    emitError(out, 'check: <policy-ir-path> required', 'ERR_USAGE');
    return 2;
  }
  let raw: string;
  try {
    raw = await fs.readFile(resolvePath(path), 'utf-8');
  } catch (err) {
    emitError(out, `read failed: ${err instanceof Error ? err.message : String(err)}`, 'ERR_IO');
    return 2;
  }
  let ir: PolicyIR;
  try {
    ir = JSON.parse(raw) as PolicyIR;
  } catch (err) {
    emitError(out, `parse failed: ${err instanceof Error ? err.message : String(err)}`, 'ERR_PARSE');
    return 2;
  }
  const { policyId: claimed, ...body } = ir;
  const recomputed = computePolicyId(body);
  const ok = claimed === recomputed;
  emit(
    out,
    {
      ok,
      path: resolvePath(path),
      claimedPolicyId: claimed,
      recomputedPolicyId: recomputed,
      ...(ok ? {} : { tampered: true }),
    },
    ok
      ? [`openclaw-policy check: ${path}  policyId=${claimed}  ✓`]
      : [
          `openclaw-policy check: ${path}  TAMPERED`,
          `  claimed:    ${claimed}`,
          `  recomputed: ${recomputed}`,
        ],
  );
  return ok ? 0 : 1;
}

// ── Subcommand: diff ────────────────────────────────────────────────────

async function runCmdDiff(
  argv: readonly string[],
  out: OutputContext,
): Promise<number> {
  const positional = argv.filter((a) => !a.startsWith('-'));
  if (positional.length < 2) {
    emitError(out, 'diff: <a.json> <b.json> required', 'ERR_USAGE');
    return 2;
  }
  const a = JSON.parse(await fs.readFile(resolvePath(positional[0]!), 'utf-8')) as PolicyIR;
  const b = JSON.parse(await fs.readFile(resolvePath(positional[1]!), 'utf-8')) as PolicyIR;
  const diff = computePolicyDiff(a, b);
  emit(
    out,
    {
      ok: true,
      a: { policyId: a.policyId, generatedAt: a.generatedAt },
      b: { policyId: b.policyId, generatedAt: b.generatedAt },
      changed: diff.changed,
      tools: diff.tools,
      denyRules: diff.denyRules,
    },
    [
      `openclaw-policy diff`,
      `  a: ${a.policyId} (${a.generatedAt})`,
      `  b: ${b.policyId} (${b.generatedAt})`,
      diff.changed ? '  changes:' : '  no changes',
      ...(diff.tools.added.length > 0 ? [`    + tools: ${diff.tools.added.join(', ')}`] : []),
      ...(diff.tools.removed.length > 0 ? [`    - tools: ${diff.tools.removed.join(', ')}`] : []),
      ...(diff.tools.modified.length > 0 ? [`    ~ tools: ${diff.tools.modified.join(', ')}`] : []),
      ...(diff.denyRules.added.length > 0 ? [`    + deny: ${diff.denyRules.added.join(', ')}`] : []),
      ...(diff.denyRules.removed.length > 0 ? [`    - deny: ${diff.denyRules.removed.join(', ')}`] : []),
      ...(diff.denyRules.modified.length > 0 ? [`    ~ deny: ${diff.denyRules.modified.join(', ')}`] : []),
    ],
  );
  return 0;
}

interface PolicyDiff {
  readonly changed: boolean;
  readonly tools: { added: string[]; removed: string[]; modified: string[] };
  readonly denyRules: { added: string[]; removed: string[]; modified: string[] };
}

function computePolicyDiff(a: PolicyIR, b: PolicyIR): PolicyDiff {
  const diff = (
    arr1: readonly { id: string }[],
    arr2: readonly { id: string }[],
  ): { added: string[]; removed: string[]; modified: string[] } => {
    const m1 = new Map(arr1.map((x) => [x.id, x]));
    const m2 = new Map(arr2.map((x) => [x.id, x]));
    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    for (const id of m2.keys()) {
      const before = m1.get(id);
      if (before === undefined) added.push(id);
      else if (JSON.stringify(before) !== JSON.stringify(m2.get(id))) modified.push(id);
    }
    for (const id of m1.keys()) {
      if (!m2.has(id)) removed.push(id);
    }
    return { added, removed, modified };
  };
  const tools = diff(a.tools, b.tools);
  const denyRules = diff(a.denyRules, b.denyRules);
  const changed =
    tools.added.length + tools.removed.length + tools.modified.length +
    denyRules.added.length + denyRules.removed.length + denyRules.modified.length > 0;
  return { changed, tools, denyRules };
}

// ── Subcommand: evaluate ────────────────────────────────────────────────

async function runCmdEvaluate(
  argv: readonly string[],
  out: OutputContext,
): Promise<number> {
  const positional = argv.filter((a) => !a.startsWith('-'));
  const irPath = positional[0];
  const toolId = positional[1];
  if (irPath === undefined || toolId === undefined) {
    emitError(out, 'evaluate: <policy-ir-path> <tool-id> required', 'ERR_USAGE');
    return 2;
  }
  const argsFlag = pickFlag(argv, '--args');
  let args: Record<string, unknown> | undefined;
  if (argsFlag !== undefined) {
    try {
      args = JSON.parse(argsFlag) as Record<string, unknown>;
    } catch (err) {
      emitError(out, `--args must be valid JSON: ${err instanceof Error ? err.message : String(err)}`, 'ERR_PARSE');
      return 2;
    }
  }
  const ir = JSON.parse(await fs.readFile(resolvePath(irPath), 'utf-8')) as PolicyIR;
  const call: ToolCallInput = args !== undefined ? { toolId, args } : { toolId };
  const decision = evaluateDecision(ir, call);
  emit(
    out,
    {
      ok: true,
      toolId,
      policyId: ir.policyId,
      decision,
    },
    [
      `openclaw-policy evaluate ${toolId}`,
      `  policyId: ${ir.policyId}`,
      `  decision: ${decision.kind}${decision.kind === 'deny' || decision.kind === 'requires-approval' ? ` — ${decision.reason}` : ''}`,
    ],
  );
  return 0;
}

// ── Subcommand: list-generators ─────────────────────────────────────────

async function runCmdListGenerators(
  _argv: readonly string[],
  out: OutputContext,
): Promise<number> {
  const generators = listPolicyGenerators();
  emit(
    out,
    {
      ok: true,
      count: generators.length,
      generators: generators.map((g) => ({
        id: g.id,
        description: g.description,
        sdkVersion: g.requires?.sdkVersion ?? null,
      })),
    },
    [
      `openclaw-policy: ${generators.length} registered generator(s)`,
      ...generators.map((g) => `  ${g.id}  ${g.description}`),
    ],
  );
  return 0;
}

// ── Help ────────────────────────────────────────────────────────────────

function printHelp(out: OutputContext): void {
  if (out.mode === 'json') {
    out.stdout.write(
      JSON.stringify({
        bin: 'openclaw-policy',
        usage: 'openclaw-policy <subcommand> [args]',
        subcommands: ['generate', 'check', 'diff', 'evaluate', 'list-generators', 'help'],
      }) + '\n',
    );
    return;
  }
  out.stdout.write(
    [
      'openclaw-policy — generate + verify + evaluate PolicyIR',
      '',
      'Usage:',
      '  openclaw-policy generate <workspace-dir> [--generator <id>] [--out <path>]',
      '      Walk the workspace, dispatch to the registered generator, emit PolicyIR.',
      '  openclaw-policy check <policy-ir.json>',
      '      Verify policyId hash matches the IR body. Exit 1 on tamper.',
      '  openclaw-policy diff <a.json> <b.json>',
      '      Semantic diff: added/removed/changed tools and deny rules.',
      '  openclaw-policy evaluate <policy-ir.json> <tool-id> [--args <json>]',
      '      Compute Decision (allow / deny / requires-approval / params).',
      '  openclaw-policy list-generators',
      '      Print registered generators (id + description).',
      '  openclaw-policy help',
      '',
      'Exit codes:',
      '  0  success',
      '  1  policy violation (tampered IR, denied call, mismatched hash)',
      '  2  argument / parse / I/O error',
      '',
    ].join('\n'),
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function pickFlag(argv: readonly string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  return argv[idx + 1];
}

// ── Dispatch ────────────────────────────────────────────────────────────

export async function runCli(argv: readonly string[]): Promise<number> {
  const out = makeOutput(argv);
  // Strip global flags before subcommand dispatch.
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
      case 'generate':
        return await runCmdGenerate(rest, out);
      case 'check':
        return await runCmdCheck(rest, out);
      case 'diff':
        return await runCmdDiff(rest, out);
      case 'evaluate':
        return await runCmdEvaluate(rest, out);
      case 'list-generators':
        return await runCmdListGenerators(rest, out);
      default:
        emitError(out, `unknown subcommand: ${subcmd}. Try "openclaw-policy help".`, 'ERR_UNKNOWN_SUBCOMMAND');
        return 2;
    }
  } catch (err) {
    emitError(out, err instanceof Error ? err.message : String(err), 'ERR_INTERNAL');
    return 2;
  }
}
