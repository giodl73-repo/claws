/**
 * Serialization and deserialization for OCWorkspaceIR.
 *
 * Provides snapshot/cache round-tripping with deterministic JSON output
 * and shape validation on deserialization.
 *
 * @module claws-sdk/compiler/ir/serialization
 */

import type { OCWorkspaceIR } from './workspace-ir.js';

/**
 * Deterministic JSON replacer that sorts object keys alphabetically.
 * Guarantees identical JSON output for structurally equal OCWorkspaceIR
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

/** The 9 required sub-IR field names in OCWorkspaceIR. */
const REQUIRED_SUB_IRS = [
  'soul',
  'tools',
  'agents',
  'memory',
  'identity',
  'user',
  'heartbeat',
  'skills',
  'lobster',
] as const;

/**
 * Validate the top-level shape of a parsed OCWorkspaceIR.
 *
 * Checks that all 9 sub-IR fields, compiler metadata, and diagnostics
 * are present and have the expected types.
 *
 * @throws {Error} If the shape is invalid.
 */
function validateShape(value: unknown): asserts value is OCWorkspaceIR {
  if (value === null || typeof value !== 'object') {
    throw new Error('OCWorkspaceIR must be a non-null object');
  }

  const obj = value as Record<string, unknown>;

  // Validate all 9 sub-IRs are present, are objects, and contain required fields
  for (const field of REQUIRED_SUB_IRS) {
    const sub = obj[field];
    if (sub === null || sub === undefined || typeof sub !== 'object') {
      throw new Error(`OCWorkspaceIR.${field} must be a non-null object`);
    }
  }

  const subObjs = obj as Record<string, Record<string, unknown>>;

  // soul: must have persona (string)
  if (typeof subObjs['soul']!['persona'] !== 'string') {
    throw new Error('OCWorkspaceIR.soul.persona must be a string');
  }
  // tools: must have tools (array)
  if (!Array.isArray(subObjs['tools']!['tools'])) {
    throw new Error('OCWorkspaceIR.tools.tools must be an array');
  }
  // agents: must have agents (array)
  if (!Array.isArray(subObjs['agents']!['agents'])) {
    throw new Error('OCWorkspaceIR.agents.agents must be an array');
  }
  // memory: must have entries (array)
  if (!Array.isArray(subObjs['memory']!['entries'])) {
    throw new Error('OCWorkspaceIR.memory.entries must be an array');
  }
  // identity: must have name (string) — stored as 'organization'
  if (typeof subObjs['identity']!['organization'] !== 'string') {
    throw new Error('OCWorkspaceIR.identity.organization must be a string');
  }
  // heartbeat: must have schedules (array)
  if (!Array.isArray(subObjs['heartbeat']!['schedules'])) {
    throw new Error('OCWorkspaceIR.heartbeat.schedules must be an array');
  }
  // skills: must have skills (array)
  if (!Array.isArray(subObjs['skills']!['skills'])) {
    throw new Error('OCWorkspaceIR.skills.skills must be an array');
  }
  // lobster: must have steps (array)
  if (!Array.isArray(subObjs['lobster']!['steps'])) {
    throw new Error('OCWorkspaceIR.lobster.steps must be an array');
  }
  // user: must have preferences as object (stored as 'environment')
  if (subObjs['user']!['environment'] === null || typeof subObjs['user']!['environment'] !== 'object') {
    throw new Error('OCWorkspaceIR.user.environment must be an object');
  }

  // Validate compiler metadata
  const compiler = obj['compiler'];
  if (compiler === null || compiler === undefined || typeof compiler !== 'object') {
    throw new Error('OCWorkspaceIR.compiler must be a non-null object');
  }
  const meta = compiler as Record<string, unknown>;
  if (typeof meta['compilerVersion'] !== 'string') {
    throw new Error('OCWorkspaceIR.compiler.compilerVersion must be a string');
  }
  if (typeof meta['compiledAt'] !== 'string') {
    throw new Error('OCWorkspaceIR.compiler.compiledAt must be a string');
  }
  if (typeof meta['schemaVersion'] !== 'number') {
    throw new Error('OCWorkspaceIR.compiler.schemaVersion must be a number');
  }

  // Validate diagnostics array
  const diagnostics = obj['diagnostics'];
  if (!Array.isArray(diagnostics)) {
    throw new Error('OCWorkspaceIR.diagnostics must be an array');
  }
}

/**
 * Serialize an OCWorkspaceIR to a deterministic JSON string.
 *
 * Keys are sorted alphabetically at every nesting level for stable
 * comparison and caching.
 */
export function serializeWorkspaceIR(ir: OCWorkspaceIR): string {
  return JSON.stringify(ir, sortedReplacer, 2);
}

/**
 * Deserialize a JSON string into an OCWorkspaceIR.
 *
 * Validates the top-level shape on deserialization to catch malformed
 * or tampered JSON early.
 *
 * @throws {Error} If the JSON is malformed or the shape is invalid.
 */
export function deserializeWorkspaceIR(json: string): OCWorkspaceIR {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (cause) {
    throw new Error('Failed to parse OCWorkspaceIR JSON', { cause });
  }
  validateShape(parsed);
  return parsed;
}
