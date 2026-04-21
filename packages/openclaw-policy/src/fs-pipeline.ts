/**
 * Filesystem-backed implementation of `generate()` — reads SOUL.md,
 * TOOLS.md, AGENTS.md from a workspace root, extracts PolicyIR, and
 * writes the three artifacts (`policy-ir.json`, `gateway-plugin.ts`,
 * `audit-manifest.json`) to `.openclaw/policy/`.
 *
 * Design:
 *  - Missing workspace files produce `info`/`warning` diagnostics but do
 *    NOT abort the generate. A minimal-but-valid PolicyIR is always
 *    emitted so `verify` round-trips, matching CL-07's "default-allow"
 *    posture on empty workspaces.
 *  - `analyze` is run; `error`-severity diagnostics from governance make
 *    the whole generate fail (caller decides via `strict`).
 *  - The audit-manifest is a real hash-chain (see `emit-audit-chain.ts`)
 *    so `verify --manifest audit-manifest.json` round-trips.
 *
 * @module @bic/openclaw-policy/fs-pipeline
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { WorkspaceFileKind } from '@bic/openclaw-workspace/ast';

import { analyze } from './compile/analyze.js';
import { CANONICALIZER_VERSION, computePolicyId } from './compile/canonicalize.js';
import { extractDenyRules, extractTools } from './compile/extract.js';
import { parseWorkspaceFile } from './compile/parse.js';
import {
  emitAuditChain,
  serializeAuditChain,
} from './emit/emit-audit-chain.js';
import { DEFAULT_SCOPE_PREFIX, emitPluginCode } from './emit/emit-plugin.js';

type ScopePrefix = '@openclaw' | '@bic/openclaw';
import { emitPolicyIR } from './emit/emit-policy-ir.js';
import type {
  Diagnostic,
  GenerateOptions,
  GenerateResult,
  PolicyIR,
} from './types/index.js';

interface WorkspaceFileSpec {
  readonly kind: WorkspaceFileKind;
  readonly relPath: string;
  readonly required: boolean;
}

const WORKSPACE_FILES: readonly WorkspaceFileSpec[] = [
  { kind: 'soul', relPath: 'SOUL.md', required: false },
  { kind: 'tools', relPath: 'TOOLS.md', required: false },
  { kind: 'agents', relPath: 'AGENTS.md', required: false },
];

const ARTIFACTS_DIR = join('.openclaw', 'policy');

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

  // 1. Discover + parse workspace files.
  const parsed = await loadWorkspaceFiles(opts.workspaceRoot, diagnostics);

  // 2. Extract the draft IR pieces.
  const soulParsed = parsed.find((p) => p.kind === 'soul');
  const toolsParsed = parsed.find((p) => p.kind === 'tools');

  const denyRules = soulParsed !== undefined ? extractDenyRules(soulParsed) : [];
  const tools = toolsParsed !== undefined ? extractTools(toolsParsed) : [];

  // 3. Build a minimal PolicyIR. Missing inputs yield safe defaults so the
  //    generate round-trip always produces a valid IR — governance error
  //    diagnostics surface via analyze, not via crashes.
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
  const policyId = computePolicyId(baselineIR);
  const ir: PolicyIR = { ...baselineIR, policyId };

  // 4. Analyze — surface governance errors but do not throw; the handler
  //    decides whether to return non-zero.
  const analyzed = analyze(ir);
  diagnostics.push(...analyzed.diagnostics);

  if (opts.strict === true) {
    const hasError = analyzed.diagnostics.some((d) => d.severity === 'error');
    if (hasError) {
      return { workspaceRoot: opts.workspaceRoot, writtenFiles: [], diagnostics };
    }
  }

  // 5. Emit and write the three artifacts atomically enough for smoke
  //    gates: mkdir -p + writeFile each. We don't fsync / temp-rename here
  //    because the caller is either a human CLI invocation or a test.
  const outDir = join(opts.workspaceRoot, ARTIFACTS_DIR);
  await mkdir(outDir, { recursive: true });

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

  const writes: ReadonlyArray<{ relPath: string; body: string }> = [
    { relPath: 'policy-ir.json', body: policyIrJson },
    { relPath: 'gateway-plugin.ts', body: gatewayPluginTs },
    { relPath: 'audit-manifest.json', body: auditManifestJson },
  ];

  const writtenFiles: string[] = [];
  for (const w of writes) {
    const absPath = join(outDir, w.relPath);
    await writeFile(absPath, w.body, 'utf8');
    writtenFiles.push(absPath);
  }

  return { workspaceRoot: opts.workspaceRoot, writtenFiles, diagnostics };
}

async function loadWorkspaceFiles(
  workspaceRoot: string,
  diagnostics: Diagnostic[],
): Promise<ReturnType<typeof parseWorkspaceFile>[]> {
  const out: ReturnType<typeof parseWorkspaceFile>[] = [];
  for (const spec of WORKSPACE_FILES) {
    const path = join(workspaceRoot, spec.relPath);
    let raw: string;
    try {
      raw = await readFile(path, 'utf8');
    } catch {
      diagnostics.push({
        code: 'OC-POLICY-I-MISSING-FILE',
        severity: spec.required ? 'error' : 'info',
        message: `workspace file not found: ${spec.relPath} (using defaults)`,
        path,
      });
      continue;
    }
    const parsed = parseWorkspaceFile(spec.kind, path, raw);
    diagnostics.push(...parsed.diagnostics);
    out.push(parsed);
  }
  return out;
}

function sha256Hex(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}
