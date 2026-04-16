/**
 * DataFrame materialization — converts DataFrame references in
 * GovernanceIR to const objects for compile-time materialization.
 *
 * This eliminates runtime DataFrame resolution overhead in generated
 * governance code, replacing dynamic lookups with static constants.
 *
 * A "DataFrame" is a governance lookup table that maps a key to
 * structured data (e.g., tool classifications, risk levels, approval
 * requirements). At compile time, these can be resolved to static
 * const objects that the emitted code references directly.
 *
 * @module claws-sdk/optimize/materialize
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type { ToolCapability } from '../ir/capability-manifest.js';

/**
 * A materialized DataFrame entry — a resolved constant.
 */
export interface MaterializedEntry {
  /** The lookup key (tool name, rule ID, etc.). */
  readonly key: string;
  /** The resolved constant value. */
  readonly value: Readonly<Record<string, unknown>>;
}

/**
 * A materialized DataFrame — a complete lookup table resolved to constants.
 */
export interface MaterializedDataFrame {
  /** DataFrame name. */
  readonly name: string;
  /** Entries in the DataFrame. */
  readonly entries: readonly MaterializedEntry[];
}

/**
 * Result of DataFrame materialization.
 */
export interface MaterializeResult {
  /** Materialized tool classification DataFrame. */
  readonly toolClassifications: MaterializedDataFrame;
  /** Materialized delegation DataFrame. */
  readonly delegationMap: MaterializedDataFrame;
  /** Total entries materialized. */
  readonly totalEntries: number;
}

/**
 * Materialize a single tool capability to a const-ready record.
 */
function materializeTool(tool: ToolCapability): MaterializedEntry {
  return {
    key: tool.name,
    value: {
      riskLevel: tool.riskLevel,
      classification: tool.classification,
      oboFlag: tool.oboFlag,
    },
  };
}

/**
 * Materialize all DataFrame references in a GovernanceIR to static
 * const objects.
 *
 * Produces two DataFrames:
 * 1. **toolClassifications** — maps tool names to their risk level,
 *    classification, and OBO status.
 * 2. **delegationMap** — maps rule IDs to their enforcement mechanism
 *    and target.
 */
export function materializeDataFrames(ir: GovernanceIR): MaterializeResult {
  // Materialize tool classifications
  const toolEntries = ir.capabilities.tools.map(materializeTool);

  const toolClassifications: MaterializedDataFrame = {
    name: 'toolClassifications',
    entries: toolEntries,
  };

  // Materialize delegation map
  const delegationEntries: MaterializedEntry[] = ir.delegationMap.map((entry) => ({
    key: entry.ruleId,
    value: {
      mechanism: entry.mechanism,
      target: entry.target,
    },
  }));

  const delegationMap: MaterializedDataFrame = {
    name: 'delegationMap',
    entries: delegationEntries,
  };

  const totalEntries = toolEntries.length + delegationEntries.length;

  return {
    toolClassifications,
    delegationMap,
    totalEntries,
  };
}

/**
 * Serialize a MaterializedDataFrame to a TypeScript const declaration string.
 * Useful for code emission — produces `export const NAME = { ... } as const;`.
 */
export function serializeDataFrame(df: MaterializedDataFrame): string {
  const entries = df.entries.map((entry) => {
    const valueStr = JSON.stringify(entry.value, null, 2)
      .split('\n')
      .map((line, i) => (i === 0 ? line : `    ${line}`))
      .join('\n');
    return `  ${JSON.stringify(entry.key)}: ${valueStr}`;
  });

  return `export const ${df.name} = {\n${entries.join(',\n')}\n} as const;`;
}
