/**
 * Shared test helpers for lint suites.
 *
 * `makeTestSchema(overrides)` produces a `LintSchema` with sensible
 * empty defaults; tests override only the accessors they care about so
 * each test reads independently.
 */

import type { LintSchema, SchemaKind } from '../../src/lint/types.js';
import type { JsoncDocument } from '../../src/ast/jsonc/ast-types.js';

export function makeTestSchema(overrides: Partial<LintSchema> = {}): LintSchema {
  return {
    kindOf: overrides.kindOf ?? ((): SchemaKind => 'unknown'),
    knownChildKeys: overrides.knownChildKeys ?? (() => []),
    requiredChildKeys: overrides.requiredChildKeys ?? (() => []),
    deprecatedKeys: overrides.deprecatedKeys ?? (() => new Map()),
    legacyKeys: overrides.legacyKeys ?? (() => new Map()),
    pluginIdSources: overrides.pluginIdSources ?? (() => []),
  };
}

export function pathString(path: ReadonlyArray<string | number>): string {
  return path.map((s) => (typeof s === 'number' ? `[${s}]` : s)).join('.');
}

export function summary(doc: JsoncDocument): string {
  return `root.kind=${doc.root?.kind ?? 'null'} comments=${doc.comments.length} diagnostics=${doc.diagnostics.length}`;
}
