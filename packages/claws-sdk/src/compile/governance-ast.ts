/**
 * GovernanceAST construction — pass 2 of two-pass parsing.
 *
 * Groups per-file intent results into categorized AST nodes with
 * source attribution. Performs cross-reference resolution:
 * - Tool names in SOUL.md deny constraints resolved against TOOLS.md
 * - Agent delegation targets in AGENTS.md resolved against roster
 * - 'all' token in AGENTS.md expanded to full TOOLS.md tool list (P-105)
 *
 * Unresolved references produce diagnostics with edit-distance
 * suggestions (PF1-S03-F05).
 *
 * @module claws-sdk/compile/governance-ast
 */

import type {
  GovernanceAST,
  IntentGroup,
  CrossReference,
  ParseDiagnostic,
  SoulIntent,
  ToolManifestEntry,
  DelegationIntent,
  IdentityIntent,
  AuthorityIntent,
  MemoryIntent,
  ScheduleIntent,
  SkillIntent,
  WorkflowIntent,
  IntentResult,
} from './types.js';
import type { AnyIntentResult } from './intent/index.js';
import { levenshtein } from '../util/levenshtein.js';
import { normalizeName } from '../util/normalize.js';

/**
 * Extract tool name references from a deny intent pattern.
 *
 * Looks for known tool-scoped patterns like "use <tool-name>" or
 * direct tool name matches.
 */
function extractToolRefsFromDeny(
  intent: SoulIntent,
  toolIndex: Map<string, ToolManifestEntry>,
): string[] {
  const refs: string[] = [];
  const pattern = intent.pattern.toLowerCase();

  // Try to find tool names in the pattern text
  // Look for "use <word>" pattern
  const useMatch = /\buse\s+(\S+)/.exec(pattern);
  if (useMatch) {
    refs.push(useMatch[1]!);
  }

  // Also check if any known tool name appears directly in the pattern
  for (const normalizedName of toolIndex.keys()) {
    if (pattern.includes(normalizedName) && !refs.includes(normalizedName)) {
      refs.push(normalizedName);
    }
  }

  return refs;
}

/**
 * Find the closest match from the symbol table for a given name.
 *
 * Returns the match if Levenshtein distance <= 2, or undefined.
 */
function findClosestMatch(
  name: string,
  symbolTable: Map<string, ToolManifestEntry>,
): string | undefined {
  let bestMatch: string | undefined;
  let bestDistance = 3; // threshold: distance must be <= 2

  for (const candidate of symbolTable.keys()) {
    const distance = levenshtein(name, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

/**
 * Resolve 'all' token in AGENTS.md delegation to concrete tool list.
 *
 * Per P-105: "tools: all" expands to the full TOOLS.md tool list.
 * Per PC1-S05-F02: R4+ tools included via 'all' produce IMPLICIT-R4-DELEGATION warnings.
 */
function resolveAllToken(
  delegation: DelegationIntent,
  allToolNames: readonly string[],
  highRiskTools: readonly ToolManifestEntry[],
  diagnostics: ParseDiagnostic[],
): DelegationIntent {
  const hasAll = delegation.tools.some(t => t.toLowerCase() === 'all');
  if (!hasAll) return delegation;

  // Produce warnings for R4+ tools included via 'all'
  for (const tool of highRiskTools) {
    diagnostics.push({
      severity: 'warning',
      message: `IMPLICIT-R4-DELEGATION: delegation from "${delegation.from}" to "${delegation.to}" includes R${tool.riskClass} tool "${tool.name}" via 'all' token`,
      file: 'AGENTS.md',
      line: delegation.line,
      code: 'CLAWS-X002',
    });
  }

  return {
    ...delegation,
    tools: allToolNames,
  };
}

/**
 * Build the GovernanceAST from per-file intent results.
 *
 * Pass 2 of two-pass parsing:
 * 1. Groups intents by category with source file attribution
 * 2. Builds symbol table from TOOLS.md tool declarations
 * 3. Resolves deny constraint tool references against symbol table
 * 4. Resolves 'all' token in AGENTS.md delegations
 * 5. Produces diagnostics for unresolved references
 */
export function buildGovernanceAST(intentResults: AnyIntentResult[]): GovernanceAST {
  // ── Step 1: Categorize intents ────────────────────────────────────
  const deny: IntentGroup<SoulIntent>[] = [];
  const tool: IntentGroup<ToolManifestEntry>[] = [];
  const delegation: IntentGroup<DelegationIntent>[] = [];
  const identity: IntentGroup<IdentityIntent>[] = [];
  const authority: IntentGroup<AuthorityIntent>[] = [];
  const memory: IntentGroup<MemoryIntent>[] = [];
  const schedule: IntentGroup<ScheduleIntent>[] = [];
  const skill: IntentGroup<SkillIntent>[] = [];
  const workflow: IntentGroup<WorkflowIntent>[] = [];
  const diagnostics: ParseDiagnostic[] = [];
  const crossReferences: CrossReference[] = [];

  for (const result of intentResults) {
    // Collect diagnostics from intent extraction
    for (const diag of result.diagnostics) {
      diagnostics.push(diag);
    }

    switch (result.source) {
      case 'SOUL.md': {
        const soulResult = result as IntentResult<SoulIntent>;
        // Include both deny and elicit intents — elicit intents are needed
        // by hasElicitationGate() in obo-without-elicit conflict detection (SM-4)
        const governanceIntents = soulResult.intents.filter(
          i => i.intentKind === 'deny' || i.intentKind === 'elicit',
        );
        if (governanceIntents.length > 0) {
          deny.push({ source: result.source, intents: governanceIntents });
        }
        break;
      }
      case 'TOOLS.md': {
        const toolResult = result as IntentResult<ToolManifestEntry>;
        if (toolResult.intents.length > 0) {
          tool.push({ source: result.source, intents: toolResult.intents });
        }
        break;
      }
      case 'AGENTS.md': {
        const agentResult = result as IntentResult<DelegationIntent>;
        if (agentResult.intents.length > 0) {
          delegation.push({ source: result.source, intents: agentResult.intents });
        }
        break;
      }
      case 'IDENTITY.md': {
        const idResult = result as IntentResult<IdentityIntent>;
        if (idResult.intents.length > 0) {
          identity.push({ source: result.source, intents: idResult.intents });
        }
        break;
      }
      case 'USER.md': {
        const userResult = result as IntentResult<AuthorityIntent>;
        if (userResult.intents.length > 0) {
          authority.push({ source: result.source, intents: userResult.intents });
        }
        break;
      }
      case 'MEMORY.md': {
        const memResult = result as IntentResult<MemoryIntent>;
        if (memResult.intents.length > 0) {
          memory.push({ source: result.source, intents: memResult.intents });
        }
        break;
      }
      case 'HEARTBEAT.md': {
        const heartResult = result as IntentResult<ScheduleIntent>;
        if (heartResult.intents.length > 0) {
          schedule.push({ source: result.source, intents: heartResult.intents });
        }
        break;
      }
      case 'skills/': {
        const skillResult = result as IntentResult<SkillIntent>;
        if (skillResult.intents.length > 0) {
          skill.push({ source: result.source, intents: skillResult.intents });
        }
        break;
      }
      case 'lobster.yaml': {
        const wfResult = result as IntentResult<WorkflowIntent>;
        if (wfResult.intents.length > 0) {
          workflow.push({ source: result.source, intents: wfResult.intents });
        }
        break;
      }
      default: {
        // AM-3: Unknown source — emit warning diagnostic instead of silently dropping
        diagnostics.push({
          severity: 'warning',
          message: `Unknown intent source "${result.source}" — intents from this source were not categorized`,
          file: result.source,
          line: 1,
          code: 'CLAWS-X003',
        });
        break;
      }
    }
  }

  // ── Step 2: Build symbol table from TOOLS.md ──────────────────────
  const toolIndex = new Map<string, ToolManifestEntry>();
  for (const group of tool) {
    for (const entry of group.intents) {
      toolIndex.set(normalizeName(entry.name), entry);
    }
  }

  const allToolNames = [...toolIndex.values()].map(t => t.name);
  const highRiskTools = [...toolIndex.values()].filter(t => t.riskClass >= 4);

  // ── Step 3: Resolve deny constraint tool references ───────────────
  for (const group of deny) {
    for (const intent of group.intents) {
      if (intent.scope !== 'tool') continue;

      const refs = extractToolRefsFromDeny(intent, toolIndex);
      for (const ref of refs) {
        const normalized = normalizeName(ref);
        const resolved = toolIndex.has(normalized);

        const crossRef: CrossReference = {
          fromSource: group.source,
          fromLine: intent.line,
          referencedName: ref,
          normalizedName: normalized,
          resolved,
          targetSource: resolved ? 'TOOLS.md' : undefined,
        };
        crossReferences.push(crossRef);

        // Produce diagnostic for unresolved references
        if (!resolved) {
          const closest = findClosestMatch(normalized, toolIndex);
          const suggestion = closest !== undefined
            ? ` — did you mean "${closest}"?`
            : '';

          diagnostics.push({
            severity: 'warning',
            message: `unresolved tool reference "${ref}" in deny constraint${suggestion}`,
            file: group.source,
            line: intent.line,
            code: 'CLAWS-X001',
          });
        }
      }
    }
  }

  // ── Step 4: Resolve 'all' token in delegation ─────────────────────
  const resolvedDelegation: IntentGroup<DelegationIntent>[] = delegation.map(group => ({
    source: group.source,
    intents: group.intents.map(d =>
      resolveAllToken(d, allToolNames, highRiskTools, diagnostics),
    ),
  }));

  // ── Step 5: Build agent roster cross-references ───────────────────
  const agentNames = new Set<string>();
  for (const group of resolvedDelegation) {
    for (const intent of group.intents) {
      agentNames.add(intent.from);
      agentNames.add(intent.to);
    }
  }

  for (const group of resolvedDelegation) {
    for (const intent of group.intents) {
      const targetExists = agentNames.has(intent.to);
      crossReferences.push({
        fromSource: group.source,
        fromLine: intent.line,
        referencedName: intent.to,
        normalizedName: normalizeName(intent.to),
        resolved: targetExists,
        targetSource: targetExists ? 'AGENTS.md' : undefined,
      });
    }
  }

  return {
    deny,
    tool,
    delegation: resolvedDelegation,
    identity,
    authority,
    memory,
    schedule,
    skill,
    workflow,
    crossReferences,
    diagnostics,
  };
}
