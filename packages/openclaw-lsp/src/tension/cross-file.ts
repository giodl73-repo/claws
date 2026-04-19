/**
 * Cross-file tension detection — 7 conflict clusters (A-G).
 *
 * Maps governance conflict patterns across files to file:line diagnostic
 * locations. Each cluster represents a distinct class of cross-file friction:
 *
 *   A: Tool grant vs. deny intent — TOOLS.md grants a tool that SOUL.md denies
 *   B: Delegation scope vs. deny — AGENTS.md delegates to a target denied in SOUL.md
 *   C: OBO boundary overlap — multiple files declare overlapping OBO boundaries
 *   D: Risk escalation conflict — TOOLS.md risk level contradicts RULES.md threshold
 *   E: Data label inconsistency — MEMORY.md labels contradict TOOLS.md capabilities
 *   F: Context scope collision — RULES.md context constraints conflict across files
 *   G: Suppression override conflict — suppression in one file overrides enforcement in another
 *
 * @module openclaw-lsp/tension/cross-file
 */

import type { GovernanceIRLike } from '../compilation-host.js';
import { classifyFile, type GovernanceFileRole } from '../providers/diagnostic.js';

// ── Conflict clusters ───────────────────────────────────────────────

/**
 * The 7 conflict cluster identifiers.
 */
export type ConflictCluster = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

/**
 * A cross-file conflict finding mapped to a specific file:line location.
 */
export interface ConflictFinding {
  /** The conflict cluster this finding belongs to. */
  readonly cluster: ConflictCluster;
  /** Diagnostic code for the finding. */
  readonly code: string;
  /** Human-readable description of the conflict. */
  readonly message: string;
  /** URI of the file where the conflict should be displayed. */
  readonly targetUri: string;
  /** 1-based line number in the target file. */
  readonly targetLine: number;
  /** URI of the source file that triggered the conflict. */
  readonly sourceUri: string;
  /** LSP severity: 1=Error, 2=Warning, 3=Info. */
  readonly severity: number;
}

// ── Internal IR shapes ──────────────────────────────────────────────

interface ToolEntry {
  readonly name: string;
  readonly riskLevel: string;
}

interface IntentEntry {
  readonly kind: string;
  readonly target: string;
  readonly description?: string;
  readonly key?: string;
  readonly value?: string;
}

interface DelegationEntry {
  readonly ruleId: string;
  readonly target: string;
}

interface SuppressionEntry {
  readonly ruleId: string;
  readonly expiresAt?: string;
}

interface AnalysisShape {
  readonly enforcementPlan?: {
    readonly ruleSuppressions?: readonly SuppressionEntry[];
    readonly requiredApprovals?: readonly string[];
  };
  readonly warnings?: readonly {
    readonly ruleId: string;
    readonly message: string;
    readonly category?: string;
  }[];
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Find the 1-based line number of a needle in content. Returns 1 if not found.
 */
function findLine(content: string, needle: string): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i]!.includes(needle)) return i + 1;
  }
  return 1;
}

const RISK_ORDER: Record<string, number> = {
  r1: 1, r2: 2, r3: 3, r4: 4, r5: 5,
  minimal: 1, low: 2, medium: 3, high: 4, critical: 5,
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5,
};

function riskNumeric(level: string): number {
  return RISK_ORDER[level.toLowerCase()] ?? 0;
}

// ── Workspace file snapshot ─────────────────────────────────────────

/**
 * A snapshot of a single workspace file for cross-file analysis.
 */
export interface WorkspaceFile {
  readonly content: string;
  readonly ir: GovernanceIRLike;
}

// ── Cluster detectors ───────────────────────────────────────────────

/**
 * Cluster A: Tool grant vs. deny intent.
 * TOOLS.md grants a tool that SOUL.md denies.
 */
function detectClusterA(
  files: ReadonlyMap<string, WorkspaceFile>,
): readonly ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  const toolFiles = [...files.entries()].filter(([uri]) => classifyFile(uri) === 'tools');
  const soulFiles = [...files.entries()].filter(([uri]) => classifyFile(uri) === 'soul');

  for (const [toolUri, toolFile] of toolFiles) {
    const caps = toolFile.ir.capabilities as { tools?: readonly ToolEntry[] } | undefined;
    const tools = caps?.tools ?? [];

    for (const [soulUri, soulFile] of soulFiles) {
      const intents = soulFile.ir.intents as readonly IntentEntry[];
      for (const intent of intents) {
        if (intent.kind !== 'deny') continue;
        const matchingTool = tools.find((t) => t.name === intent.target);
        if (matchingTool) {
          findings.push({
            cluster: 'A',
            code: 'CLAWS-CF-A',
            message: `Cluster A: TOOLS.md grants "${intent.target}" but SOUL.md denies it`,
            targetUri: soulUri,
            targetLine: findLine(soulFile.content, intent.target),
            sourceUri: toolUri,
            severity: 1,
          });
        }
      }
    }
  }

  return findings;
}

/**
 * Cluster B: Delegation scope vs. deny.
 * AGENTS.md delegates to a target denied in SOUL.md.
 */
function detectClusterB(
  files: ReadonlyMap<string, WorkspaceFile>,
): readonly ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  const agentFiles = [...files.entries()].filter(([uri]) => classifyFile(uri) === 'agents');
  const soulFiles = [...files.entries()].filter(([uri]) => classifyFile(uri) === 'soul');

  for (const [agentUri, agentFile] of agentFiles) {
    const delegationMap = agentFile.ir.delegationMap as readonly unknown[];
    for (const entry of delegationMap) {
      if (typeof entry !== 'object' || entry === null || !('target' in entry)) continue;
      const delEntry = entry as DelegationEntry;

      for (const [soulUri, soulFile] of soulFiles) {
        const intents = soulFile.ir.intents as readonly IntentEntry[];
        for (const intent of intents) {
          if (intent.kind === 'deny' && intent.target === delEntry.target) {
            findings.push({
              cluster: 'B',
              code: 'CLAWS-CF-B',
              message: `Cluster B: AGENTS.md delegates to "${delEntry.target}" but SOUL.md denies it`,
              targetUri: agentUri,
              targetLine: findLine(agentFile.content, delEntry.target),
              sourceUri: soulUri,
              severity: 1,
            });
          }
        }
      }
    }
  }

  return findings;
}

/**
 * Cluster C: OBO boundary overlap.
 * Multiple files declare overlapping OBO boundaries for the same target.
 */
function detectClusterC(
  files: ReadonlyMap<string, WorkspaceFile>,
): readonly ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  // Collect all delegation targets across all files
  const targetMap = new Map<string, { uri: string; file: WorkspaceFile }[]>();

  for (const [uri, file] of files) {
    const delegationMap = file.ir.delegationMap as readonly unknown[];
    for (const entry of delegationMap) {
      if (typeof entry !== 'object' || entry === null || !('target' in entry)) continue;
      const delEntry = entry as DelegationEntry;
      const existing = targetMap.get(delEntry.target);
      if (existing) {
        existing.push({ uri, file });
      } else {
        targetMap.set(delEntry.target, [{ uri, file }]);
      }
    }
  }

  // Find targets declared in 2+ files
  for (const [target, entries] of targetMap) {
    if (entries.length < 2) continue;
    for (let i = 1; i < entries.length; i++) {
      findings.push({
        cluster: 'C',
        code: 'CLAWS-CF-C',
        message: `Cluster C: OBO boundary for "${target}" declared in multiple files`,
        targetUri: entries[i]!.uri,
        targetLine: findLine(entries[i]!.file.content, target),
        sourceUri: entries[0]!.uri,
        severity: 2,
      });
    }
  }

  return findings;
}

/**
 * Cluster D: Risk escalation conflict.
 * TOOLS.md declares a tool at risk R3+ but RULES.md has enforcement that
 * implies a lower threshold.
 */
function detectClusterD(
  files: ReadonlyMap<string, WorkspaceFile>,
): readonly ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  const toolFiles = [...files.entries()].filter(([uri]) => classifyFile(uri) === 'tools');
  const ruleFiles = [...files.entries()].filter(([uri]) => classifyFile(uri) === 'rules');

  for (const [toolUri, toolFile] of toolFiles) {
    const caps = toolFile.ir.capabilities as { tools?: readonly ToolEntry[] } | undefined;
    const tools = caps?.tools ?? [];

    for (const tool of tools) {
      const numericRisk = riskNumeric(tool.riskLevel);
      if (numericRisk < 4) continue; // Only flag R4+

      for (const [ruleUri, ruleFile] of ruleFiles) {
        const analysis = ruleFile.ir.analysis as AnalysisShape | undefined;
        const approvals = analysis?.enforcementPlan?.requiredApprovals ?? [];
        if (approvals.length > 0) {
          findings.push({
            cluster: 'D',
            code: 'CLAWS-CF-D',
            message: `Cluster D: "${tool.name}" at ${tool.riskLevel} risk conflicts with enforcement in RULES.md`,
            targetUri: toolUri,
            targetLine: findLine(toolFile.content, tool.name),
            sourceUri: ruleUri,
            severity: 2,
          });
        }
      }
    }
  }

  return findings;
}

/**
 * Cluster E: Data label inconsistency.
 * MEMORY.md labels contradict TOOLS.md tool capabilities.
 */
function detectClusterE(
  files: ReadonlyMap<string, WorkspaceFile>,
): readonly ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  const toolFiles = [...files.entries()].filter(([uri]) => classifyFile(uri) === 'tools');
  const memFiles = [...files.entries()].filter(([uri]) => classifyFile(uri) === 'memory');

  for (const [memUri, memFile] of memFiles) {
    const intents = memFile.ir.intents as readonly IntentEntry[];
    const labelIntents = intents.filter((i) => i.kind === 'label' && i.key);

    for (const label of labelIntents) {
      for (const [toolUri, toolFile] of toolFiles) {
        const caps = toolFile.ir.capabilities as { tools?: readonly ToolEntry[] } | undefined;
        const tools = caps?.tools ?? [];
        // Check if any tool name appears in the label's target or key
        for (const tool of tools) {
          if (label.target === tool.name || label.key === tool.name) {
            findings.push({
              cluster: 'E',
              code: 'CLAWS-CF-E',
              message: `Cluster E: MEMORY.md label "${label.key}" references tool "${tool.name}" — verify consistency`,
              targetUri: memUri,
              targetLine: findLine(memFile.content, label.key!),
              sourceUri: toolUri,
              severity: 3,
            });
          }
        }
      }
    }
  }

  return findings;
}

/**
 * Cluster F: Context scope collision.
 * RULES.md context constraints conflict across files.
 */
function detectClusterF(
  files: ReadonlyMap<string, WorkspaceFile>,
): readonly ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  const ruleFiles = [...files.entries()].filter(([uri]) => classifyFile(uri) === 'rules');
  const otherFiles = [...files.entries()].filter(([uri]) => classifyFile(uri) !== 'rules' && classifyFile(uri) !== 'other');

  for (const [ruleUri, ruleFile] of ruleFiles) {
    const analysis = ruleFile.ir.analysis as AnalysisShape | undefined;
    const warnings = analysis?.warnings ?? [];
    const contextWarnings = warnings.filter((w) => w.category === 'G-CONTEXT');

    for (const warning of contextWarnings) {
      for (const [otherUri, otherFile] of otherFiles) {
        // Check if the context-violating rule references content in another file
        const otherAnalysis = otherFile.ir.analysis as AnalysisShape | undefined;
        const otherWarnings = otherAnalysis?.warnings ?? [];
        const otherContextWarnings = otherWarnings.filter((w) => w.category === 'G-CONTEXT');

        if (otherContextWarnings.length > 0) {
          findings.push({
            cluster: 'F',
            code: 'CLAWS-CF-F',
            message: `Cluster F: context scope collision — RULES.md "${warning.ruleId}" vs ${classifyFile(otherUri).toUpperCase()}.md`,
            targetUri: ruleUri,
            targetLine: findLine(ruleFile.content, warning.ruleId),
            sourceUri: otherUri,
            severity: 2,
          });
        }
      }
    }
  }

  return findings;
}

/**
 * Cluster G: Suppression override conflict.
 * Suppression in one file overrides enforcement demanded by another.
 */
function detectClusterG(
  files: ReadonlyMap<string, WorkspaceFile>,
): readonly ConflictFinding[] {
  const findings: ConflictFinding[] = [];

  // Collect all suppressed rule IDs from each file
  const suppressionsByFile = new Map<string, { suppressions: readonly SuppressionEntry[]; file: WorkspaceFile }>();
  // Collect all required approvals (enforcement demands)
  const enforcementByFile = new Map<string, { approvals: readonly string[]; file: WorkspaceFile }>();

  for (const [uri, file] of files) {
    const analysis = file.ir.analysis as AnalysisShape | undefined;
    const suppressions = analysis?.enforcementPlan?.ruleSuppressions ?? [];
    const approvals = analysis?.enforcementPlan?.requiredApprovals ?? [];

    if (suppressions.length > 0) {
      suppressionsByFile.set(uri, { suppressions, file });
    }
    if (approvals.length > 0) {
      enforcementByFile.set(uri, { approvals, file });
    }
  }

  // Cross-check: suppressions in one file vs. enforcement in another
  for (const [suppUri, { suppressions, file: suppFile }] of suppressionsByFile) {
    for (const [enfUri, { approvals, file: enfFile }] of enforcementByFile) {
      if (suppUri === enfUri) continue;
      for (const supp of suppressions) {
        for (const approval of approvals) {
          if (supp.ruleId === approval || supp.ruleId.includes(approval) || approval.includes(supp.ruleId)) {
            findings.push({
              cluster: 'G',
              code: 'CLAWS-CF-G',
              message: `Cluster G: suppression of "${supp.ruleId}" conflicts with enforcement requiring "${approval}"`,
              targetUri: suppUri,
              targetLine: findLine(suppFile.content, supp.ruleId),
              sourceUri: enfUri,
              severity: 1,
            });
          }
        }
      }
    }
  }

  return findings;
}

// ── Cluster registry ────────────────────────────────────────────────

/**
 * All 7 cluster detector functions in order A-G.
 */
const CLUSTER_DETECTORS: ReadonlyArray<{
  cluster: ConflictCluster;
  detect: (files: ReadonlyMap<string, WorkspaceFile>) => readonly ConflictFinding[];
}> = [
  { cluster: 'A', detect: detectClusterA },
  { cluster: 'B', detect: detectClusterB },
  { cluster: 'C', detect: detectClusterC },
  { cluster: 'D', detect: detectClusterD },
  { cluster: 'E', detect: detectClusterE },
  { cluster: 'F', detect: detectClusterF },
  { cluster: 'G', detect: detectClusterG },
];

/**
 * All 7 cluster identifiers.
 */
export const ALL_CLUSTERS: readonly ConflictCluster[] = CLUSTER_DETECTORS.map((d) => d.cluster);

/**
 * Run all 7 cluster detectors against a workspace file snapshot.
 *
 * @param files - Map of URI to { content, ir } for all open workspace files.
 * @returns All conflict findings across all clusters.
 */
export function detectAllClusters(
  files: ReadonlyMap<string, WorkspaceFile>,
): readonly ConflictFinding[] {
  const all: ConflictFinding[] = [];
  for (const detector of CLUSTER_DETECTORS) {
    const findings = detector.detect(files);
    all.push(...findings);
  }
  return all;
}

/**
 * Run a single cluster detector by identifier.
 */
export function detectCluster(
  cluster: ConflictCluster,
  files: ReadonlyMap<string, WorkspaceFile>,
): readonly ConflictFinding[] {
  const detector = CLUSTER_DETECTORS.find((d) => d.cluster === cluster);
  if (!detector) return [];
  return detector.detect(files);
}
