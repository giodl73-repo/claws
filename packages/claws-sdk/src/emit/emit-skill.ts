/**
 * SKILL.md emitter — generates a governance advisory prompt (L1)
 * from GovernanceIR.
 *
 * SKILL.md is self-sufficient for advisory-only platforms that lack
 * hook APIs. Uses pinch compression (basic governance profile) for
 * token-efficient instructions, preserving safety-critical keywords
 * (R5, DENY, OBO) while compressing non-critical text.
 *
 * Size management: inline mode for <= 20 tools, reference mode above.
 *
 * Key constraints:
 * - No provenance markers — no claws/compiler references in output
 * - Safety-critical keywords never compressed (R5, DENY, OBO, BLOCK)
 * - Self-sufficient for advisory-only platforms
 * - Cross-artifact consistency: R5 tool list matches exec-approvals
 *
 * @module claws-sdk/emit/emit-skill
 */

import type { GovernanceIR } from '../ir/governance-ir.js';
import type { DenyIntent, ElicitIntent } from '../ir/mechanical-intent.js';

/**
 * Options for SKILL.md generation.
 */
export interface EmitSkillOptions {
  /** Whether to apply pinch compression. Default: true. */
  readonly compress?: boolean;
  /** Inline/reference threshold (tool count). Default: 20. */
  readonly inlineThreshold?: number;
}

/**
 * Result of SKILL.md generation.
 */
export interface EmitSkillResult {
  /** The generated SKILL.md content. */
  readonly content: string;
  /** Whether inline or reference mode was used. */
  readonly mode: 'inline' | 'reference';
  /** Warnings produced during generation. */
  readonly warnings: readonly string[];
}

/**
 * Inline tool threshold — above this count, switch to reference mode.
 */
const DEFAULT_INLINE_THRESHOLD = 20;

/**
 * Safety-critical keywords that must survive pinch compression.
 * These are governance tokens that carry enforcement semantics.
 */
const SAFETY_KEYWORDS = new Set([
  'R5',
  'DENY',
  'BLOCK',
  'NEVER',
  'MUST',
  'OBO',
  'REQUIRE',
  'APPROVAL',
]);

/**
 * Generate a governance SKILL.md from a GovernanceIR.
 *
 * @param ir - The compiled GovernanceIR
 * @param options - Generation options
 * @returns SKILL.md content with mode and warnings
 */
export function emitSkill(
  ir: GovernanceIR,
  options: EmitSkillOptions = {},
): EmitSkillResult {
  const compress = options.compress ?? true;
  const inlineThreshold = options.inlineThreshold ?? DEFAULT_INLINE_THRESHOLD;
  const warnings: string[] = [];

  const toolCount = ir.capabilities.tools.length;
  const mode: 'inline' | 'reference' = toolCount > inlineThreshold ? 'reference' : 'inline';

  if (mode === 'reference') {
    warnings.push(
      `P-076: ${toolCount} tools exceeds inline threshold (${inlineThreshold}) — using reference mode`,
    );
  }

  const sections: string[] = [];

  // Preamble — governance advisory (no provenance markers)
  sections.push('# Governance Advisory');
  sections.push('');
  sections.push(
    'This workspace is governed. You MUST follow the enforcement rules below.',
  );
  sections.push(
    'Violations are logged and may result in tool calls being blocked.',
  );
  sections.push('');

  // R5 deny rules — always inline regardless of mode
  const denyIntents = ir.intents.filter(
    (i): i is DenyIntent => i.kind === 'deny',
  );
  if (denyIntents.length > 0) {
    sections.push('## Blocked Tools');
    sections.push('');
    sections.push(
      'The following tools are BLOCKED at R5. You MUST NEVER call them.',
    );
    sections.push('Any attempt will be denied.',
    );
    sections.push('');
    for (const intent of denyIntents) {
      sections.push(
        `- **${intent.target}**: DENY — ${intent.reason}`,
      );
    }
    sections.push('');
  }

  // Elicitation / OBO rules
  const elicitIntents = ir.intents.filter(
    (i): i is ElicitIntent => i.kind === 'elicit',
  );
  const oboTools = ir.capabilities.tools.filter((t) => t.oboFlag);
  if (elicitIntents.length > 0 || oboTools.length > 0) {
    sections.push('## Approval Required');
    sections.push('');
    sections.push(
      'The following tools operate on-behalf-of (OBO) the user and REQUIRE explicit approval.',
    );
    sections.push('');
    for (const intent of elicitIntents) {
      sections.push(
        `- **${intent.target}**: REQUIRE APPROVAL — ${intent.prompt}`,
      );
    }
    for (const tool of oboTools) {
      const alreadyCovered = elicitIntents.some((i) => i.target === tool.name);
      if (!alreadyCovered) {
        sections.push(
          `- **${tool.name}**: OBO tool — REQUIRE APPROVAL before use`,
        );
      }
    }
    sections.push('');
  }

  // Tool policy list — inline or reference
  if (mode === 'inline') {
    sections.push('## Tool Governance');
    sections.push('');
    for (const tool of ir.capabilities.tools) {
      const riskLabel = tool.riskLevel.toUpperCase();
      const oboLabel = tool.oboFlag ? ' [OBO]' : '';
      sections.push(
        `- **${tool.name}** (${riskLabel}${oboLabel}): ${tool.description}`,
      );
    }
    sections.push('');
  } else {
    // Reference mode — list only critical tools, point to full policy
    const criticalTools = ir.capabilities.tools.filter(
      (t) => t.riskLevel === 'critical' || t.riskLevel === 'high',
    );
    sections.push('## Tool Governance');
    sections.push('');
    sections.push(
      `This workspace has ${toolCount} governed tools. ` +
      'Consult the full list in the policy reference for complete details.',
    );
    sections.push('');
    if (criticalTools.length > 0) {
      sections.push('### Critical & High-Risk Tools');
      sections.push('');
      for (const tool of criticalTools) {
        const oboLabel = tool.oboFlag ? ' [OBO]' : '';
        sections.push(
          `- **${tool.name}** (${tool.riskLevel.toUpperCase()}${oboLabel}): ${tool.description}`,
        );
      }
      sections.push('');
    }
  }

  // Enforcement summary
  const plan = ir.analysis.enforcementPlan;
  if (plan.blockedTools.length > 0 || plan.requiredApprovals.length > 0) {
    sections.push('## Enforcement Summary');
    sections.push('');
    if (plan.blockedTools.length > 0) {
      sections.push(
        `- **Blocked**: ${plan.blockedTools.join(', ')}`,
      );
    }
    if (plan.requiredApprovals.length > 0) {
      sections.push(
        `- **REQUIRE APPROVAL**: ${plan.requiredApprovals.join(', ')}`,
      );
    }
    sections.push('');
  }

  let content = sections.join('\n');

  // Apply pinch compression if enabled
  if (compress) {
    content = pinchCompress(content);
  }

  return { content, mode, warnings };
}

/**
 * Pinch compression for governance SKILL.md — basic governance profile.
 *
 * Compresses non-critical text while preserving safety-critical keywords.
 * The compression is conservative: only removes filler words and redundant
 * whitespace, never altering governance semantics.
 *
 * @param text - Raw SKILL.md text
 * @returns Compressed text with safety keywords preserved
 */
function pinchCompress(text: string): string {
  // Split into lines to process individually
  const lines = text.split('\n');
  const compressed: string[] = [];

  for (const line of lines) {
    // Never compress headings or empty lines
    if (line.startsWith('#') || line.trim() === '') {
      compressed.push(line);
      continue;
    }

    // Never compress lines containing safety-critical keywords
    if (containsSafetyKeyword(line)) {
      compressed.push(line);
      continue;
    }

    // Compress non-critical lines: remove filler words
    let compressedLine = line;
    compressedLine = compressedLine.replace(/\b(the|a|an|that|which|this)\b /gi, '');
    compressedLine = compressedLine.replace(/\b(is|are|will be|has been)\b /gi, '');
    compressedLine = compressedLine.replace(/\s{2,}/g, ' ');
    compressedLine = compressedLine.trimEnd();

    compressed.push(compressedLine);
  }

  return compressed.join('\n');
}

/**
 * Check whether a line contains any safety-critical keyword.
 */
function containsSafetyKeyword(line: string): boolean {
  const upper = line.toUpperCase();
  for (const keyword of SAFETY_KEYWORDS) {
    if (upper.includes(keyword)) {
      return true;
    }
  }
  return false;
}
