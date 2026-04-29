/**
 * `OC_AGENTS_MODEL_NOT_APPROVED` — flag AGENTS.md `model:` fields that
 * don't appear in the schema-injected approved-model allow-list.
 *
 * Evidence:
 *   - #73715 — `--model anthropic/CLAUDE-OPUS-4-7` (case-mismatched
 *     model name) is dispatched, returns "No text output". The runtime
 *     accepts the field, fails opaquely. Lint catches it pre-runtime.
 *   - #39811 — Model configuration accepts unvalidated model names,
 *     enabling silent misconfiguration. Direct match.
 *
 * Schema-DI behavior: the rule consults `schema.approvedAgentModels()`.
 * If the schema doesn't provide one (returns null OR the schema arg is
 * absent entirely), the rule silently no-ops — there is no policy to
 * enforce. This keeps the rule opt-in by default and avoids forcing
 * upstream to maintain an allow-list before they've decided what the
 * policy is.
 *
 * Match semantics: case-sensitive equality. Per #73715, case mismatch
 * IS the bug — `claude-opus-4-7` vs `CLAUDE-OPUS-4-7` are distinct
 * surface forms and the runtime treats them differently. The lint
 * surfaces the unapproved form so the user can normalize before
 * dispatch fails opaquely.
 *
 * **Provider-prefix handling**: the rule splits on the LAST `/` and
 * matches against either the full string or the trailing component.
 * So `anthropic/claude-opus-4-7` matches when the schema lists either
 * `anthropic/claude-opus-4-7` or `claude-opus-4-7`. Three-component
 * values like `litellm/anthropic/claude-opus-4-7` match against
 * `claude-opus-4-7` (the trailing component). Schemas should list
 * either bare model names OR provider-qualified names — mixing rules
 * is each schema's choice.
 *
 * **Empty `model:` value**: skipped silently. "Missing model" is a
 * separate concern; future `OC_AGENTS_MISSING_MODEL` rule would catch it.
 *
 * Severity 'error' — the runtime is known to fail opaquely on
 * unapproved model names. Catching at lint time prevents a confusing
 * "No text output" runtime symptom.
 *
 * @evidence #73715 #39811
 * @module @bic/openclaw-workspace/lint/workspace-rules/agents-model-not-approved
 */

import type { AgentsAst } from '../../ast/ast-types.js';
import type {
  MarkdownLintFindingDraft,
  WorkspaceContext,
  WorkspaceLintRule,
} from '../workspace-types.js';
import type { LintSchema } from '../types.js';

export const agentsModelNotApprovedRule: WorkspaceLintRule = {
  code: 'OC_AGENTS_MODEL_NOT_APPROVED',
  severity: 'error',
  evidenceIssues: [73715, 39811],
  run(ctx: WorkspaceContext, schema: LintSchema | undefined): readonly MarkdownLintFindingDraft[] {
    if (schema?.approvedAgentModels === undefined) return [];
    const approved = schema.approvedAgentModels();
    if (approved === null) return [];
    const approvedSet = new Set(approved);

    const drafts: MarkdownLintFindingDraft[] = [];
    for (const file of ctx.files) {
      if (file.kind !== 'agents') continue;
      const ast = file.ast as AgentsAst;
      for (const agent of ast.agents) {
        for (const field of agent.fields) {
          if (field.key !== 'model') continue;
          const declared = field.value;
          // Skip empty `model:` values — that's a missing-required
          // concern, not an unapproved-name concern.
          if (declared.length === 0) continue;
          const bareName = declared.includes('/')
            ? declared.slice(declared.lastIndexOf('/') + 1)
            : declared;
          // Accept either qualified (provider/model) or bare-model match.
          if (approvedSet.has(declared) || approvedSet.has(bareName)) continue;
          drafts.push({
            source: 'markdown',
            code: 'OC_AGENTS_MODEL_NOT_APPROVED',
            severity: 'error',
            message: `agent '${agent.name}' uses model '${declared}' which is not in the approved allow-list; runtime may dispatch with no output (#73715, #39811). Approved: ${[...approvedSet].slice(0, 5).join(', ')}${approvedSet.size > 5 ? ', …' : ''}`,
            relPath: file.relPath,
            line: field.line,
          });
        }
      }
    }
    return drafts;
  },
};
