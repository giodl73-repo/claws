/**
 * SOUL.md extraction prompt — deny constraints, model restrictions, safety boundaries.
 *
 * Outputs typed JSON governance intents with confidence scores.
 * Includes adversarial resistance via shared guard.
 *
 * @module claws-sdk/compile/llm/prompts/soul-extract
 */

import type { LLMExtractionRequest } from '../types.js';
import { withAdversarialGuard } from './adversarial-guard.js';

/** Prompt version — included in cache keys for invalidation. */
export const SOUL_PROMPT_VERSION = '1.0.0';

/**
 * Build the system prompt for SOUL.md extraction.
 *
 * Focuses on deny constraints, model restrictions, and safety boundaries.
 */
export function buildSoulSystemPrompt(): string {
  const base = [
    'You are a governance intent extraction engine analyzing a SOUL.md file.',
    '',
    'SOUL.md defines the agent\'s persona, purpose, and behavioral constraints.',
    'Extract governance intents from the following categories:',
    '',
    '## Intent Categories',
    '',
    '### Deny Constraints (kind: "deny")',
    'Lines containing "never", "must not", "do not", "cannot", "prohibited",',
    '"forbidden", or similar prohibitive language. These are high-confidence',
    'safety boundaries. Target should be the tool, action, or resource being denied.',
    '',
    '### Model Restrictions (kind: "limit")',
    'Lines specifying which models are allowed or disallowed.',
    'Target should be the model name or pattern (e.g., "gpt-4o", "claude-*").',
    '',
    '### Safety Boundaries (kind: "require")',
    'Lines mandating specific behaviors — "always", "must", "required".',
    'Target should be the required behavior or tool.',
    '',
    '### Data Labels (kind: "label")',
    'Lines classifying data sensitivity — "confidential", "internal", "restricted".',
    'Target should be the data category.',
    '',
    '### Elicitation Gates (kind: "elicit")',
    'Lines requiring human approval or confirmation before actions.',
    'Target should be the action requiring approval.',
    '',
    '## Output Format',
    '',
    'Return ONLY a JSON array of intent objects. No other text.',
    'Each intent object has these fields:',
    '  - kind: "deny" | "elicit" | "require" | "limit" | "label"',
    '  - target: string (what the intent applies to)',
    '  - description: string (human-readable explanation)',
    '  - confidence: number (0.0-1.0)',
    '  - line: number (1-based line number in the source)',
    '  - sourceText: string (the original text that anchored this extraction)',
    '  - riskClass: number (1-5, optional, only when the intent implies a risk level)',
    '',
    'Confidence guidelines:',
    '  - 0.90-1.00: Explicit prohibitions ("never", "must not")',
    '  - 0.75-0.89: Strong mandates ("always", "required")',
    '  - 0.50-0.74: Moderate guidance ("should", "prefer")',
    '  - 0.25-0.49: Weak signals ("consider", "be careful")',
    '',
    'If the file is empty or contains no governance-relevant content, return `[]`.',
  ].join('\n');

  return withAdversarialGuard(base);
}

/**
 * Build the user prompt for SOUL.md extraction.
 */
export function buildSoulUserPrompt(request: LLMExtractionRequest): string {
  const parts: string[] = [
    `File: ${request.source}`,
    '---',
    request.content,
  ];

  if (request.hints?.knownTools?.length) {
    parts.push('---', `Known tools: ${request.hints.knownTools.join(', ')}`);
  }

  return parts.join('\n');
}
