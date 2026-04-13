/**
 * GovernanceIR — the stable intermediate representation between
 * governance analysis and code emission.
 *
 * This is the pivot type for the claws compiler: analysis produces it,
 * emission consumes it. All governance state passes through this interface.
 *
 * @module claws-sdk/ir/governance-ir
 */

import { createHash } from 'node:crypto';
import { stripBOM, normalizeLF } from '../util/text.js';
import type { CapabilityManifest } from './capability-manifest.js';
import type { ConflictReport } from './conflict-report.js';
import type { GovAnalysis } from './gov-analysis.js';
import type { MechanicalIntent } from './mechanical-intent.js';
import { validateFailModes } from './validate-fail-modes.js';

/**
 * Delegation entry — maps a rule to a specific enforcement mechanism.
 */
export interface DelegationEntry {
  readonly ruleId: string;
  readonly mechanism: 'hook' | 'skill' | 'approval' | 'audit-only';
  readonly target: string;
}

/**
 * Compiler version metadata embedded in every GovernanceIR.
 */
export interface CompilerMeta {
  /** Semantic version of the claws compiler that produced this IR. */
  readonly compilerVersion: string;
  /** ISO 8601 timestamp of compilation. */
  readonly compiledAt: string;
  /** Schema version for forward/backward compatibility. */
  readonly schemaVersion: number;
}

/**
 * GovernanceIR — the complete intermediate representation for governance.
 *
 * Produced by the analysis phase, consumed by the emission phase.
 * Serialized to `.claws/compiled/governance-ir.json`.
 */
export interface GovernanceIR {
  /** Capability manifest — what the agent workspace declares. */
  readonly capabilities: CapabilityManifest;
  /** Governance analysis — violations, warnings, enforcement plan. */
  readonly analysis: GovAnalysis;
  /** Mechanical intents — the concrete enforcement actions. */
  readonly intents: readonly MechanicalIntent[];
  /** Delegation map — which rules delegate to which mechanisms. */
  readonly delegationMap: readonly DelegationEntry[];
  /** Conflict report — OBO and multi-constraint conflicts. */
  readonly conflicts: ConflictReport;
  /** Compiler metadata — version, timestamp, schema version. */
  readonly compiler: CompilerMeta;
}

// ── Serialization ──────────────────────────────────────────────────────

/**
 * Deterministic JSON replacer that sorts object keys alphabetically.
 * Guarantees identical JSON output for structurally equal GovernanceIR
 * regardless of property insertion order.
 */
function sortedReplacer(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) {
      sorted[k] = (value as Record<string, unknown>)[k];
    }
    return sorted;
  }
  return value;
}

/**
 * Serialize a GovernanceIR to a deterministic JSON string.
 * Keys are sorted alphabetically at every nesting level for stable hashing.
 * Empty arrays serialize as `[]` (never null or omitted).
 */
export function serialize(ir: GovernanceIR): string {
  return JSON.stringify(ir, sortedReplacer, 2);
}

/**
 * Deserialize a JSON string into a GovernanceIR.
 * Validates R5 fail-closed invariant after parsing to ensure
 * tampered JSON cannot introduce fail-open R5 rules.
 */
export function deserialize(json: string): GovernanceIR {
  const ir = JSON.parse(json) as GovernanceIR;
  validateFailModes(ir);
  return ir;
}

// ── Hashing ────────────────────────────────────────────────────────────

/**
 * Compute a SHA-256 hash of a GovernanceIR by serializing with sorted keys,
 * then BOM-stripping and LF-normalizing the result before hashing.
 *
 * This is the "normalized IR hash" — used for comparing IR equality
 * across platforms with different line endings or BOM conventions.
 */
export function hashIR(ir: GovernanceIR): string {
  const json = serialize(ir);
  const normalized = normalizeLF(stripBOM(json));
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Compute a raw SHA-256 hash of arbitrary content after BOM-strip + LF-normalize.
 * Used for lossless verification of source files (.crest, etc.) independent of
 * the GovernanceIR structure.
 */
export function hashRaw(content: string): string {
  const normalized = normalizeLF(stripBOM(content));
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}
