/**
 * Rule: `jsonc-starter-v0/config/missing-plugins`
 * Severity: info
 * Applies to: *.jsonc
 *
 * Flag: a config file lacks a top-level `plugins` key. Almost every
 * openclaw config has at least an empty plugins block; missing means
 * authoring-in-progress or wrong-file.
 *
 * **Teaching pattern**: this rule uses the universal `resolveOcPath`
 * to check existence of the address. No direct AST traversal needed
 * for a simple presence check.
 */
import { parseOcPath, resolveOcPath } from '@bic/oc-paths-substrate';
import type { LintRule } from '../../../plugin-sdk/oc-lint/types.js';

export const configMissingPlugins: LintRule = {
  id: 'jsonc-starter-v0/config/missing-plugins',
  severity: 'info',
  description: 'config file lacks a top-level `plugins` key',
  appliesTo: '*.jsonc',
  check(ctx) {
    const m = resolveOcPath(ctx.ast, parseOcPath(`oc://${ctx.fileName}/plugins`));
    if (m !== null) return [];
    return [
      {
        message: `${ctx.fileName}: missing top-level \`plugins\` key`,
        ocPath: `oc://${ctx.fileName}/plugins`,
        line: 1,
        fixHint: 'add a top-level `"plugins": { "entries": {} }` block',
      },
    ];
  },
};
