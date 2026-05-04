/**
 * Filesystem-backed implementation of `generate()` — discovers workspace
 * files via `@bic/openclaw-workspace/staging`, extracts PolicyIR, and
 * writes the three artifacts (`policy-ir.json`, `gateway-plugin.ts`,
 * `audit-manifest.json`) to `.openclaw/policy/`.
 *
 * Package boundaries (per the 47.5.5 guardrail):
 *  - `@bic/openclaw-workspace/staging` owns fs discovery + stage-aware
 *    reads + classification + parsing. This package MUST NOT import
 *    from `node:fs` / `node:fs/promises` directly; use the workspace
 *    helpers so `.stage/` precedence + hidden-dir skip + kind
 *    classification stay in one place.
 *  - `@bic/openclaw-policy` owns the semantic pipeline: extract drafts
 *    from ASTs, analyze, emit 3 artifacts. Writes go through
 *    `writeSnapshotFiles` (atomic tmp+rename).
 *
 * Behavior:
 *  - Missing workspace files produce `info`-severity diagnostics but do
 *    not abort the generate. A minimal-but-valid PolicyIR is always
 *    emitted so `verify` round-trips on empty workspaces.
 *  - Governance `error` diagnostics from `analyze` short-circuit the
 *    emit only when `strict: true`.
 *  - The audit-manifest is a real hash-chain (see `emit-audit-chain.ts`)
 *    so `verify --manifest audit-manifest.json` round-trips.
 *
 * @module @bic/openclaw-policy/fs-pipeline
 */

import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { discoverWorkspaceFiles, writeSnapshotFiles } from '@bic/openclaw-workspace/staging';
import type { DiscoveredWorkspaceFile } from '@bic/openclaw-workspace/staging';

import { analyze } from './compile/analyze.js';
import { CANONICALIZER_VERSION, computePolicyId } from './compile/canonicalize.js';
import { extractDenyRules, extractTools } from './compile/extract.js';
import { parseWorkspaceFile } from './compile/parse.js';
import type { ParsedFile, WorkspaceFileKind } from './compile/parse.js';
import {
  emitAuditChain,
  serializeAuditChain,
} from './emit/emit-audit-chain.js';
import { DEFAULT_SCOPE_PREFIX, emitPluginCode } from './emit/emit-plugin.js';
import { emitPolicyIR } from './emit/emit-policy-ir.js';
import type { R5FailOpenDiagnostic } from './generator/diagnostics.js';
import { validateR5FailOpen } from './generator/validators/r5-fail-open.js';
import type {
  Diagnostic,
  GenerateOptions,
  GenerateResult,
  PolicyIR,
} from './types/index.js';

type ScopePrefix = '@openclaw' | '@bic/openclaw';

const ARTIFACTS_RELATIVE = '.openclaw/policy';

const REQUIRED_FOR_POLICY = ['soul', 'tools', 'agents'] as const;

export interface FsGenerateDeps {
  readonly hmacKey?: Buffer;
  readonly scope?: ScopePrefix;
  readonly now?: () => Date;
}

export async function fsGenerate(
  opts: GenerateOptions,
  deps: FsGenerateDeps = {},
): Promise<GenerateResult> {
  const diagnostics: Diagnostic[] = [];
  const scope = deps.scope ?? DEFAULT_SCOPE_PREFIX;

  // 1. Discover + parse workspace files via the workspace package.
  //    Policy never touches fs itself.
  const { files } = await discoverWorkspaceFiles(opts.workspaceRoot);

  // Adapt workspace's DiscoveredWorkspaceFile into policy's ParsedFile
  // so the existing extract functions keep their typed contract.
  const parsed: ParsedFile[] = files
    .map(adaptDiscovered)
    .filter((f): f is ParsedFile => f !== null);

  for (const p of parsed) {
    for (const d of p.diagnostics) diagnostics.push(d);
  }

  // Surface an info diagnostic for each well-known policy input that
  // was absent from discovery. This preserves the pulse 47.5.5 promise
  // that empty workspaces still round-trip.
  for (const kind of REQUIRED_FOR_POLICY) {
    if (!parsed.some((p) => p.kind === kind)) {
      diagnostics.push({
        code: 'OC-POLICY-I-MISSING-FILE',
        severity: 'info',
        message: `no ${kind.toUpperCase()} file discovered at workspace root (using defaults)`,
      });
    }
  }

  // 2. Extract draft IR pieces.
  const soulParsed = parsed.find((p): p is ParsedFile => p.kind === 'soul');
  const toolsParsed = parsed.find((p): p is ParsedFile => p.kind === 'tools');
  const denyRules = soulParsed !== undefined ? extractDenyRules(soulParsed) : [];
  const tools = toolsParsed !== undefined ? extractTools(toolsParsed) : [];

  // 3. Build a minimal PolicyIR + stamp policyId.
  const baselineIR: PolicyIR = {
    version: '0.1.0',
    policyId: '',
    canonicalizerVersion: CANONICALIZER_VERSION,
    soul: {
      denyRules,
      modelAllowlist: [],
      tone: '',
    },
    user: {
      oboScope: [],
      authorityBounds: [],
    },
    agents: {
      delegationMap: {},
      architectureBoundaries: [],
    },
    tools,
    skills: [],
    governance: {
      rules: [],
      sensitivityPropagation: [],
      governanceSurface: [],
    },
    identity: { name: 'workspace' },
  };
  const ir: PolicyIR = { ...baselineIR, policyId: computePolicyId(baselineIR) };

  // 4. Analyze. Surface governance diagnostics; `strict` turns errors
  //    into an early return.
  const analyzed = analyze(ir);
  diagnostics.push(...analyzed.diagnostics);
  if (opts.strict === true) {
    const hasError = analyzed.diagnostics.some((d) => d.severity === 'error');
    if (hasError) {
      return { workspaceRoot: opts.workspaceRoot, writtenFiles: [], diagnostics };
    }
  }

  // 4b. Declaration-lowering validators (CP-6 pulse 53). R5 + failOpen is
  //     rejected unconditionally per proposal §1.6 — independent of
  //     `strict`, because the combination violates a compile-time
  //     invariant, not a policy preference. No artifacts are emitted on
  //     failure (SC-07 F-05).
  const generatorDiagnostics: R5FailOpenDiagnostic[] = [];
  for (const tool of ir.tools) {
    const r = validateR5FailOpen(tool);
    if (!r.ok) generatorDiagnostics.push(r.diagnostic);
  }
  if (generatorDiagnostics.length > 0) {
    for (const gd of generatorDiagnostics) {
      diagnostics.push({
        code: 'OC-POLICY-E103',
        severity: 'error',
        message: gd.message,
        path: gd.sourcePath,
        line: gd.line,
        column: gd.column,
      });
    }
    return {
      workspaceRoot: opts.workspaceRoot,
      writtenFiles: [],
      diagnostics,
      generatorDiagnostics: generatorDiagnostics.map((gd) => ({
        kind: gd.kind,
        toolName: gd.toolName,
        sourcePath: gd.sourcePath,
        line: gd.line,
        column: gd.column,
        invalidReason: gd.invalidReason,
        message: gd.message,
      })),
    };
  }

  // 5. Emit the three artifacts and write atomically via workspace.
  // NOTE: this filesystem path still emits the rich (claws-internal) shape
  // to disk — `loadPolicyIRFromSnapshot` and the cli-handlers (check, diff,
  // doctor) are coupled to the rich shape. Switching this to `emitV2PolicyIR`
  // requires reshaping those readers in lockstep. See carve-consumer-catalog.md
  // "Pending v2 cascade through ops/cli-handlers" for the followup. The
  // `generateInMemory` path already emits v2 for tests + the e2e chain; the
  // on-disk artifact at `<workspace>/.openclaw/policy/policy-ir.json` from
  // `claws policy generate` is still rich until that cascade lands.
  const snapshotId = `sha256-${ir.policyId.replace(/^sha256-/, '')}`;

  const policyIrJson = emitPolicyIR(ir);
  const gatewayPluginTs = emitPluginCode({ ir, snapshotId, scopePrefix: scope });

  const artifactHashes = {
    'policy-ir.json': sha256Hex(policyIrJson),
    'gateway-plugin.ts': sha256Hex(gatewayPluginTs),
  } as const;

  const chainOptions: Parameters<typeof emitAuditChain>[0] = {
    ir,
    snapshotId,
    artifactHashes,
    scope,
  };
  if (deps.hmacKey !== undefined) {
    (chainOptions as { hmacKey?: Buffer }).hmacKey = deps.hmacKey;
  }
  if (deps.now !== undefined) {
    (chainOptions as { now?: () => Date }).now = deps.now;
  }
  const manifest = emitAuditChain(chainOptions);
  const auditManifestJson = serializeAuditChain(manifest);

  const emits: Readonly<Record<string, string>> = {
    [`${ARTIFACTS_RELATIVE}/policy-ir.json`]: policyIrJson,
    [`${ARTIFACTS_RELATIVE}/gateway-plugin.ts`]: gatewayPluginTs,
    [`${ARTIFACTS_RELATIVE}/audit-manifest.json`]: auditManifestJson,
  };
  await writeSnapshotFiles(opts.workspaceRoot, emits);

  const writtenFiles = Object.keys(emits).map((rel) =>
    join(opts.workspaceRoot, ...rel.split('/')),
  );

  return { workspaceRoot: opts.workspaceRoot, writtenFiles, diagnostics };
}

/**
 * Map openclaw-workspace's discovery kind (`WorkspaceFileKind` from
 * the OLD substrate, which uses plural / generic names like 'skills',
 * 'config', 'workflows') to policy's singular role discriminator
 * (`'soul' | 'tools' | …`). Returns `null` for kinds policy doesn't
 * extract from (config / workflows / etc. — those flow through
 * separate downstream pipelines).
 */
function mapDiscoveryKind(
  kind: DiscoveredWorkspaceFile['kind'],
): WorkspaceFileKind | null {
  switch (kind) {
    case 'soul':
      return 'soul';
    case 'tools':
      return 'tools';
    case 'agents':
      return 'agents';
    case 'memory':
      return 'memory';
    case 'skills':
      return 'skill';
    case 'bootstrap':
      return 'bootstrap';
    default:
      return null;
  }
}

function adaptDiscovered(file: DiscoveredWorkspaceFile): ParsedFile | null {
  const role = mapDiscoveryKind(file.kind);
  if (role === null) return null;
  // Re-parse through oc-paths so the resulting AST is the universal
  // `MdAst` shape the new compile pipeline expects. The old
  // discovery layer's parser-output is discarded during the migration
  // window; once `discoverWorkspaceFiles` itself moves to the
  // workspace manifest, this re-parse goes away.
  const reparsed = parseWorkspaceFile(role, file.relPath, file.raw);
  return reparsed;
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
