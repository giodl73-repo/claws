/**
 * GovernanceDiff — structural comparison of two {@link GovernanceIR}
 * snapshots.
 *
 * Walks the capability manifest (tools, skills, agents, workflows), the
 * mechanical intents (as deny-rule surrogates), and the delegation map,
 * producing one {@link DiffEntry} per change. Every entry carries an
 * oc:// path so UI and audit consumers can cross-reference governed
 * entities uniformly.
 *
 * Business-logic ownership (SDK-owns-logic): all diffing decisions —
 * including oc:// path construction, field-level vs item-level change
 * classification, and provenance attribution — live here. The
 * `claws-serve` diff route is a thin HTTP adapter that delegates to
 * {@link diffGovernance}.
 *
 * Stability: entries are emitted in deterministic order — alphabetical
 * by oc:// path, then by field name, then by change type. Consumers can
 * hash or compare the result without re-sorting.
 *
 * @module claws-sdk/workspace/governance-diff
 */

import type {
  AgentCapability,
  CapabilityManifest,
  SkillCapability,
  ToolCapability,
  WorkflowCapability,
} from '../ir/capability-manifest.js';
import type { GovernanceIR, DelegationEntry } from '../ir/governance-ir.js';
import type { DenyIntent, MechanicalIntent } from '../ir/mechanical-intent.js';
import { formatOcPath } from '@bic/openclaw-workspace/path';
import type {
  DiffChangeSource,
  DiffEntry,
  DiffResult,
  DiffSummary,
} from './diff-types.js';

/** Options for {@link diffGovernance}. */
export interface DiffGovernanceOptions {
  /** Version of the `from` IR; `null` for snapshot-sourced IRs. */
  readonly fromVersion: number | null;
  /** Version of the `to` IR; `null` for snapshot-sourced IRs. */
  readonly toVersion: number | null;
  /** Compile timestamp of the `from` IR, when known. */
  readonly fromCompiledAt?: string | null;
  /** Compile timestamp of the `to` IR, when known. */
  readonly toCompiledAt?: string | null;
  /**
   * Provenance classifier. Called once per change. When omitted, every
   * change is tagged `unknown` — the route layer can pass a classifier
   * that consults the PATCH audit log or recompile signals to attach
   * better attribution.
   */
  readonly classify?: ChangeClassifier;
}

/**
 * Resolve the provenance of a single change. Receives the oc:// path and
 * the field that changed (undefined for whole-item add/remove); returns
 * the attribution tag.
 */
export type ChangeClassifier = (args: {
  readonly path: string;
  readonly field: string | undefined;
  readonly type: DiffEntry['type'];
}) => DiffChangeSource;

/**
 * Compute the structured diff between two GovernanceIR snapshots.
 *
 * Symmetric: if `from` and `to` are structurally equal the entries list
 * is empty and the summary counts are zero.
 */
export function diffGovernance(
  from: GovernanceIR,
  to: GovernanceIR,
  options: DiffGovernanceOptions,
): DiffResult {
  const classify = options.classify ?? defaultClassifier;
  const changedAt = options.toVersion;

  const raw: DiffEntry[] = [];
  collectToolChanges(raw, from.capabilities, to.capabilities, classify, changedAt);
  collectSkillChanges(raw, from.capabilities, to.capabilities, classify, changedAt);
  collectAgentChanges(raw, from.capabilities, to.capabilities, classify, changedAt);
  collectWorkflowChanges(raw, from.capabilities, to.capabilities, classify, changedAt);
  collectDenyIntentChanges(raw, from.intents, to.intents, classify, changedAt);
  collectDelegationChanges(raw, from.delegationMap, to.delegationMap, classify, changedAt);

  const entries = sortEntries(raw);
  const summary = summarize(entries);

  return {
    fromVersion: options.fromVersion,
    toVersion: options.toVersion,
    fromCompiledAt: options.fromCompiledAt ?? null,
    toCompiledAt: options.toCompiledAt ?? null,
    entries,
    summary,
  };
}

const defaultClassifier: ChangeClassifier = () => 'unknown';

// ── Tool diffs ───────────────────────────────────────────────────────

const TOOL_FIELDS: readonly (keyof ToolCapability)[] = [
  'description',
  'riskLevel',
  'oboFlag',
  'classification',
  'trustLabels',
  'mcpServer',
];

function collectToolChanges(
  out: DiffEntry[],
  from: CapabilityManifest,
  to: CapabilityManifest,
  classify: ChangeClassifier,
  changedAt: number | null,
): void {
  const before = indexBy(from.tools, (t) => t.name);
  const after = indexBy(to.tools, (t) => t.name);
  for (const [name, item] of before) {
    if (!after.has(name)) {
      const path = formatOcPath({ file: 'TOOLS.md', section: 'tools', item: name });
      out.push({
        path,
        type: 'removed',
        before: item,
        after: null,
        changedAt,
        changedBy: classify({ path, field: undefined, type: 'removed' }),
      });
    }
  }
  for (const [name, item] of after) {
    const prev = before.get(name);
    if (prev === undefined) {
      const path = formatOcPath({ file: 'TOOLS.md', section: 'tools', item: name });
      out.push({
        path,
        type: 'added',
        before: null,
        after: item,
        changedAt,
        changedBy: classify({ path, field: undefined, type: 'added' }),
      });
      continue;
    }
    for (const field of TOOL_FIELDS) {
      const a = prev[field];
      const b = item[field];
      if (!valueEqual(a, b)) {
        const path = formatOcPath({
          file: 'TOOLS.md',
          section: 'tools',
          item: name,
          field: String(field),
        });
        out.push({
          path,
          type: 'modified',
          field: String(field),
          before: a ?? null,
          after: b ?? null,
          changedAt,
          changedBy: classify({ path, field: String(field), type: 'modified' }),
        });
      }
    }
  }
}

// ── Skill diffs ──────────────────────────────────────────────────────

const SKILL_FIELDS: readonly (keyof SkillCapability)[] = [
  'description',
  'requiredTools',
  'governanceLevel',
];

function collectSkillChanges(
  out: DiffEntry[],
  from: CapabilityManifest,
  to: CapabilityManifest,
  classify: ChangeClassifier,
  changedAt: number | null,
): void {
  const before = indexBy(from.skills, (s) => s.name);
  const after = indexBy(to.skills, (s) => s.name);
  for (const [name, item] of before) {
    if (!after.has(name)) {
      const path = formatOcPath({ file: 'SKILLS.md', section: 'skills', item: name });
      out.push({
        path,
        type: 'removed',
        before: item,
        after: null,
        changedAt,
        changedBy: classify({ path, field: undefined, type: 'removed' }),
      });
    }
  }
  for (const [name, item] of after) {
    const prev = before.get(name);
    if (prev === undefined) {
      const path = formatOcPath({ file: 'SKILLS.md', section: 'skills', item: name });
      out.push({
        path,
        type: 'added',
        before: null,
        after: item,
        changedAt,
        changedBy: classify({ path, field: undefined, type: 'added' }),
      });
      continue;
    }
    for (const field of SKILL_FIELDS) {
      if (!valueEqual(prev[field], item[field])) {
        const path = formatOcPath({
          file: 'SKILLS.md',
          section: 'skills',
          item: name,
          field: String(field),
        });
        out.push({
          path,
          type: 'modified',
          field: String(field),
          before: prev[field],
          after: item[field],
          changedAt,
          changedBy: classify({ path, field: String(field), type: 'modified' }),
        });
      }
    }
  }
}

// ── Agent diffs ──────────────────────────────────────────────────────

const AGENT_FIELDS: readonly (keyof AgentCapability)[] = [
  'description',
  'delegations',
  'maxAutonomousLevel',
];

function collectAgentChanges(
  out: DiffEntry[],
  from: CapabilityManifest,
  to: CapabilityManifest,
  classify: ChangeClassifier,
  changedAt: number | null,
): void {
  const before = indexBy(from.agents, (a) => a.name);
  const after = indexBy(to.agents, (a) => a.name);
  for (const [name, item] of before) {
    if (!after.has(name)) {
      const path = formatOcPath({ file: 'AGENTS.md', section: 'agents', item: name });
      out.push({
        path,
        type: 'removed',
        before: item,
        after: null,
        changedAt,
        changedBy: classify({ path, field: undefined, type: 'removed' }),
      });
    }
  }
  for (const [name, item] of after) {
    const prev = before.get(name);
    if (prev === undefined) {
      const path = formatOcPath({ file: 'AGENTS.md', section: 'agents', item: name });
      out.push({
        path,
        type: 'added',
        before: null,
        after: item,
        changedAt,
        changedBy: classify({ path, field: undefined, type: 'added' }),
      });
      continue;
    }
    for (const field of AGENT_FIELDS) {
      if (!valueEqual(prev[field], item[field])) {
        const path = formatOcPath({
          file: 'AGENTS.md',
          section: 'agents',
          item: name,
          field: String(field),
        });
        out.push({
          path,
          type: 'modified',
          field: String(field),
          before: prev[field],
          after: item[field],
          changedAt,
          changedBy: classify({ path, field: String(field), type: 'modified' }),
        });
      }
    }
  }
}

// ── Workflow diffs ───────────────────────────────────────────────────

const WORKFLOW_FIELDS: readonly (keyof WorkflowCapability)[] = [
  'description',
  'steps',
  'requiresApproval',
];

function collectWorkflowChanges(
  out: DiffEntry[],
  from: CapabilityManifest,
  to: CapabilityManifest,
  classify: ChangeClassifier,
  changedAt: number | null,
): void {
  const before = indexBy(from.workflows, (w) => w.name);
  const after = indexBy(to.workflows, (w) => w.name);
  for (const [name, item] of before) {
    if (!after.has(name)) {
      const path = formatOcPath({
        file: 'WORKFLOWS.md',
        section: 'workflows',
        item: name,
      });
      out.push({
        path,
        type: 'removed',
        before: item,
        after: null,
        changedAt,
        changedBy: classify({ path, field: undefined, type: 'removed' }),
      });
    }
  }
  for (const [name, item] of after) {
    const prev = before.get(name);
    if (prev === undefined) {
      const path = formatOcPath({
        file: 'WORKFLOWS.md',
        section: 'workflows',
        item: name,
      });
      out.push({
        path,
        type: 'added',
        before: null,
        after: item,
        changedAt,
        changedBy: classify({ path, field: undefined, type: 'added' }),
      });
      continue;
    }
    for (const field of WORKFLOW_FIELDS) {
      if (!valueEqual(prev[field], item[field])) {
        const path = formatOcPath({
          file: 'WORKFLOWS.md',
          section: 'workflows',
          item: name,
          field: String(field),
        });
        out.push({
          path,
          type: 'modified',
          field: String(field),
          before: prev[field],
          after: item[field],
          changedAt,
          changedBy: classify({ path, field: String(field), type: 'modified' }),
        });
      }
    }
  }
}

// ── Deny intent diffs ────────────────────────────────────────────────

function collectDenyIntentChanges(
  out: DiffEntry[],
  from: readonly MechanicalIntent[],
  to: readonly MechanicalIntent[],
  classify: ChangeClassifier,
  changedAt: number | null,
): void {
  const before = indexBy(
    from.filter(isDenyIntent),
    (d) => d.id,
  );
  const after = indexBy(
    to.filter(isDenyIntent),
    (d) => d.id,
  );
  for (const [id, item] of before) {
    if (!after.has(id)) {
      const path = formatOcPath({
        file: 'RULES.md',
        section: 'deny-rules',
        item: id,
      });
      out.push({
        path,
        type: 'removed',
        before: item,
        after: null,
        changedAt,
        changedBy: classify({ path, field: undefined, type: 'removed' }),
      });
    }
  }
  for (const [id, item] of after) {
    const prev = before.get(id);
    if (prev === undefined) {
      const path = formatOcPath({
        file: 'RULES.md',
        section: 'deny-rules',
        item: id,
      });
      out.push({
        path,
        type: 'added',
        before: null,
        after: item,
        changedAt,
        changedBy: classify({ path, field: undefined, type: 'added' }),
      });
      continue;
    }
    for (const field of ['target', 'reason', 'level'] as const) {
      if (!valueEqual(prev[field], item[field])) {
        const path = formatOcPath({
          file: 'RULES.md',
          section: 'deny-rules',
          item: id,
          field,
        });
        out.push({
          path,
          type: 'modified',
          field,
          before: prev[field],
          after: item[field],
          changedAt,
          changedBy: classify({ path, field, type: 'modified' }),
        });
      }
    }
  }
}

function isDenyIntent(intent: MechanicalIntent): intent is DenyIntent {
  return intent.kind === 'deny';
}

// ── Delegation map diffs ─────────────────────────────────────────────

function collectDelegationChanges(
  out: DiffEntry[],
  from: readonly DelegationEntry[],
  to: readonly DelegationEntry[],
  classify: ChangeClassifier,
  changedAt: number | null,
): void {
  const before = indexBy(from, (d) => d.ruleId);
  const after = indexBy(to, (d) => d.ruleId);
  for (const [ruleId, item] of before) {
    if (!after.has(ruleId)) {
      const path = formatOcPath({
        file: 'DELEGATIONS.md',
        section: 'delegations',
        item: ruleId,
      });
      out.push({
        path,
        type: 'removed',
        before: item,
        after: null,
        changedAt,
        changedBy: classify({ path, field: undefined, type: 'removed' }),
      });
    }
  }
  for (const [ruleId, item] of after) {
    const prev = before.get(ruleId);
    if (prev === undefined) {
      const path = formatOcPath({
        file: 'DELEGATIONS.md',
        section: 'delegations',
        item: ruleId,
      });
      out.push({
        path,
        type: 'added',
        before: null,
        after: item,
        changedAt,
        changedBy: classify({ path, field: undefined, type: 'added' }),
      });
      continue;
    }
    for (const field of ['mechanism', 'target'] as const) {
      if (!valueEqual(prev[field], item[field])) {
        const path = formatOcPath({
          file: 'DELEGATIONS.md',
          section: 'delegations',
          item: ruleId,
          field,
        });
        out.push({
          path,
          type: 'modified',
          field,
          before: prev[field],
          after: item[field],
          changedAt,
          changedBy: classify({ path, field, type: 'modified' }),
        });
      }
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function indexBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(key(item), item);
  }
  return map;
}

/**
 * Structural equality for primitives, arrays, and plain objects. Uses
 * deterministic JSON to avoid a deep-equal dependency — acceptable here
 * because IR values are JSON-serialisable by construction and the diff
 * runs O(changes), not O(field probes) per comparison.
 */
function valueEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v: unknown) => {
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(v).sort()) {
        sorted[k] = (v as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return v;
  });
}

function sortEntries(entries: readonly DiffEntry[]): readonly DiffEntry[] {
  // Paths are unique per (item, field) by construction: modified entries
  // include the field in the path; added/removed share a container path
  // but cannot collide within a single diff (an item cannot be both added
  // and removed in the same walk). A single path comparison is sufficient.
  return [...entries].sort((a, b) => a.path.localeCompare(b.path));
}

function summarize(entries: readonly DiffEntry[]): DiffSummary {
  let added = 0;
  let modified = 0;
  let removed = 0;
  for (const e of entries) {
    if (e.type === 'added') added += 1;
    else if (e.type === 'modified') modified += 1;
    else removed += 1;
  }
  return { added, modified, removed, total: added + modified + removed };
}
