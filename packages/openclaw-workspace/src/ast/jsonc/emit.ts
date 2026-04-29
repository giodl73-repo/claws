/**
 * JSONC emit — produce source text from an AST.
 *
 * Emit modes:
 * - `emitJsonc(doc)` — pristine round-trip; returns `doc.source` verbatim.
 *   Byte-identical guarantee for unmutated input.
 * - `emitJsoncWithMutation(doc, mutator)` — walk leaves and apply optional
 *   per-leaf replacements. Unchanged leaves keep their original source
 *   slice (preserves comments, trailing whitespace, escapes). Cannot
 *   add or remove keys; for that, use `emitJsoncWithObject`.
 * - `emitJsoncWithObject(doc, newRoot)` — full structural mutation. Walks
 *   the AST and the new value tree in lockstep. Re-emits each object
 *   container with normalized `JSON.stringify(_, null, 2)`-style
 *   formatting, recursing on persisted members so unchanged leaves
 *   keep their original source slice (cosmetic forms like `1.0` vs `1`
 *   survive). Comments that live inside an unchanged subtree are
 *   preserved; comments at object-member level (between members of a
 *   re-emitted container) are NOT preserved. For full comment fidelity
 *   on leaf-only diffs, callers should prefer `emitJsoncWithMutation`.
 *   The chokepoint dispatcher (io.ts:2082) is responsible for choosing
 *   the right API based on whether the diff is leaf-only or structural.
 *
 * **Byte-identity contract**: when the input source was itself produced
 * by `JSON.stringify(prev, null, 2)` (no comments, default 2-space indent)
 * and the mutator/newRoot doesn't change structure beyond what stringify
 * would have, `emitJsoncWithObject(doc, newValue)` produces output
 * byte-identical to `JSON.stringify(newValue, null, 2)`. This is the
 * load-bearing invariant for upstream backward-compat.
 *
 * **Sentinel rejection**: if any leaf in `newRoot` is the exact string
 * `"__OPENCLAW_REDACTED__"`, both mutation APIs throw `OcEmitSentinelError`
 * instead of writing the literal to disk. Substrate-level defense
 * against the redaction-corruption pattern (#62281, #44357, #13495,
 * #21573, #13210, #12078).
 *
 * **JSON5 input → JSONC output (mixed-dialect normalization)**: parsed
 * JSON5-only constructs (single-quoted strings, unquoted keys, hex
 * literals, `Infinity` / `NaN`, etc.) round-trip through emit with
 * deterministic but partial normalization:
 *
 *   - `emitJsonc(doc)` returns `doc.source` verbatim — JSON5 dialect
 *     preserved exactly.
 *   - `emitJsoncWithMutation(doc, mutator)` preserves JSON5 source
 *     bytes for unchanged leaves (single-quoted stays single-quoted,
 *     unquoted keys stay unquoted, hex stays hex). MUTATED leaves
 *     are re-serialized via `JSON.stringify(value)` → JSONC dialect
 *     (double-quoted, decimal). Mixed-dialect output is possible.
 *   - `emitJsoncWithObject(doc, newRoot)` re-emits each object
 *     container with normalized stringify-shape — keys become
 *     `"double-quoted"`. Persisted unchanged leaves keep their
 *     original source slice (so single-quoted strings can survive
 *     in unchanged-subtree slices), but the surrounding object
 *     scaffolding is JSONC.
 *
 * Net effect for a JSON5 user file going through the chokepoint:
 * the file shape moves toward JSONC on every mutation. Pure JSONC /
 * JSON inputs are completely unaffected. JSON5-only inputs see a
 * one-time normalization that converges to stable JSONC over a few
 * config-mutating cycles.
 *
 * @module @bic/openclaw-workspace/ast/jsonc/emit
 */

import type {
  JsoncDocument,
  JsoncObjectNode,
  JsoncArrayNode,
  JsoncValue,
} from './ast-types.js';

/**
 * Thrown when emit detects a `"__OPENCLAW_REDACTED__"` literal in the
 * mutation input. Caller should restore the redacted-view origin (read
 * from disk again, NOT from the in-memory redacted snapshot) and retry.
 */
export class OcEmitSentinelError extends Error {
  readonly path: ReadonlyArray<string | number>;
  constructor(path: ReadonlyArray<string | number>) {
    super(
      `emit refused to write "__OPENCLAW_REDACTED__" sentinel literal at ${
        path.length === 0 ? 'root' : path.join('.')
      }. The input is a redacted view, not real config bytes — caller bug.`,
    );
    this.name = 'OcEmitSentinelError';
    this.path = path;
  }
}

const REDACTED_SENTINEL = '__OPENCLAW_REDACTED__';

export function emitJsonc(doc: JsoncDocument): string {
  return doc.source;
}

/**
 * Mutator returns the new primitive value for a given leaf, or `undefined`
 * to leave the leaf unchanged. Object/array leaves are not mutable through
 * this API — only string/number/boolean/null leaves.
 */
export type LeafMutator = (
  pathSegments: readonly (string | number)[],
  currentValue: string | number | boolean | null,
) => string | number | boolean | null | undefined;

export function emitJsoncWithMutation(doc: JsoncDocument, mutator: LeafMutator): string {
  if (!doc.root) return doc.source;
  // Collect leaf replacements as (range, replacementText) pairs.
  const replacements: { start: number; end: number; text: string }[] = [];
  walk(doc.root, [], mutator, replacements);
  if (replacements.length === 0) return doc.source;
  // Sort by ascending start offset so we can build the output in a single
  // forward pass via array.push + join — O(n+k) instead of the previous
  // slice+concat loop's O(n*k).
  replacements.sort((a, b) => a.start - b.start);
  const parts: string[] = [];
  const src = doc.source;
  let cursor = 0;
  for (const r of replacements) {
    if (r.start > cursor) parts.push(src.slice(cursor, r.start));
    parts.push(r.text);
    cursor = r.end;
  }
  if (cursor < src.length) parts.push(src.slice(cursor));
  return parts.join('');
}

function walk(
  node: JsoncValue,
  path: (string | number)[],
  mutator: LeafMutator,
  replacements: { start: number; end: number; text: string }[],
): void {
  switch (node.kind) {
    case 'object':
      for (const member of node.members) {
        path.push(member.key.value);
        walk(member.value, path, mutator, replacements);
        path.pop();
      }
      return;
    case 'array':
      for (let i = 0; i < node.elements.length; i++) {
        path.push(i);
        walk(node.elements[i]!, path, mutator, replacements);
        path.pop();
      }
      return;
    case 'string':
    case 'number':
    case 'boolean':
    case 'null': {
      const result = mutator(path, node.value);
      if (result === undefined) return;
      replacements.push({
        start: node.range.start,
        end: node.range.end,
        text: serializeLeaf(result),
      });
    }
  }
}

// Numbers serialize via String() — this loses original raw form for cosmetic
// variants (e.g. `1.0` becomes `"1"`, `1e2` becomes `"100"`). Acceptable
// because mutation only fires when the user CHANGED the value; preserving
// the user's prior cosmetic form for a value they replaced would be
// surprising. Strings/booleans/null are bit-stable.
function serializeLeaf(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return JSON.stringify(value);
}

// -- emitJsoncWithObject: structural mutation -------------------------------

/**
 * Emit the document re-shaped to match `newRoot`. Each object container
 * is re-emitted with normalized `JSON.stringify(_, null, 2)`-style
 * formatting; persisted-member values recurse so unchanged leaves keep
 * their original source slice (preserving cosmetic forms and any
 * comments that live INSIDE unchanged subtrees). Inter-member trivia
 * at the re-emitted object level (e.g. `// comment` lines between
 * members) are NOT preserved — for full comment fidelity on leaf-only
 * diffs, use `emitJsoncWithMutation` instead.
 *
 * The output for plain-JSON inputs (no comments, default 2-space indent)
 * is byte-identical to `JSON.stringify(newRoot, null, 2)` followed by
 * a single trailing newline (matching the upstream `replaceConfigFile`
 * convention `.trimEnd().concat("\n")`).
 *
 * Throws `OcEmitSentinelError` if any leaf in `newRoot` equals the
 * `"__OPENCLAW_REDACTED__"` sentinel — substrate defense against
 * writing redacted views to disk.
 */
export function emitJsoncWithObject(doc: JsoncDocument, newRoot: unknown): string {
  // Sentinel-rejection sweep.
  rejectSentinel(newRoot, []);

  // BOM round-trip: structural emit rebuilds the output from the AST,
  // so a BOM at offset 0 of the input would be lost without explicit
  // re-prepend. Both other emit paths (`emitJsonc`, `emitJsoncWithMutation`)
  // preserve BOM via source slicing already.
  const bomPrefix = doc.hadBom ? '﻿' : '';

  // No prior AST to merge against — write fresh stringify.
  if (!doc.root) {
    return bomPrefix + JSON.stringify(newRoot, null, 2) + '\n';
  }

  const out = emitValue(doc.source, doc.root, newRoot, 0);
  // Match the io.ts:2082 convention `.trimEnd().concat("\n")` so that
  // byte-compare tests against `${JSON.stringify(_, null, 2)}\n` pass.
  // We only force a trailing newline if the input was newline-terminated
  // (which it is for stringify-shaped inputs).
  if (doc.source.endsWith('\n') && !out.endsWith('\n')) return bomPrefix + out + '\n';
  if (!doc.source.endsWith('\n') && out.endsWith('\n')) return bomPrefix + out.replace(/\n+$/, '');
  return bomPrefix + out;
}

function rejectSentinel(value: unknown, path: ReadonlyArray<string | number>): void {
  if (typeof value === 'string' && value === REDACTED_SENTINEL) {
    throw new OcEmitSentinelError(path);
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) rejectSentinel(value[i], [...path, i]);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as object)) rejectSentinel(v, [...path, k]);
  }
}

/**
 * Emit a single value. If the AST node is structurally compatible with
 * `newValue`, recurse and preserve source bytes; otherwise re-serialize
 * via `JSON.stringify` with surrounding-indent context.
 */
function emitValue(source: string, ast: JsoncValue, newValue: unknown, indentLevel: number): string {
  if (ast.kind === 'object') {
    if (typeof newValue !== 'object' || newValue === null || Array.isArray(newValue)) {
      // Type change — fall back to stringify with proper indent.
      return stringifyWithIndent(newValue, indentLevel);
    }
    return emitObject(source, ast, newValue as Record<string, unknown>, indentLevel);
  }
  if (ast.kind === 'array') {
    if (!Array.isArray(newValue)) {
      return stringifyWithIndent(newValue, indentLevel);
    }
    return emitArray(source, ast, newValue, indentLevel);
  }
  // Leaf node: if the value is unchanged, emit the original source slice
  // (preserves cosmetic form like `1.0` vs `1`); otherwise re-serialize.
  if (Object.is(ast.value, newValue)) {
    return source.slice(ast.range.start, ast.range.end);
  }
  return serializeLeaf(newValue as string | number | boolean | null);
}

/**
 * Emit an object with structural mutation. Members in the AST that are
 * also in `newObject` keep their source slice (key + colon + leading
 * trivia preserved); the value is recursed. Members in the AST not in
 * `newObject` are dropped. Members in `newObject` not in the AST are
 * appended at the end with default (`JSON.stringify`-style) formatting.
 */
function emitObject(
  source: string,
  ast: JsoncObjectNode,
  newObject: Record<string, unknown>,
  indentLevel: number,
): string {
  const newKeys = Object.keys(newObject);
  const astKeysInOrder = ast.members.map((m) => m.key.value);
  const persistKeys = astKeysInOrder.filter((k) => Object.prototype.hasOwnProperty.call(newObject, k));
  const addedKeys = newKeys.filter((k) => !astKeysInOrder.includes(k));

  // Empty object — short-circuit.
  if (persistKeys.length === 0 && addedKeys.length === 0) {
    return '{}';
  }

  const childIndent = '  '.repeat(indentLevel + 1);
  const closeIndent = '  '.repeat(indentLevel);
  const parts: string[] = [];
  parts.push('{');

  const memberLines: string[] = [];
  for (const member of ast.members) {
    const key = member.key.value;
    if (!Object.prototype.hasOwnProperty.call(newObject, key)) continue; // dropped
    const newVal = newObject[key];
    // Use source slice for the key + key-colon range; recurse on value
    // with the new value. Re-emit with normalized whitespace per
    // stringify shape (key followed by ": ", then value).
    memberLines.push(`${childIndent}${JSON.stringify(key)}: ${emitValue(source, member.value, newVal, indentLevel + 1)}`);
  }
  for (const key of addedKeys) {
    memberLines.push(`${childIndent}${JSON.stringify(key)}: ${stringifyWithIndent(newObject[key], indentLevel + 1)}`);
  }

  parts.push('\n');
  parts.push(memberLines.join(',\n'));
  parts.push('\n');
  parts.push(closeIndent);
  parts.push('}');
  return parts.join('');
}

function emitArray(source: string, ast: JsoncArrayNode, newArr: readonly unknown[], indentLevel: number): string {
  if (newArr.length === 0) return '[]';
  const childIndent = '  '.repeat(indentLevel + 1);
  const closeIndent = '  '.repeat(indentLevel);
  const items: string[] = [];
  for (let i = 0; i < newArr.length; i++) {
    const newItem = newArr[i];
    const astItem = ast.elements[i];
    const itemEmit = astItem !== undefined
      ? emitValue(source, astItem, newItem, indentLevel + 1)
      : stringifyWithIndent(newItem, indentLevel + 1);
    items.push(`${childIndent}${itemEmit}`);
  }
  return `[\n${items.join(',\n')}\n${closeIndent}]`;
}

/**
 * Serialize a value at a specific indent level using `JSON.stringify` with
 * 2-space indent. Used for new subtrees (no AST to merge with) and
 * type-changed leaves. Output matches `JSON.stringify(value, null, 2)`
 * format but with the leading indent consumed by the caller.
 */
function stringifyWithIndent(value: unknown, indentLevel: number): string {
  const raw = JSON.stringify(value, null, 2);
  if (indentLevel === 0) return raw;
  // JSON.stringify produces 2-space indent at depth 0; we want depth =
  // indentLevel. Add `indentLevel` 2-space prefixes to every line except
  // the first.
  const prefix = '  '.repeat(indentLevel);
  return raw.replace(/\n/g, `\n${prefix}`);
}
