/**
 * Top-level generate/check/watch/diff — the package's public contract.
 *
 * Deliberately small and focused on the deterministic pipeline:
 *   workspace files -> parse -> extract -> analyze -> emit -> write.
 *
 * The in-memory path (`generateInMemory`) is the stable contract; the
 * filesystem-backed `generate` is a scaffold awaiting workspace-file
 * discovery wiring.
 */

import { canonicalize, computePolicyId, CANONICALIZER_VERSION } from './compile/canonicalize.js';
import { analyze } from './compile/analyze.js';
import { emitPolicyIR } from './emit/emit-policy-ir.js';
import { emitPluginCode, DEFAULT_SCOPE_PREFIX } from './emit/emit-plugin.js';
import { emitAuditManifest } from './emit/emit-audit-manifest.js';
import type {
  CheckResult,
  DiffResult,
  GenerateOptions,
  GenerateResult,
  PolicyIR,
  WatchHandle,
} from './types/index.js';

export type ScopePrefix = '@openclaw' | '@bic/openclaw';

export interface InMemoryGenerateInput extends GenerateOptions {
  draft: Omit<PolicyIR, 'policyId' | 'canonicalizerVersion' | 'version'> & {
    version?: string;
  };
  scopePrefix?: ScopePrefix;
}

export interface InMemoryArtifacts {
  ir: PolicyIR;
  policyIr: string;
  gatewayPlugin: string;
  auditManifest: string;
}

export function finalizeIR(
  draft: InMemoryGenerateInput['draft'],
): PolicyIR {
  const baseline: PolicyIR = {
    ...draft,
    version: draft.version ?? '0.1.0',
    policyId: '',
    canonicalizerVersion: CANONICALIZER_VERSION,
  };
  const policyId = computePolicyId(baseline);
  return { ...baseline, policyId };
}

export function generateInMemory(input: InMemoryGenerateInput): InMemoryArtifacts {
  const ir = finalizeIR(input.draft);
  const scopePrefix = input.scopePrefix ?? DEFAULT_SCOPE_PREFIX;
  return {
    ir,
    policyIr: emitPolicyIR(ir),
    gatewayPlugin: emitPluginCode({ ir, snapshotId: 'sha256-deferred', scopePrefix }),
    auditManifest: emitAuditManifest(ir, 'sha256-deferred'),
  };
}

export async function generate(opts: GenerateOptions): Promise<GenerateResult> {
  return {
    workspaceRoot: opts.workspaceRoot,
    writtenFiles: [],
    diagnostics: [
      {
        code: 'OC-POLICY-I001',
        severity: 'info',
        message:
          'generate(): filesystem pipeline is scaffolded; use generateInMemory for draft IR',
      },
    ],
  };
}

export function check(ir: PolicyIR): CheckResult {
  const { ok, diagnostics } = analyze(ir);
  return { ok, diagnostics };
}

export function watch(_opts: GenerateOptions): WatchHandle {
  return { async close() {} };
}

export function diff(a: PolicyIR, b: PolicyIR): DiffResult {
  const changed = canonicalize(a) !== canonicalize(b);
  const aTools = new Set(a.tools.map((t) => t.name));
  const bTools = new Set(b.tools.map((t) => t.name));
  const added = [...bTools].filter((n) => !aTools.has(n));
  const removed = [...aTools].filter((n) => !bTools.has(n));
  const modified: string[] = [];
  for (const t of a.tools) {
    const other = b.tools.find((x) => x.name === t.name);
    if (other && canonicalize(t) !== canonicalize(other)) modified.push(t.name);
  }
  return { from: a.policyId, to: b.policyId, changed, added, removed, modified };
}
