/**
 * Registry of all workspace-level lint rules. Each rule cites specific
 * upstream issues in its `evidenceIssues` field — `grep '@evidence'`
 * over `src/lint/workspace-rules/*.ts` returns the same list.
 *
 * Coverage: 8 evidence-anchored rules.
 *   • Memory (4): OC_MEMORY_HOOK_TOO_LONG, OC_MEMORY_INDEX_OVER_LIMIT,
 *     OC_MEMORY_DEAD_LINK, OC_MEMORY_RAW_CANDIDATE_LEAK
 *   • Skills (3): OC_SKILL_NAME_MISMATCH, OC_SKILL_TOO_LONG,
 *     OC_SKILL_DEAD_PATH
 *   • Agents (1): OC_AGENTS_MODEL_NOT_APPROVED
 *
 * @module @bic/openclaw-workspace/lint/workspace-registry
 */

import { agentsModelNotApprovedRule } from './workspace-rules/agents-model-not-approved.js';
import { memoryDeadLinkRule } from './workspace-rules/memory-dead-link.js';
import { memoryHookTooLongRule } from './workspace-rules/memory-hook-too-long.js';
import { memoryIndexOverLimitRule } from './workspace-rules/memory-index-over-limit.js';
import { memoryRawCandidateLeakRule } from './workspace-rules/memory-raw-candidate-leak.js';
import { skillDeadPathRule } from './workspace-rules/skill-dead-path.js';
import { skillNameMismatchRule } from './workspace-rules/skill-name-mismatch.js';
import { skillTooLongRule } from './workspace-rules/skill-too-long.js';
import type { WorkspaceLintRule } from './workspace-types.js';

export const ALL_WORKSPACE_RULES: readonly WorkspaceLintRule[] = [
  // Memory rules
  memoryHookTooLongRule,
  memoryIndexOverLimitRule,
  memoryDeadLinkRule,
  memoryRawCandidateLeakRule,
  // Skill rules
  skillNameMismatchRule,
  skillTooLongRule,
  skillDeadPathRule,
  // Agents rules
  agentsModelNotApprovedRule,
];
