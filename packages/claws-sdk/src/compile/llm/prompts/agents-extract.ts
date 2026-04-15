/**
 * AGENTS.md extraction prompt — delegation edges, tool assignments, trust levels.
 *
 * Outputs typed JSON governance intents with confidence scores.
 * Includes adversarial resistance via shared guard.
 *
 * @module claws-sdk/compile/llm/prompts/agents-extract
 */

import type { LLMExtractionRequest } from '../types.js';
import { withAdversarialGuard } from './adversarial-guard.js';

/** Prompt version — included in cache keys for invalidation. */
export const AGENTS_PROMPT_VERSION = '1.0.0';

/**
 * Build the system prompt for AGENTS.md extraction.
 *
 * Focuses on agent delegation, tool assignments, and trust boundaries.
 */
export function buildAgentsSystemPrompt(): string {
  const base = [
    'You are a governance intent extraction engine analyzing an AGENTS.md file.',
    '',
    'AGENTS.md declares sub-agents, their tool assignments, delegation edges,',
    'and trust levels. Extract governance intents from the following categories:',
    '',
    '## Intent Categories',
    '',
    '### Delegation Edges (kind: "limit")',
    'Agent-to-agent delegation relationships ("delegates_to", "can delegate to").',
    'Target is "from_agent -> to_agent" (e.g., "research-agent -> action-agent").',
    'These define the delegation graph topology.',
    '',
    '### Tool Assignments (kind: "label")',
    'Tools assigned to specific agents. Each agent-tool pair is a separate intent.',
    'Target is "agent_name:tool_name" (e.g., "research-agent:web-search").',
    '',
    '### Trust Boundaries (kind: "require")',
    'Governance constraints inherited by agents or applied to specific agents.',
    'Look for: "inherits", "constrained by", "must follow", "governance".',
    'Target is the agent name, description includes the constraint.',
    '',
    '### Denied Capabilities (kind: "deny")',
    'Explicit restrictions on agent capabilities.',
    'Look for: "never", "read-only", "cannot", "must not".',
    'Target is the agent name, description includes what is denied.',
    '',
    '### Elicitation Requirements (kind: "elicit")',
    'Agent operations that require human approval.',
    'Look for: "requires approval", "human-in-the-loop", "elicitation".',
    'Target is the agent name, description includes the approval trigger.',
    '',
    '## Output Format',
    '',
    'Return ONLY a JSON array of intent objects. No other text.',
    'Each intent object has these fields:',
    '  - kind: "deny" | "elicit" | "require" | "limit" | "label"',
    '  - target: string (agent name, delegation edge, or agent:tool pair)',
    '  - description: string (human-readable explanation)',
    '  - confidence: number (0.0-1.0)',
    '  - line: number (1-based line number in the source)',
    '  - sourceText: string (the original text that anchored this extraction)',
    '  - riskClass: number (1-5, optional, when agent tools imply a risk level)',
    '',
    'Confidence guidelines:',
    '  - 0.90-1.00: Explicit delegation or tool assignment ("tools: [...]")',
    '  - 0.80-0.89: Explicit governance constraint ("inherits SOUL constraints")',
    '  - 0.60-0.79: Implied constraints (from agent description)',
    '  - 0.40-0.59: Weak signals (general agent description)',
    '',
    'If the file is empty or contains no agent declarations, return `[]`.',
  ].join('\n');

  return withAdversarialGuard(base);
}

/**
 * Build the user prompt for AGENTS.md extraction.
 */
export function buildAgentsUserPrompt(request: LLMExtractionRequest): string {
  const parts: string[] = [
    `File: ${request.source}`,
    '---',
    request.content,
  ];

  if (request.hints?.knownTools?.length) {
    parts.push('---', `Known tools: ${request.hints.knownTools.join(', ')}`);
  }
  if (request.hints?.knownAgents?.length) {
    parts.push(`Known agents: ${request.hints.knownAgents.join(', ')}`);
  }

  return parts.join('\n');
}
