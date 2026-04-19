/**
 * GET /api/governance — Layer 3 governance summary.
 *
 * Derives a compact, dashboard-friendly summary from the cached
 * GovernanceIR: active rule categories, rule counts, risk distribution
 * across declared tools, fleet policy status, blocked tools, active
 * violations, and last-compile timestamp.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): the handler only shapes the
 * cached IR into the partner-facing response; no business decisions
 * are made here. When no compilation has run, returns 409 with a
 * stable `COMPILATION_REQUIRED` code so partners can drive `/compile`.
 *
 * @module claws-serve/routes/governance
 */

import { Router, type Request, type Response } from 'express';
import type {
  GovernanceIR,
  ToolCapability,
  ToolRiskLevel,
} from '../../../claws-sdk/src/index.js';
import type { CompilationHost } from '../compilation-host.js';
import {
  applyTimeTravelCache,
  resolveReadIR,
  respondCompilationRequired,
} from './ir-resolution.js';

/**
 * Rule category counts — one entry per governance family present in
 * the IR (`G-CLASS`, `G-PERM`, `G-DATA`, `G-A2A`, etc.).
 */
export interface GovernanceRuleCategory {
  readonly category: string;
  readonly ruleCount: number;
}

export interface RiskDistribution {
  readonly critical: number;
  readonly high: number;
  readonly medium: number;
  readonly low: number;
}

export type GovernanceDegradedState = 'clean' | 'stale' | 'error';

export interface ActiveViolationSummary {
  readonly ruleId: string;
  readonly diagnosticCode: string;
  readonly level: number;
  readonly target: string;
  readonly message: string;
}

export interface GovernanceResponse {
  readonly compiledAt: string | null;
  readonly compilerVersion: string;
  readonly ruleCategories: readonly GovernanceRuleCategory[];
  readonly totalRules: number;
  readonly riskDistribution: RiskDistribution;
  readonly blockedTools: readonly string[];
  readonly requiredApprovals: readonly string[];
  readonly fleetPolicy: { readonly available: boolean };
  readonly degradedState: GovernanceDegradedState;
  readonly activeViolations: readonly ActiveViolationSummary[];
}

export interface GovernanceRouterOptions {
  /**
   * Whether the fleet policy has been loaded. Defaults to `true` so a
   * single-agent workspace reports `available: true`; pulses that wire
   * a real fleet loader can override this per request.
   */
  readonly fleetPolicyAvailable?: boolean;
}

function extractCategories(ir: GovernanceIR): readonly GovernanceRuleCategory[] {
  const counts = new Map<string, number>();
  for (const warn of ir.analysis.warnings) {
    counts.set(warn.category, (counts.get(warn.category) ?? 0) + 1);
  }
  for (const v of ir.analysis.violations) {
    const category = diagnosticCategory(v.diagnosticCode);
    if (category !== null) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([category, ruleCount]) => ({ category, ruleCount }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

function diagnosticCategory(code: string): string | null {
  // Diagnostic codes look like `G-CLASS-01` or `G-PERM-02` — category
  // is everything up to the final `-NN` suffix.
  const match = code.match(/^(G-[A-Z]+)-\d+$/);
  return match === null ? null : match[1]!;
}

function computeRiskDistribution(tools: readonly ToolCapability[]): RiskDistribution {
  const dist: Record<ToolRiskLevel, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };
  for (const tool of tools) {
    dist[tool.riskLevel] += 1;
  }
  return dist;
}

function computeDegradedState(ir: GovernanceIR): GovernanceDegradedState {
  if (ir.conflicts.haltReason !== null) return 'error';
  if (ir.analysis.violations.length > 0) return 'stale';
  return 'clean';
}

function toActiveViolations(ir: GovernanceIR): readonly ActiveViolationSummary[] {
  return ir.analysis.violations.map((v) => ({
    ruleId: v.ruleId,
    diagnosticCode: v.diagnosticCode,
    level: v.level,
    target: v.target,
    message: v.message,
  }));
}

/**
 * Attach `GET /` to the `governance` prefix router. The caller mounts
 * the returned router on the `/api/governance` prefix produced by
 * `registerRoutes`.
 */
export function governanceRouter(
  host: CompilationHost,
  options: GovernanceRouterOptions = {},
): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const resolution = resolveReadIR(req, host);
    if (resolution.status === 'missing') {
      respondCompilationRequired(res);
      return;
    }
    // Governance summary intentionally reports `errored` / `stale` via
    // `degradedState` in the body (not an HTTP error) so partners can keep
    // a dashboard alive even while compilation has halted. Chunks routes
    // fail-fast with 503; the governance summary fails-open.
    const ir = resolution.ir;
    const degradedState = computeDegradedState(ir);
    const ruleCategories = extractCategories(ir);
    const totalRules = ruleCategories.reduce((sum, c) => sum + c.ruleCount, 0);
    const riskDistribution = computeRiskDistribution(ir.capabilities.tools);
    // Historical reads pin `compiledAt` to the snapshot's captured
    // timestamp (the middleware-resolved IR knows when it was compiled)
    // so partners don't see the live compilation's `compiledAt` bound to
    // a version-back IR.
    const compiledAt =
      resolution.status === 'ok' && resolution.historical
        ? ir.compiler.compiledAt
        : host.getCompiledAt() ?? null;
    const body: GovernanceResponse = {
      compiledAt,
      compilerVersion: ir.compiler.compilerVersion,
      ruleCategories,
      totalRules,
      riskDistribution,
      blockedTools: ir.analysis.enforcementPlan.blockedTools,
      requiredApprovals: ir.analysis.enforcementPlan.requiredApprovals,
      fleetPolicy: { available: options.fleetPolicyAvailable ?? true },
      degradedState,
      activeViolations:
        degradedState === 'clean' ? [] : toActiveViolations(ir),
    };
    if (resolution.status === 'ok' && resolution.historical) {
      applyTimeTravelCache(res);
    }
    res.status(200).json(body);
  });

  return router;
}
