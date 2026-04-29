/**
 * Example `LintSchema` implementation showing how a downstream consumer
 * (claws-sdk, doctor-config-lint contribution, editor extension) wires
 * up schema-aware lint rules.
 *
 * **This file is documentation, not runtime code.** It is excluded from
 * the package build and exists only to give upstream reviewers and
 * downstream integrators a copy-pasteable starting point.
 *
 * The 7 methods on `LintSchema` are independent — return safe defaults
 * (empty arrays, empty maps, `null` for opt-in-only methods like
 * `approvedAgentModels`) for any you don't need yet. Schema-aware rules
 * silently no-op when their schema input is empty / null.
 *
 * @module @bic/openclaw-workspace/examples/example-schema
 */

import type {
  JsoncDocument,
  LintSchema,
  SchemaKind,
} from '../src/lint/types.js';

/**
 * Minimal `LintSchema` showing the canonical OpenClaw config shape.
 * Trims to the keys / kinds you actually need; everything else can
 * return safe defaults.
 *
 * Pair this with `lint(doc, { schema: exampleConfigSchema() })` or
 * `lintWorkspace(ctx, { schema: exampleConfigSchema() })` to see
 * schema-aware rules fire (`OC_CFG_UNKNOWN_FIELD`,
 * `OC_CFG_DEPRECATED_FIELD`, `OC_CFG_TYPE_MISMATCH`,
 * `OC_AGENTS_MODEL_NOT_APPROVED`, etc.).
 */
export function exampleConfigSchema(): LintSchema {
  return {
    /**
     * Type-of-leaf-at-path lookup. Used by `OC_CFG_TYPE_MISMATCH` to
     * detect e.g. `gateway.port: "18789"` (string when number expected).
     */
    kindOf(path): SchemaKind {
      const key = path.join('.');
      switch (key) {
        case 'gateway.port':
          return 'number';
        case 'gateway.mode':
        case '$schema':
          return 'string';
        case 'gateway':
        case 'agents':
        case 'channels':
          return 'object';
        case 'agents.list':
          return 'array';
      }
      return 'unknown';
    },

    /**
     * Known child keys at an object path. Used by
     * `OC_CFG_UNKNOWN_FIELD` for did-you-mean suggestions and to flag
     * typos.
     */
    knownChildKeys(path) {
      const key = path.join('.');
      if (key === '') return ['$schema', 'gateway', 'agents', 'channels'];
      if (key === 'gateway') return ['mode', 'port'];
      if (key === 'agents') return ['list', 'defaultAgent'];
      return [];
    },

    /**
     * Required child keys at an object path. Used by
     * `OC_CFG_MISSING_REQUIRED_FIELD`. Most paths can return `[]`.
     */
    requiredChildKeys(path) {
      if (path.length === 0) return ['gateway'];
      if (path.join('.') === 'gateway') return ['mode'];
      return [];
    },

    /**
     * Deprecated keys at an object path → optional replacement key.
     * Used by `OC_CFG_DEPRECATED_FIELD`. Map value is the new key
     * name, or `null` if there's no direct replacement.
     */
    deprecatedKeys(path) {
      if (path.join('.') === 'agents.defaults') {
        // Per upstream issue #72872: 2026.4.24 schema validator
        // rejects this key.
        return new Map([['agentRuntime', null]]);
      }
      return new Map();
    },

    /**
     * Legacy keys with auto-migration available (split from deprecated
     * so renderers can show "this auto-migrates" affordance). Used by
     * `OC_CFG_LEGACY_FIELD`.
     */
    legacyKeys(_path) {
      return new Map();
    },

    /**
     * Plugin-id sources — paths whose values participate in plugin-id
     * uniqueness. Used by `OC_CFG_PLUGIN_ID_COLLISION`.
     */
    pluginIdSources(_doc: JsoncDocument) {
      return [];
    },

    /**
     * Approved agent model allow-list. Returns `null` when there is no
     * policy (rule no-ops). Returning a non-null array activates
     * `OC_AGENTS_MODEL_NOT_APPROVED`. Per upstream issue #73715,
     * comparison is case-sensitive — case mismatch is itself the bug.
     */
    approvedAgentModels() {
      return [
        // Anthropic
        'claude-opus-4-7',
        'claude-sonnet-4-6',
        'claude-haiku-4-5',
        // OpenAI (provider-prefixed example)
        'openai/gpt-4o-2026-03-15',
      ];
    },
  };
}

/**
 * Minimal "no policy" schema — every method returns the safest
 * defaults. Useful when you want JSONC AST-only rules to fire (the 13
 * existing rules that don't need schema) and explicitly opt out of all
 * schema-aware rules. Equivalent to passing `undefined` for `schema`
 * but more explicit / type-safe.
 */
export function noPolicySchema(): LintSchema {
  return {
    kindOf: () => 'unknown',
    knownChildKeys: () => [],
    requiredChildKeys: () => [],
    deprecatedKeys: () => new Map(),
    legacyKeys: () => new Map(),
    pluginIdSources: () => [],
    approvedAgentModels: () => null,
  };
}
