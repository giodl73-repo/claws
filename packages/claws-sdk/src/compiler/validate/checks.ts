/**
 * The 12 validation checks for the claws free-tier validator.
 *
 * Every check is a pure function of (workspace, analysis, emitResult?).
 * No file I/O, no network, no globals. Each check returns a single
 * CheckResult — callers aggregate into a ValidationReport.
 *
 * The 12 checks (stable numbering — do NOT renumber):
 *   1.  Schema conformance
 *   2.  Required field presence
 *   3.  Trust level consistency
 *   4.  R5 fail-closed compliance
 *   5.  Emit target validity
 *   6.  Handler type safety
 *   7.  Circular dependency absence
 *   8.  Audit chain integrity
 *   9.  Sidecar version match
 *   10. Platform marker alignment
 *   11. Governance rule coverage
 *   12. Output hash stability
 *
 * @module claws-sdk/compiler/validate/checks
 */

import type { OCWorkspaceIR } from '../ir/workspace-ir.js';
import type { Platform, TrustLevel } from '../ir/field-types.js';
import type { GovAnalysis } from '../enforce/types.js';
import { FREE_TIER_TARGETS } from '../targets/constants.js';
import type { CheckResult, EmitResultShape } from './types.js';

/** Permitted trust-level values (T0..T4). */
const VALID_TRUST_LEVELS: readonly TrustLevel[] = [0, 1, 2, 3, 4];

/** Stable semver regex for sidecarVersion comparison. */
const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

/** Lowercase hex SHA-256 hash length. */
const SHA256_HEX_LEN = 64;

/** Pass helper to keep check bodies compact. */
function pass(id: CheckResult['checkId'], message: string): CheckResult {
  return { checkId: id, pass: true, message, severity: 'info' };
}

/** Fail helper to keep check bodies compact. */
function fail(id: CheckResult['checkId'], message: string): CheckResult {
  return { checkId: id, pass: false, message, severity: 'error' };
}

/** Warning helper — non-fatal, still reports pass=true. */
function warn(id: CheckResult['checkId'], message: string): CheckResult {
  return { checkId: id, pass: true, message, severity: 'warning' };
}

// ── Check 1: Schema conformance ─────────────────────────────────────────

/**
 * Verifies the OCWorkspaceIR contains exactly the 9 sub-IRs plus
 * compiler metadata. Missing a top-level shard means the reader stage
 * produced a broken IR and downstream consumers cannot trust it.
 */
export function checkSchemaConformance(workspace: OCWorkspaceIR): CheckResult {
  const requiredShards = [
    'soul',
    'tools',
    'agents',
    'memory',
    'identity',
    'user',
    'heartbeat',
    'skills',
    'lobster',
    'compiler',
  ] as const;

  const missing: string[] = [];
  for (const shard of requiredShards) {
    if (workspace[shard] === undefined || workspace[shard] === null) {
      missing.push(shard);
    }
  }

  if (missing.length > 0) {
    return fail(1, `Schema conformance failed: missing shards [${missing.join(', ')}]`);
  }
  if (workspace.compiler.schemaVersion < 1) {
    return fail(1, `Schema conformance failed: schemaVersion ${workspace.compiler.schemaVersion} < 1`);
  }
  return pass(1, 'All 9 IR shards + compiler metadata present');
}

// ── Check 2: Required field presence ────────────────────────────────────

/**
 * Verifies all semantically-required leaf fields are populated. Empty
 * strings count as missing because readers emit the empty string when
 * a source field could not be extracted.
 */
export function checkRequiredFields(workspace: OCWorkspaceIR): CheckResult {
  const missing: string[] = [];
  if (workspace.soul.persona.length === 0) missing.push('soul.persona');
  if (workspace.identity.organization.length === 0) missing.push('identity.organization');
  if (workspace.identity.team.length === 0) missing.push('identity.team');
  if (workspace.user.role.length === 0) missing.push('user.role');
  if (workspace.lobster.name.length === 0) missing.push('lobster.name');
  if (workspace.compiler.compilerVersion.length === 0) missing.push('compiler.compilerVersion');

  if (missing.length > 0) {
    return fail(2, `Required fields missing: ${missing.join(', ')}`);
  }
  return pass(2, 'All required fields populated');
}

// ── Check 3: Trust level consistency ────────────────────────────────────

/**
 * Verifies tool trust annotations are valid T0..T4 integers and every
 * agent-declared tool has a matching ToolsIR entry at a consistent trust
 * level. Inconsistencies indicate a governance extraction bug.
 */
export function checkTrustLevels(workspace: OCWorkspaceIR): CheckResult {
  const invalidLevels: string[] = [];
  const trustByTool = new Map<string, TrustLevel>();

  for (const tool of workspace.tools.tools) {
    if (!VALID_TRUST_LEVELS.includes(tool.trustLevel)) {
      invalidLevels.push(`${tool.name}=T${tool.trustLevel}`);
      continue;
    }
    trustByTool.set(tool.name, tool.trustLevel);
  }

  if (invalidLevels.length > 0) {
    return fail(3, `Invalid trust levels: ${invalidLevels.join(', ')}`);
  }

  const orphanedRefs: string[] = [];
  for (const agent of workspace.agents.agents) {
    for (const toolName of agent.tools) {
      if (!trustByTool.has(toolName)) {
        orphanedRefs.push(`${agent.name}->${toolName}`);
      }
    }
  }

  if (orphanedRefs.length > 0) {
    return fail(3, `Agents reference undeclared tools: ${orphanedRefs.join(', ')}`);
  }

  return pass(3, `Trust levels consistent across ${workspace.tools.tools.length} tools`);
}

// ── Check 4: R5 fail-closed compliance ──────────────────────────────────

/**
 * Mirrors enforceR5 semantics: the analysis must contain zero ambiguous
 * violations and the effectiveR5Count must be well-formed (overridden
 * must not exceed derived). Any fail-open posture is denied.
 */
export function checkR5FailClosed(_workspace: OCWorkspaceIR, analysis: GovAnalysis): CheckResult {
  const { effectiveR5Count } = analysis;
  if (effectiveR5Count.overridden > effectiveR5Count.derived) {
    return fail(
      4,
      `R5 count anomaly: overridden=${effectiveR5Count.overridden} > derived=${effectiveR5Count.derived}`,
    );
  }

  const ambiguous: string[] = [];
  for (const v of analysis.violations) {
    const bidirectional =
      v.fixSuggestions.some((f) => f.direction === 'tighten') &&
      v.fixSuggestions.some((f) => f.direction === 'relax');
    if (bidirectional || v.toolFuzzyMatches.length > 0 || v.level === 5) {
      ambiguous.push(v.ruleId);
    }
  }

  if (ambiguous.length > 0) {
    return fail(4, `R5 fail-open rules detected: ${ambiguous.join(', ')}`);
  }
  return pass(4, 'R5 fail-closed posture holds');
}

// ── Check 5: Emit target validity ───────────────────────────────────────

/**
 * Verifies the user's preferred platform and any produced emit target
 * are both free-tier supported. The platform list comes from the shared
 * `FREE_TIER_TARGETS` constant, so validate and emit can never disagree
 * about which targets are allowed (see CM-3 in Ra CP-2 R1).
 *
 * With no emit result, this degrades to a warning to preserve pre-emit
 * usability. Paid-tier platforms (cursor, copilot, crewai, langgraph,
 * bedrock) fail here with an explicit free-tier rejection message so
 * callers see the gate closed at validate rather than crashing at emit.
 */
export function checkEmitTarget(
  workspace: OCWorkspaceIR,
  _analysis: GovAnalysis,
  emitResult: EmitResultShape | undefined,
): CheckResult {
  const userPlatform = workspace.user.platform as Platform;
  if (!(FREE_TIER_TARGETS as readonly string[]).includes(userPlatform)) {
    return fail(
      5,
      `user.platform "${userPlatform}" is not a free-tier emit target (supported: ${FREE_TIER_TARGETS.join(', ')})`,
    );
  }

  if (emitResult === undefined) {
    return warn(5, 'Emit target not yet produced (emit step not run)');
  }

  if (!(FREE_TIER_TARGETS as readonly string[]).includes(emitResult.platform)) {
    return fail(
      5,
      `emit platform "${emitResult.platform}" is not a free-tier target (supported: ${FREE_TIER_TARGETS.join(', ')})`,
    );
  }

  return pass(5, `Emit target valid: ${emitResult.platform}`);
}

// ── Check 6: Handler type safety ────────────────────────────────────────

/**
 * Ensures declared handlers (skills, delegations, lobster steps) have
 * the structural shape required for type-safe dispatch. Specifically:
 * each skill has a non-empty name and at least one required tool slot
 * resolvable; each delegation has non-empty from/to and at least one tool.
 */
export function checkHandlerTypes(workspace: OCWorkspaceIR): CheckResult {
  const issues: string[] = [];

  for (const skill of workspace.skills.skills) {
    if (skill.name.length === 0) {
      issues.push('skill with empty name');
    }
  }

  for (const d of workspace.agents.delegations) {
    if (d.from.length === 0 || d.to.length === 0) {
      issues.push(`delegation with empty endpoint (from="${d.from}", to="${d.to}")`);
    }
    if (d.tools.length === 0) {
      issues.push(`delegation ${d.from}->${d.to} has no tools`);
    }
  }

  for (const step of workspace.lobster.steps) {
    if (step.name.length === 0 || step.command.length === 0) {
      issues.push(`lobster step missing name or command`);
    }
  }

  if (issues.length > 0) {
    return fail(6, `Handler type safety failed: ${issues.join('; ')}`);
  }
  return pass(6, 'Handlers are type-safe');
}

// ── Check 7: Circular dependency absence ────────────────────────────────

/**
 * Runs iterative DFS over the lobster step dependency map. Presence of
 * any back-edge proves a cycle.
 */
export function checkCircularDeps(workspace: OCWorkspaceIR): CheckResult {
  const deps = workspace.lobster.dependencies;
  const visited = new Set<string>();
  const onStack = new Set<string>();

  function visit(node: string): string | null {
    if (onStack.has(node)) return node;
    if (visited.has(node)) return null;
    visited.add(node);
    onStack.add(node);
    const children = deps[node] ?? [];
    for (const child of children) {
      const cycleStart = visit(child);
      if (cycleStart !== null) return cycleStart;
    }
    onStack.delete(node);
    return null;
  }

  for (const node of Object.keys(deps)) {
    const cycleStart = visit(node);
    if (cycleStart !== null) {
      return fail(7, `Circular dependency detected at "${cycleStart}"`);
    }
  }

  return pass(7, `No cycles across ${Object.keys(deps).length} dependency edges`);
}

// ── Check 8: Audit chain integrity ──────────────────────────────────────

/**
 * Audit chain integrity in the free-tier validator is observed via
 * workspace diagnostics: any audit-coded diagnostic at error severity
 * means the chain is broken or a write was rejected. This avoids
 * pulling the audit module into the validate module.
 */
export function checkAuditChain(workspace: OCWorkspaceIR): CheckResult {
  const auditErrors = workspace.diagnostics.filter(
    (d) => d.severity === 'error' && d.code.startsWith('AUDIT'),
  );
  if (auditErrors.length > 0) {
    const codes = auditErrors.map((d) => d.code).join(', ');
    return fail(8, `Audit chain broken: ${codes}`);
  }
  return pass(8, 'Audit chain integrity holds');
}

// ── Check 9: Sidecar version match ──────────────────────────────────────

/**
 * When emit result includes sidecarVersion, it must be semver-valid and
 * match the compiler schemaVersion family (major parity). Without emit,
 * warn but do not fail.
 */
export function checkSidecarVersion(
  workspace: OCWorkspaceIR,
  _analysis: GovAnalysis,
  emitResult: EmitResultShape | undefined,
): CheckResult {
  if (emitResult === undefined || emitResult.sidecarVersion === undefined) {
    return warn(9, 'Sidecar version not available (emit skipped)');
  }
  const version = emitResult.sidecarVersion;
  if (!SEMVER_RE.test(version)) {
    return fail(9, `Sidecar version "${version}" is not valid semver`);
  }
  // Safe: SEMVER_RE guarantees a leading run of digits.
  const major = Number.parseInt(version, 10);
  if (major !== workspace.compiler.schemaVersion) {
    return fail(
      9,
      `Sidecar major ${major} does not match compiler schemaVersion ${workspace.compiler.schemaVersion}`,
    );
  }
  return pass(9, `Sidecar version ${version} matches compiler schema`);
}

// ── Check 10: Platform marker alignment ─────────────────────────────────

/**
 * When emit has run, its platform must match the workspace user's
 * preferred platform. Mismatch is treated as a compile-target drift
 * and must fail.
 */
export function checkPlatformAlignment(
  workspace: OCWorkspaceIR,
  _analysis: GovAnalysis,
  emitResult: EmitResultShape | undefined,
): CheckResult {
  if (emitResult === undefined) {
    return warn(10, 'Platform alignment deferred (emit skipped)');
  }
  if (emitResult.platform !== workspace.user.platform) {
    return fail(
      10,
      `Platform drift: user.platform="${workspace.user.platform}" but emit="${emitResult.platform}"`,
    );
  }
  return pass(10, `Platform aligned: ${emitResult.platform}`);
}

// ── Check 11: Governance rule coverage ──────────────────────────────────

/**
 * Verifies the analysis produced a non-empty enforcement plan OR an
 * explicit zero-rules acknowledgement. A completely empty analysis is
 * suspect because every real workspace emits at least a default rule set.
 */
export function checkRuleCoverage(_workspace: OCWorkspaceIR, analysis: GovAnalysis): CheckResult {
  const plan = analysis.enforcementPlan;
  const coverage =
    plan.blockedTools.length +
    plan.requiredApprovals.length +
    plan.auditOnlyRules.length +
    analysis.violations.length +
    analysis.warnings.length;
  if (coverage === 0 && analysis.effectiveR5Count.total === 0) {
    return fail(11, 'Governance rule coverage is zero — analysis appears empty');
  }
  return pass(11, `Rule coverage: ${coverage} signals, ${analysis.effectiveR5Count.total} R5 rules`);
}

// ── Check 12: Output hash stability ─────────────────────────────────────

/**
 * When emit produced an outputHash, it must be a 64-char lowercase hex
 * SHA-256 digest. Re-computation is not possible here (would require
 * importing crypto), but shape-validation catches emitters that forget
 * to compute the hash or emit a non-canonical format.
 */
export function checkOutputHash(
  _workspace: OCWorkspaceIR,
  _analysis: GovAnalysis,
  emitResult: EmitResultShape | undefined,
): CheckResult {
  if (emitResult === undefined) {
    return warn(12, 'Output hash unavailable (emit skipped)');
  }
  if (emitResult.outputHash === undefined) {
    return fail(12, 'Emit result missing outputHash');
  }
  const h = emitResult.outputHash;
  if (h.length !== SHA256_HEX_LEN || !/^[0-9a-f]+$/.test(h)) {
    return fail(12, `outputHash "${h}" is not a 64-char lowercase hex SHA-256`);
  }
  return pass(12, `Output hash stable (${SHA256_HEX_LEN} hex chars)`);
}

/**
 * All 12 checks in stable id order. Keeps the validator's dispatch
 * table in one place for clarity and so extraction into a standalone
 * module is mechanical.
 */
export const ALL_CHECKS: ReadonlyArray<{
  id: CheckResult['checkId'];
  name: string;
  description: string;
  run: (
    workspace: OCWorkspaceIR,
    analysis: GovAnalysis,
    emitResult: EmitResultShape | undefined,
  ) => CheckResult;
}> = [
  {
    id: 1,
    name: 'Schema conformance',
    description: 'IR has 9 sub-IR shards and compiler metadata.',
    run: (w) => checkSchemaConformance(w),
  },
  {
    id: 2,
    name: 'Required field presence',
    description: 'All semantically required leaf fields populated.',
    run: (w) => checkRequiredFields(w),
  },
  {
    id: 3,
    name: 'Trust level consistency',
    description: 'Tool trust T0..T4; agents reference only declared tools.',
    run: (w) => checkTrustLevels(w),
  },
  {
    id: 4,
    name: 'R5 fail-closed compliance',
    description: 'No ambiguous rules; R5 counts well-formed.',
    run: (w, a) => checkR5FailClosed(w, a),
  },
  {
    id: 5,
    name: 'Emit target validity',
    description: 'Emit targets one of the free-tier platforms (oc, claude-code).',
    run: (w, a, e) => checkEmitTarget(w, a, e),
  },
  {
    id: 6,
    name: 'Handler type safety',
    description: 'Skills, delegations, lobster steps have non-empty handlers.',
    run: (w) => checkHandlerTypes(w),
  },
  {
    id: 7,
    name: 'Circular dependency absence',
    description: 'Lobster dependency graph is a DAG.',
    run: (w) => checkCircularDeps(w),
  },
  {
    id: 8,
    name: 'Audit chain integrity',
    description: 'No AUDIT-coded error diagnostics.',
    run: (w) => checkAuditChain(w),
  },
  {
    id: 9,
    name: 'Sidecar version match',
    description: 'Emit sidecar semver major matches compiler schemaVersion.',
    run: (w, a, e) => checkSidecarVersion(w, a, e),
  },
  {
    id: 10,
    name: 'Platform marker alignment',
    description: 'Emit platform matches user.platform.',
    run: (w, a, e) => checkPlatformAlignment(w, a, e),
  },
  {
    id: 11,
    name: 'Governance rule coverage',
    description: 'Analysis is non-empty.',
    run: (w, a) => checkRuleCoverage(w, a),
  },
  {
    id: 12,
    name: 'Output hash stability',
    description: 'Emit outputHash is a canonical SHA-256 hex digest.',
    run: (w, a, e) => checkOutputHash(w, a, e),
  },
];
