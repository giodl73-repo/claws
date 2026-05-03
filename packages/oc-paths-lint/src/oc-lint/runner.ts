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

  for (const file of opts.files) {
    for (const rule of opts.rules) {
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
 * Minimal filename glob: `*` matches any chars, plain literals match
 * exact. Sufficient for `*.jsonc`, `gateway.*`, `AGENTS.md`, etc.
 */
function matchGlob(glob: string, name: string): boolean {
  if (glob === name) return true;
  const re = new RegExp(
    '^' + glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$',
  );
  return re.test(name);
}
