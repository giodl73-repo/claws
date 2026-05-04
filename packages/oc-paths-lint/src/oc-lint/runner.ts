/**
 * Lint runner — walks files, dispatches rules, collects diagnostics.
 *
 * **Pure function**: no I/O, no mutation. The host loads files via the
 * substrate's per-kind parsers (`parseMd`, `parseJsonc`, `parseJsonl`)
 * and passes ASTs here. The runner doesn't care about kind — it only
 * checks `appliesTo` glob match.
 *
 * @module oc-lint/runner
 */

import type { OcAst } from '@bic/oc-paths-substrate';
import type {
  Diagnostic,
  LintRule,
} from '../plugin-sdk/oc-lint/types.js';

/**
 * One file the runner has been handed: name + parsed AST (any kind).
 */
export interface LintFile {
  readonly name: string;
  readonly ast: OcAst;
}

export interface LintRunOptions {
  readonly rules: readonly LintRule[];
  readonly files: readonly LintFile[];
  /**
   * Optional cancellation signal. The runner checks `signal.aborted`
   * between files and between rules; on abort it returns the partial
   * results collected so far. The pure check() functions themselves
   * are not interrupted mid-call (they're synchronous and short).
   */
  readonly signal?: AbortSignal;
  /**
   * Runtime kill switch — rule ids in this set are skipped even if
   * registered. Lets operators silence noisy rules without unregistering
   * (e.g., per-CI-pipeline opt-out, per-PR exception). The skip is
   * silent: stats still report 0 invocations rather than recording a
   * "disabled" state, so downstream tooling sees the rule "didn't
   * fire" — same shape as no-applicable-files.
   */
  readonly disabledRuleIds?: ReadonlySet<string> | readonly string[];
}

/**
 * Thrown when the lint run is aborted via the `signal`. Carries the
 * partial result so callers can inspect what was collected before
 * cancellation.
 */
export class LintAbortedError extends Error {
  readonly code = 'OC_LINT_ABORTED';
  readonly partial: LintRunResult;
  constructor(partial: LintRunResult) {
    super('lint run aborted via signal');
    this.name = 'LintAbortedError';
    this.partial = partial;
  }
}

export interface LintRunResult {
  readonly diagnostics: readonly Diagnostic[];
  /**
   * For observability + test assertions: how many rule invocations
   * happened, indexed by rule id.
   */
  readonly stats: ReadonlyMap<string, number>;
}

/**
 * Run all rules against all files. Rules whose `appliesTo` doesn't
 * match a file are skipped for that file. Diagnostics from one rule
 * never affect another rule's input — `runLint` is non-mutating.
 *
 * Output ordering is deterministic: outer loop = files in input order;
 * inner loop = rules in input order; per-rule findings preserve the
 * order returned by `check()`.
 */
export function runLint(opts: LintRunOptions): LintRunResult {
  const diagnostics: Diagnostic[] = [];
  const stats = new Map<string, number>();
  for (const rule of opts.rules) {
    stats.set(rule.id, 0);
  }

  // Normalize disabledRuleIds to a Set for O(1) lookup.
  const disabled =
    opts.disabledRuleIds instanceof Set
      ? opts.disabledRuleIds
      : opts.disabledRuleIds !== undefined
        ? new Set<string>(opts.disabledRuleIds)
        : null;

  for (const file of opts.files) {
    if (opts.signal?.aborted) {
      throw new LintAbortedError({ diagnostics, stats });
    }
    for (const rule of opts.rules) {
      if (opts.signal?.aborted) {
        throw new LintAbortedError({ diagnostics, stats });
      }
      if (disabled !== null && disabled.has(rule.id)) {
        continue;
      }
      if (rule.appliesTo !== '*' && !matchGlob(rule.appliesTo, file.name)) {
        continue;
      }
      let findings;
      try {
        findings = rule.check({ fileName: file.name, ast: file.ast });
      } catch (err) {
        // Rule threw — there's no per-finding line to attribute, so
        // anchor the synthetic diagnostic at the file head.
        diagnostics.push({
          ruleId: rule.id,
          severity: rule.severity,
          fileName: file.name,
          message: `lint rule threw: ${err instanceof Error ? err.message : String(err)}`,
          ocPath: `oc://${file.name}`,
          line: 1,
        });
        stats.set(rule.id, (stats.get(rule.id) ?? 0) + 1);
        continue;
      }
      stats.set(rule.id, (stats.get(rule.id) ?? 0) + 1);
      for (const f of findings) {
        diagnostics.push({
          ruleId: rule.id,
          severity: rule.severity,
          fileName: file.name,
          message: f.message,
          ocPath: f.ocPath,
          line: f.line,
          ...(f.fixHint !== undefined ? { fixHint: f.fixHint } : {}),
        });
      }
    }
  }

  return { diagnostics, stats };
}

/**
 * Filename glob with `*` (any chars) and `{a,b,c}` (alternation)
 * support. Sufficient for `*.jsonc`, `gateway.*`, `AGENTS.md`,
 * `{gateway,openclaw}*.jsonc`, etc. No `?`, no character classes —
 * the upstream OcPath addressing layer already covers that scope.
 */
function matchGlob(glob: string, name: string): boolean {
  if (glob === name) return true;
  // Order matters: escape regex specials EXCEPT `*` and `{}` first,
  // then expand `{a,b,c}` → `(?:a|b|c)`, then `*` → `.*`.
  let pattern = glob.replace(/[.+^$()|[\]\\]/g, '\\$&');
  pattern = pattern.replace(/\{([^{}]+)\}/g, (_m, body: string) => {
    const alts = body.split(',').map((s) => s.trim());
    return `(?:${alts.join('|')})`;
  });
  pattern = pattern.replace(/\*/g, '.*');
  const re = new RegExp('^' + pattern + '$');
  return re.test(name);
}
