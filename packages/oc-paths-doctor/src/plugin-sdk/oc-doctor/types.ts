/**
 * `@openclaw/oc-doctor` SDK types.
 *
 * **Strategic frame**: NO new SDK verb. We wrap an OcPath-aware fixer
 * into upstream's existing `registerDoctorHealthContribution` slot at
 * `src/flows/doctor-health.ts`. The adapter helper is the only new
 * public surface.
 *
 * **One fixer shape across all kinds**. Fixers consume the universal
 * `OcAst` and use `resolveOcPath` / `setOcPath` to inspect + mutate.
 * Kind-bound fixers narrow on `ast.kind` inside `detect()` /
 * `fix()` — TypeScript's discriminator narrowing is ergonomic.
 *
 * @module @openclaw/oc-doctor
 */

import type { OcAst, OcPath, OcPathMatch } from '@bic/oc-paths-substrate';

/**
 * A file the doctor flow has loaded — universal shape regardless of
 * kind. Filename + path + raw bytes + parsed AST.
 */
export interface DoctorFile {
  readonly name: string;
  readonly path: string;
  readonly raw: string;
  readonly ast: OcAst;
}

/**
 * Context passed to detect/fix.
 */
export interface DoctorContext {
  readonly workspaceDir: string;
  readonly files: readonly DoctorFile[];
  /**
   * Per-fixer-id options that override the fixer's defaults. Adapter
   * merges this over `spec.defaultOptions` before calling fix.
   */
  readonly fixerOptions?: Readonly<Record<string, Readonly<Record<string, unknown>>>>;
  /**
   * Optional cancellation signal. Adapter checks `signal.aborted`
   * between files in `detect()` and bails out of `fix()` before the
   * file write if aborted. Host-supplied; tests can omit.
   */
  readonly signal?: AbortSignal;
  /**
   * Host-supplied async writer. Tests + non-FS hosts can stub this
   * without filesystem access. The host is responsible for atomic
   * rename / sentinel-guard / LKG observe semantics around the write.
   */
  writeFile(path: string, contents: string): Promise<void>;
}

/**
 * A finding produced by `detect()`.
 *
 * `match` is the typed result the `detect()` produced — `path: OcPath`
 * (concrete address) plus `match: OcMatch` (kind / line / leafType /
 * descriptor). `ocPath` and `line` are convenience pulls for display
 * consumers; the typed `match` is what `fix()` receives.
 */
export interface DoctorFinding {
  readonly contributionId: string;
  readonly severity: 'info' | 'warning' | 'error';
  readonly fileName: string;
  readonly filePath: string;
  readonly message: string;
  /** Convenience string form of `match.path` (formatOcPath result). */
  readonly ocPath: string;
  /** Convenience pull of `match.match.line`. */
  readonly line: number;
  /** Typed match — passed to `fix()` so it doesn't need to re-resolve. */
  readonly match: OcPathMatch;
  readonly fixHint?: string;
}

export type DoctorFixResult =
  | { readonly outcome: 'fixed'; readonly path: string }
  | { readonly outcome: 'skipped'; readonly reason: string }
  | { readonly outcome: 'failed'; readonly reason: string };

/**
 * The contract upstream's `registerDoctorHealthContribution` accepts.
 */
export interface DoctorHealthContribution {
  readonly id: string;
  readonly description: string;
  detect(ctx: DoctorContext): Promise<readonly DoctorFinding[]>;
  fix(ctx: DoctorContext, finding: DoctorFinding): Promise<DoctorFixResult>;
}

// ---------- OcPath fixer spec (the input to the adapter) ------------------

/**
 * Default options for fixers that don't declare their own.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type DefaultFixerOptions = Record<string, never>;

/**
 * What a plugin author writes to introduce a new OcPath-aware fixer.
 * Adapter wraps this into a `DoctorHealthContribution`.
 *
 * **Idempotency contract**: `fix()` MUST be idempotent. Running fix
 * twice produces the same bytes as running it once.
 *
 * **Additive-by-default**: starter fixers should ADD missing
 * structure rather than DELETE existing content. Destructive fixes
 * require explicit user confirmation.
 *
 * **Universal AST**: detect/fix consume `OcAst`. Use `resolveOcPath`
 * / `setOcPath` from the substrate. For kind-specific traversal,
 * narrow on `ast.kind`.
 */
export interface OcPathFixerSpec<TOptions = DefaultFixerOptions> {
  /** Stable id, prefixed with the fixer pack namespace. */
  readonly id: string;
  /** Human-readable description (surfaces in `openclaw doctor`). */
  readonly description: string;
  /** Severity carried into the `DoctorFinding`. */
  readonly severity: 'info' | 'warning' | 'error';
  /**
   * Filename glob (`*.jsonc`, `gateway.*`) or exact filename
   * (`AGENTS.md`) or `'*'`.
   */
  readonly appliesTo: string;
  /** Default options applied when caller doesn't override at invocation. */
  readonly defaultOptions?: TOptions;
  /**
   * SDK-version compatibility hint. Plugins authored against a known
   * SDK version declare it here; the registrar warns on mismatch with
   * the host's `SDK_VERSION`. Optional — omitting it means "trust the
   * host," which is the right default for in-tree starter packs.
   */
  readonly requires?: {
    readonly sdkVersion: string;
  };
  /**
   * Inspect an AST + raw bytes; for each issue, return a typed
   * `OcPathMatch` (path + match-with-line/leafType) along with a
   * human-readable message and optional fix hint.
   *
   * Empty result = no fix needed. Each entry becomes one
   * `DoctorFinding` and one `fix()` invocation.
   */
  detect(input: { fileName: string; ast: OcAst; raw: string }): readonly DoctorDetectResult[];
  /**
   * Given the current bytes and the typed `OcPathMatch` produced by
   * `detect()`, produce new bytes that resolve the issue. MUST be
   * idempotent. The match carries the resolved path, the matched node
   * kind / leaf text / line — `fix()` doesn't need to re-resolve.
   *
   * `options` is `defaultOptions` merged with any caller override
   * supplied via `ctx.fixerOptions[spec.id]`.
   *
   * **Fan-out semantic**: one `fix()` call per match. The runner
   * iterates over every detect result and invokes `fix()` once each.
   * Fixers MUST handle a single match — not the whole match list.
   */
  fix(input: {
    fileName: string;
    ast: OcAst;
    raw: string;
    match: OcPathMatch;
    options?: TOptions;
  }): string;
}

/**
 * Output of `OcPathFixerSpec.detect()` — one entry per issue found.
 * Each entry carries the typed `OcPathMatch` (path + match) the
 * adapter packages into a `DoctorFinding`. `line` and `ocPath` on the
 * finding are derived from the match — fixers don't supply them
 * separately.
 */
export interface DoctorDetectResult {
  readonly match: OcPathMatch;
  readonly message: string;
  readonly fixHint?: string;
}

// Re-export OcPath for downstream type imports.
export type { OcPath };
