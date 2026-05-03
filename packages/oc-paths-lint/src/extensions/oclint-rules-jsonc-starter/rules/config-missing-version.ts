/**
 * Rule: `jsonc-starter-v0/config/missing-version`
 * Severity: info
 * Applies to: *.jsonc
 *
 * Flag: config file lacks a top-level `version` key. Versioning the
 * config makes future migrations safer and supports the LKG-config
 * migration story.
 */
import { parseOcPath, resolveOcPath } from '@bic/oc-paths-substrate';
import type { LintRule } from '../../../plugin-sdk/oc-lint/types.js';

export const configMissingVersion: LintRule = {
  id: 'jsonc-starter-v0/config/missing-version',
  severity: 'info',
  description: 'config file lacks a top-level `version` key',
  appliesTo: '*.jsonc',
  check(ctx) {
    const m = resolveOcPath(ctx.ast, parseOcPath(`oc://${ctx.fileName}/version`));
    if (m !== null) return [];
    return [
      {
        message: `${ctx.fileName}: missing top-level \`version\` key`,
        ocPath: `oc://${ctx.fileName}/version`,
        line: 1,
        fixHint: 'add `"version": "1.0"` (or current schema version)',
      },
    ];
  },
};
