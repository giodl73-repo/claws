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

import { watch as fsWatch } from 'node:fs';

import { canonicalize, computePolicyId, CANONICALIZER_VERSION } from './compile/canonicalize.js';
import { analyze } from './compile/analyze.js';
import { emitPolicyIR } from './emit/emit-policy-ir.js';
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
  /** Called on each triggered re-check. Tests supply a stub. */
  readonly onChange?: (result: GenerateResult) => void | Promise<void>;
  /** Optional fs-watcher factory for tests. Defaults to node:fs `watch`. */
  readonly watcherFactory?: WatcherFactory;
}

export type WatcherFactory = (
  path: string,
  listener: (eventType: string, filename: string | null) => void,
) => { close(): void };

const DEFAULT_DEBOUNCE_MS = 300;

/**
 * Arm a continuous re-generate against a workspace. Each change to a
 * watched workspace file triggers `fsGenerate` and invokes `onChange`
 * with the result.
 *
 * The watcher uses node's built-in `fs.watch` (recursive where supported)
 * rather than pulling in `chokidar`. That keeps the runtime surface tiny;
 * callers that need cross-platform recursive semantics can pass their own
 * `watcherFactory` with chokidar wiring.
 */
export function watch(opts: WatchOptions): WatchHandle {
  const debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const factory = opts.watcherFactory ?? ((path, listener) => fsWatch(path, { recursive: false }, listener));
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const trigger = (): void => {
    if (closed) return;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      if (closed) return;
      void fsGenerate(opts).then((result) => {
        if (closed) return;
        if (opts.onChange !== undefined) {
          void opts.onChange(result);
        }
      });
    }, debounceMs);
  };

  const watcher = factory(opts.workspaceRoot, (_eventType, _filename) => {
    trigger();
  });

  return {
    async close() {
      closed = true;
      if (timer !== undefined) clearTimeout(timer);
      watcher.close();
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
