/**
 * SKILL.md extraction prompt — governance frontmatter, implicit risk signals.
 *
 * Handles both YAML frontmatter (between `---` delimiters) and
 * free-form markdown body. Extracts governance intents from both sections.
 *
 * @module claws-sdk/compile/llm/prompts/skill-extract
 */

import type { LLMExtractionRequest } from '../types.js';
import { withAdversarialGuard } from './adversarial-guard.js';

/** Prompt version — included in cache keys for invalidation. */
export const SKILL_PROMPT_VERSION = '1.0.0';

/**
 * Build the system prompt for SKILL.md extraction.
 *
 * Handles YAML frontmatter + free-form markdown body.
 * Extracts governance from both structured and unstructured sections.
 */
export function buildSkillSystemPrompt(): string {
  const base = [
    'You are a governance intent extraction engine analyzing a SKILL.md file.',
    '',
    'SKILL.md files have two sections:',
    '1. YAML frontmatter (between `---` delimiters) — structured metadata:',
    '   name, description, tools, and governance settings.',
    '2. Markdown body — free-form instructions, usage notes, and governance prose.',
    '',
    'Extract governance intents from BOTH sections.',
    '',
    '## Intent Categories',
    '',
    '### From Frontmatter',
    '',
    '#### Tool Dependencies (kind: "label")',
    'Tools listed in the frontmatter `tools:` array.',
    'Target is "skill_name:tool_name" (e.g., "web-lookup:web-search").',
    'The skill name comes from the `name:` field.',
    '',
    '#### Governance Settings (kind: "require")',
    'Governance fields in frontmatter: `audit`, `approval`, `elicit`.',
    'Target is the skill name. Description includes the governance setting.',
    '  - audit: true => logging is required',
    '  - approval: <role> => the named role must approve',
    '  - elicit: true => user confirmation is required',
    '',
    '### From Markdown Body',
    '',
    '#### Risk Signals (kind: "limit")',
    'Prose that implies risk level — "read-only (R1)", "sends external',
    'communications (R5)", "writes workspace files (R3)".',
    'Target is the skill name. Description includes the risk level.',
    '',
    '#### Deny Constraints (kind: "deny")',
    'Explicit prohibitions in the skill instructions.',
    'Look for: "never", "must not", "do not", "cannot".',
    'Target is the skill name, description includes what is denied.',
    '',
    '#### Elicitation from Prose (kind: "elicit")',
    'Prose requiring user confirmation or review before action.',
    'Look for: "present for review", "user approval", "confirm before".',
    'Target is the skill name, description includes the approval trigger.',
    '',
    '## Output Format',
    '',
    'Return ONLY a JSON array of intent objects. No other text.',
    'Each intent object has these fields:',
    '  - kind: "deny" | "elicit" | "require" | "limit" | "label"',
    '  - target: string (skill name, or skill_name:tool_name for deps)',
    '  - description: string (human-readable explanation)',
    '  - confidence: number (0.0-1.0)',
    '  - line: number (1-based line number in the source)',
    '  - sourceText: string (the original text that anchored this extraction)',
    '  - riskClass: number (1-5, optional, when skill implies a risk level)',
    '',
    'Confidence guidelines:',
    '  - 0.90-1.00: Explicit frontmatter fields (tools, governance.audit)',
    '  - 0.80-0.89: Explicit prose governance ("requires approval")',
    '  - 0.60-0.79: Risk level mentioned in prose ("R1", "read-only")',
    '  - 0.40-0.59: Implied risk from tool names or descriptions',
    '',
    'If the file is empty or has no frontmatter and no governance prose, return `[]`.',
  ].join('\n');

  return withAdversarialGuard(base);
}

/**
 * Build the user prompt for SKILL.md extraction.
 */
export function buildSkillUserPrompt(request: LLMExtractionRequest): string {
  const parts: string[] = [
    `File: ${request.source}`,
    '===',
    request.content,
  ];

  if (request.hints?.knownTools?.length) {
    parts.push('===', `Known tools: ${request.hints.knownTools.join(', ')}`);
  }

  return parts.join('\n');
}
