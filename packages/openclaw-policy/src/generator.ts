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

import { watchWorkspace } from '@bic/openclaw-workspace/staging';
import type { WorkspaceWatcherFactory } from '@bic/openclaw-workspace/staging';

import { canonicalize, computePolicyId, CANONICALIZER_VERSION } from './compile/canonicalize.js';
import { analyze } from './compile/analyze.js';
import { emitV2PolicyIR } from './emit/emit-v2-policy-ir.js';
import { emitPluginCode, DEFAULT_SCOPE_PREFIX } from './emit/emit-plugin.js';
import { emitAuditManifest } from './emit/emit-audit-manifest.js';
import { fsGenerate, type FsGenerateDeps } from './fs-pipeline.js';
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
  /**
   * Override clock for deterministic emit. Used by byte-parity / scope-
   * parity tests and any caller that needs reproducible bytes from the
   * same logical inputs. Defaults to `() => new Date()`.
   */
  now?: () => Date;
}

export interface InMemoryArtifacts {
  /** Rich claws-internal IR (with R0–R5 tiers, soul/agents/governance richness). */
  ir: PolicyIR;
  /**
   * V2 (upstream-shaped) PolicyIR JSON — what gets written to
   * `<snapshot>/.openclaw/policy/policy-ir.json`. R5-lowered: tier
   * semantics encoded as explicit `denyRules` so non-claws guardrails
   * enforce them without tier awareness. See `emit/lower.ts`.
   *
   * Claws-side tooling that needs the rich shape uses `ir` directly
   * (the structured object) rather than re-serializing.
   */
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
  // `sha256-deferred` is the carry-through placeholder snapshot id used
  // until the gateway-side capture call binds the real snapshot. The
  // emitted policy-ir.json carries this in `generatedFrom` and gets
  // rewritten on actual capture. See policy-pre-rfc § "Snapshot anchor".
  const placeholderSnap = 'sha256-deferred';
  const emitOpts = input.now !== undefined ? { now: input.now } : {};
  return {
    ir,
    policyIr: emitV2PolicyIR(ir, placeholderSnap, emitOpts),
    gatewayPlugin: emitPluginCode({ ir, snapshotId: placeholderSnap, scopePrefix }),
    auditManifest: emitAuditManifest(ir, placeholderSnap),
  };
}

export async function generate(
  opts: GenerateOptions,
  deps: FsGenerateDeps = {},
): Promise<GenerateResult> {
  return fsGenerate(opts, deps);
}

export function check(ir: PolicyIR): CheckResult {
  const { ok, diagnostics } = analyze(ir);
  return { ok, diagnostics };
}

export interface WatchOptions extends GenerateOptions {
  /** Debounce between filesystem events, milliseconds. Default 300ms. */
  readonly debounceMs?: number;
  /** Called on each triggered re-generate with the fresh result. */
  readonly onChange?: (result: GenerateResult) => void | Promise<void>;
  /**
   * Optional fs-watcher factory for tests. Defaults to the workspace
   * package's `node:fs.watch`-backed default.
   */
  readonly watcherFactory?: WatcherFactory;
}

/**
 * Policy-side alias of the workspace-owned factory type. Consumers get
 * a stable name without importing `@bic/openclaw-workspace` directly.
 */
export type WatcherFactory = WorkspaceWatcherFactory;

/**
 * Arm a continuous re-generate against a workspace.
 *
 * Filesystem watching itself lives in `@bic/openclaw-workspace/staging`
 * (`watchWorkspace`). Policy only owns the generate-after-change
 * semantics: when the workspace emits a debounced change event, run
 * `fsGenerate` and invoke `onChange` with the result.
 *
 * Tests can inject a synthetic `watcherFactory` to fire events
 * deterministically without relying on real fs notifications.
 */
export function watch(opts: WatchOptions): WatchHandle {
  let closed = false;

  const workspaceOptions: Parameters<typeof watchWorkspace>[1] = {
    onChange: async () => {
      if (closed) return;
      const result = await fsGenerate(opts);
      if (closed) return;
      if (opts.onChange !== undefined) {
        await opts.onChange(result);
      }
    },
  };
  if (opts.debounceMs !== undefined) {
    (workspaceOptions as { debounceMs?: number }).debounceMs = opts.debounceMs;
  }
  if (opts.watcherFactory !== undefined) {
    (workspaceOptions as { watcherFactory?: WatcherFactory }).watcherFactory = opts.watcherFactory;
  }

  const handle = watchWorkspace(opts.workspaceRoot, workspaceOptions);

  return {
    async close() {
      closed = true;
      await handle.close();
    },
  };
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
