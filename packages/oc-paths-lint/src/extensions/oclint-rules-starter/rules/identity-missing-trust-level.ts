/**
 * Rule: `starter-v0/identity/missing-trust-level`
 * Severity: info
 * Applies to: IDENTITY.md
 *
 * Flag: IDENTITY.md has no `## Trust Level` section. The runtime
 * prompts the agent with the workspace's stated trust level (e.g.,
 * "internal-trusted" vs "external-anonymous"); missing means the
 * agent operates at default (least-privileged) trust.
 *
 * **Teaching pattern**: same as missing-boundaries — `resolveOcPath`
 * is the section-existence answer.
 */
import { parseOcPath, resolveOcPath } from '@bic/oc-paths-substrate';
import type { LintRule } from '../../../plugin-sdk/oc-lint/types.js';

export const identityMissingTrustLevel: LintRule = {
  id: 'starter-v0/identity/missing-trust-level',
  severity: 'info',
  description: 'IDENTITY.md has no ## Trust Level section',
  appliesTo: 'IDENTITY.md',
  check(ctx) {
    if (ctx.ast.kind !== 'md') return [];
    if (resolveOcPath(ctx.ast, parseOcPath('oc://IDENTITY.md/trust-level')) !== null) return [];
    return [
      {
        message: 'IDENTITY.md has no ## Trust Level section',
        ocPath: 'oc://IDENTITY.md',
        line: 1,
        fixHint: 'add a `## Trust Level` section (e.g., `internal-trusted`, `external-anonymous`)',
      },
    ];
  },
};
