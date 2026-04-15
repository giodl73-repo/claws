/**
 * TOOLS.md extraction prompt — tool risk classification, OBO flags, data labels.
 *
 * Outputs typed JSON governance intents with confidence scores.
 * Includes adversarial resistance via shared guard.
 *
 * @module claws-sdk/compile/llm/prompts/tools-extract
 */

import type { LLMExtractionRequest } from '../types.js';
import { withAdversarialGuard } from './adversarial-guard.js';

/** Prompt version — included in cache keys for invalidation. */
export const TOOLS_PROMPT_VERSION = '1.0.0';

/**
 * Build the system prompt for TOOLS.md extraction.
 *
 * Focuses on tool declarations, risk classification, and OBO flags.
 */
export function buildToolsSystemPrompt(): string {
  const base = [
    'You are a governance intent extraction engine analyzing a TOOLS.md file.',
    '',
    'TOOLS.md declares available tools, their risk classifications, and governance rules.',
    'Extract governance intents from the following categories:',
    '',
    '## Intent Categories',
    '',
    '### Tool Risk Labels (kind: "label")',
    'Each tool declaration with a risk level (R1-R5). Target is the tool name.',
    'Risk levels:',
    '  - R1: computation only (pure, no side effects)',
    '  - R2: file system access (read)',
    '  - R3: file system access (write) or external API (read)',
    '  - R4: production read access, authenticated APIs',
    '  - R5: production write access, external communications',
    '',
    '### OBO Flags (kind: "elicit")',
    'Tools that operate on-behalf-of another principal require elicitation.',
    'Look for: "on behalf of", "OBO", "as the user", "impersonate".',
    'Target is the tool name with the OBO flag.',
    '',
    '### Approval Gates (kind: "require")',
    'Tools that require approval from specific roles before execution.',
    'Look for: "approval required", "requires approval", "sign-off".',
    'Target is the tool name, description includes the approver role.',
    '',
    '### Access Restrictions (kind: "deny")',
    'Tools that are explicitly denied or blocked under certain conditions.',
    'Look for: "never", "blocked", "disabled", "not allowed".',
    'Target is the tool name.',
    '',
    '### Data Sensitivity (kind: "limit")',
    'Tool-level data handling constraints.',
    'Look for: "logged", "audit", "encrypted", "retention".',
    'Target is the tool name, description includes the data constraint.',
    '',
    '## Output Format',
    '',
    'Return ONLY a JSON array of intent objects. No other text.',
    'Each intent object has these fields:',
    '  - kind: "deny" | "elicit" | "require" | "limit" | "label"',
    '  - target: string (tool name)',
    '  - description: string (human-readable, include risk level and governance)',
    '  - confidence: number (0.0-1.0)',
    '  - line: number (1-based line number in the source)',
    '  - sourceText: string (the original text that anchored this extraction)',
    '  - riskClass: number (1-5, required for tool risk labels — maps to R1-R5)',
    '',
    'Confidence guidelines:',
    '  - 0.90-1.00: Explicit risk level declaration ("Risk: R5")',
    '  - 0.80-0.89: Explicit governance rule ("approval required")',
    '  - 0.60-0.79: Implied governance ("logged", "audit-only")',
    '  - 0.40-0.59: Weak signals (general description without explicit rules)',
    '',
    'If the file is empty or contains no tool declarations, return `[]`.',
  ].join('\n');

  return withAdversarialGuard(base);
}

/**
 * Build the user prompt for TOOLS.md extraction.
 */
export function buildToolsUserPrompt(request: LLMExtractionRequest): string {
  const parts: string[] = [
    `File: ${request.source}`,
    '---',
    request.content,
  ];

  if (request.hints?.knownAgents?.length) {
    parts.push('---', `Known agents: ${request.hints.knownAgents.join(', ')}`);
  }

  return parts.join('\n');
}
