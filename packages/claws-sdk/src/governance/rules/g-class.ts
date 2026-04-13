/**
 * G-CLASS rules — risk classification (R1-R5), capability mapping,
 * OBO detection patterns.
 *
 * Classification precedence: override > capability > heuristic > keywords.
 *
 * - R1: READ only (pure computation, read filesystem)
 * - R2: WRITE local (file writes, local DB)
 * - R3: COMMUNICATE (network, external APIs)
 * - R4: EXECUTE (shell, code execution, production deploy)
 * - R5: TRANSACT / OBO (act on behalf of user, credential forwarding)
 *
 * @module claws-sdk/governance/rules/g-class
 */

import type { CapabilityManifest, ToolCapability } from '../../ir/capability-manifest.js';
import type { GovernanceRule, RuleResult, Violation } from '../types.js';

// ── Capability Enum ──────────────────────────────────────────────────────

/**
 * The 5 canonical capability names (closed enum).
 */
export type Capability = 'READ' | 'WRITE' | 'COMMUNICATE' | 'EXECUTE' | 'TRANSACT';

/**
 * Capability-to-risk-level mapping (R1-R5).
 */
export const CAPABILITY_RISK_MAP: Record<Capability, number> = {
  READ: 1,
  WRITE: 2,
  COMMUNICATE: 3,
  EXECUTE: 4,
  TRANSACT: 5,
};

const VALID_CAPABILITIES = new Set<string>(Object.keys(CAPABILITY_RISK_MAP));

/**
 * Normalize a capability string to the uppercase closed enum.
 * Returns undefined if the string is not a valid capability.
 */
export function normalizeCapability(raw: string): Capability | undefined {
  const upper = raw.toUpperCase().trim();
  if (VALID_CAPABILITIES.has(upper)) {
    return upper as Capability;
  }
  return undefined;
}

// ── Platform Defaults ────────────────────────────────────────────────────

/**
 * Platform built-in tool default classification table.
 *
 * When a tool matches a known platform built-in name, its risk level
 * comes from this table (heuristic tier in the precedence chain).
 */
export const PLATFORM_DEFAULTS: Record<string, number> = {
  // Claude Code built-ins
  Read: 1,
  Glob: 1,
  Grep: 1,
  Write: 2,
  Edit: 2,
  Bash: 4,
  // Copilot built-ins
  'file_search': 1,
  'code_interpreter': 4,
};

// ── OBO Detection ────────────────────────────────────────────────────────

/**
 * OBO detection patterns — phrases indicating a tool acts on behalf of
 * another principal.
 */
const OBO_PATTERNS: RegExp[] = [
  /\bon\s+behalf\s+of\b/i,
  /\bas\s+(the\s+)?user\b/i,
  /\bact(s|ing)?\s+as\b/i,
  /\bimpersonat/i,
  /\bcredential\s+forward/i,
  /\bdelegate[sd]?\s+(to|auth)/i,
  /\bsend\b.*\bon\s+behalf/i,
  /\bpost\b.*\bas\s+user/i,
];

function detectObo(tool: ToolCapability): boolean {
  if (tool.oboFlag) return true;
  const desc = tool.description;
  return OBO_PATTERNS.some((pat) => pat.test(desc));
}

// ── Heuristic Classification ─────────────────────────────────────────────

/**
 * Keyword-based heuristic classification (lowest precedence tier).
 */
const KEYWORD_RISK_MAP: Array<{ pattern: RegExp; risk: number }> = [
  { pattern: /\b(deploy|production|prod)\b/i, risk: 4 },
  { pattern: /\b(execute|shell|command|bash|run)\b/i, risk: 4 },
  { pattern: /\b(email|slack|message|notify|post)\b/i, risk: 3 },
  { pattern: /\b(network|api|http|request|fetch)\b/i, risk: 3 },
  { pattern: /\b(write|create|delete|modify|update)\b/i, risk: 2 },
  { pattern: /\b(read|search|query|list|get|find)\b/i, risk: 1 },
];

function heuristicRisk(tool: ToolCapability): number {
  let maxRisk = 1;
  const desc = tool.description;
  for (const entry of KEYWORD_RISK_MAP) {
    if (entry.pattern.test(desc) && entry.risk > maxRisk) {
      maxRisk = entry.risk;
    }
  }
  return maxRisk;
}

// ── Classification Result ────────────────────────────────────────────────

/**
 * Result of classifying a single tool.
 */
export interface ClassificationResult {
  readonly toolName: string;
  readonly riskLevel: number;
  readonly oboDetected: boolean;
  /** Which tier in the precedence chain produced this classification. */
  readonly source: 'override' | 'capability' | 'platform-default' | 'heuristic' | 'keyword';
  /** Audit note for override transparency. */
  readonly auditNote?: string;
}

/**
 * An explicit risk level override for a tool.
 */
export interface ClassificationOverride {
  readonly toolName: string;
  readonly riskLevel: number;
  readonly reason: string;
}

// ── Core Classification ──────────────────────────────────────────────────

/**
 * Classify a single tool using four-level precedence:
 * override > capability > platform-default/heuristic > keywords.
 *
 * OBO detection runs independently and can elevate to R5.
 */
export function classifyTool(
  tool: ToolCapability,
  capabilities: string[],
  override?: ClassificationOverride,
): ClassificationResult {
  const oboDetected = detectObo(tool);

  // Tier 1: Explicit override
  if (override && override.toolName === tool.name) {
    return {
      toolName: tool.name,
      riskLevel: override.riskLevel,
      oboDetected,
      source: 'override',
      auditNote: `[OVERRIDE] ${tool.name}: derived risk replaced with R${override.riskLevel}. Reason: ${override.reason}`,
    };
  }

  // Normalize capabilities
  const normalizedCaps = capabilities
    .map(normalizeCapability)
    .filter((c): c is Capability => c !== undefined);

  // Tier 2: Capability-based (max risk across all capabilities)
  if (normalizedCaps.length > 0) {
    let maxRisk = 0;
    for (const cap of normalizedCaps) {
      const risk = CAPABILITY_RISK_MAP[cap];
      if (risk > maxRisk) maxRisk = risk;
    }

    // OBO elevates to R5
    if (oboDetected && maxRisk < 5) {
      maxRisk = 5;
    }

    return {
      toolName: tool.name,
      riskLevel: maxRisk,
      oboDetected,
      source: 'capability',
    };
  }

  // Tier 3: Platform built-in defaults
  const platformDefault = PLATFORM_DEFAULTS[tool.name];
  if (platformDefault !== undefined) {
    let risk = platformDefault;
    if (oboDetected && risk < 5) risk = 5;
    return {
      toolName: tool.name,
      riskLevel: risk,
      oboDetected,
      source: 'platform-default',
    };
  }

  // Tier 4: Heuristic / keyword classification
  let risk = heuristicRisk(tool);
  if (oboDetected && risk < 5) risk = 5;

  return {
    toolName: tool.name,
    riskLevel: risk,
    oboDetected,
    source: risk > 1 ? 'heuristic' : 'keyword',
  };
}

/**
 * Classify all tools in a manifest.
 */
export function classifyManifest(
  manifest: CapabilityManifest,
  capabilityMap: Record<string, string[]>,
  overrides?: ClassificationOverride[],
): ClassificationResult[] {
  const overrideMap = new Map<string, ClassificationOverride>();
  if (overrides) {
    for (const o of overrides) {
      overrideMap.set(o.toolName, o);
    }
  }

  return manifest.tools.map((tool) =>
    classifyTool(
      tool,
      capabilityMap[tool.name] ?? [],
      overrideMap.get(tool.name),
    ),
  );
}

// ── Rule Factory ─────────────────────────────────────────────────────────

/**
 * Create G-CLASS governance rules for registration in the rule registry.
 *
 * Returns 3 rules:
 * - G-CLASS-01: Risk scoring (R1-R5) for all tools
 * - G-CLASS-02: Capability mapping validation
 * - G-CLASS-03: OBO detection
 */
export function createGClassRules(): GovernanceRule[] {
  const riskScoringRule: GovernanceRule = {
    id: 'G-CLASS-01',
    name: 'Risk Scoring',
    description: 'Classify tools into R1-R5 risk levels based on capabilities',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of manifest.tools) {
        const result = classifyTool(tool, []);

        // R5 tools without explicit oboFlag are a violation
        if (result.riskLevel === 5 && !tool.oboFlag && result.oboDetected) {
          violations.push({
            ruleId: 'G-CLASS-01',
            severity: 'critical',
            file: 'TOOLS.md',
            line: 1,
            message: `Tool "${tool.name}" detected as R5 (OBO) but oboFlag is not explicitly set`,
            remediation: `Set oboFlag: true for "${tool.name}" or add OBO governance rules`,
          });
        }
      }

      return {
        ruleId: 'G-CLASS-01',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  const capabilityMappingRule: GovernanceRule = {
    id: 'G-CLASS-02',
    name: 'Capability Mapping',
    description: 'Validate that all tool capabilities map to known categories',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of manifest.tools) {
        if (tool.classification === 'custom') {
          violations.push({
            ruleId: 'G-CLASS-02',
            severity: 'low',
            file: 'TOOLS.md',
            line: 1,
            message: `Tool "${tool.name}" has 'custom' classification — consider specifying a known category`,
            remediation: `Set classification to one of: filesystem, network, execution, data, communication`,
          });
        }
      }

      return {
        ruleId: 'G-CLASS-02',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  const oboDetectionRule: GovernanceRule = {
    id: 'G-CLASS-03',
    name: 'OBO Detection',
    description: 'Detect tools that act on behalf of the user (OBO patterns)',
    evaluate(manifest: CapabilityManifest): RuleResult {
      const violations: Violation[] = [];

      for (const tool of manifest.tools) {
        const obo = detectObo(tool);
        if (obo && !tool.oboFlag) {
          violations.push({
            ruleId: 'G-CLASS-03',
            severity: 'high',
            file: 'TOOLS.md',
            line: 1,
            message: `Tool "${tool.name}" matches OBO patterns but oboFlag is false`,
            remediation: `Review "${tool.name}" description and set oboFlag: true if it acts on behalf of users`,
          });
        }
      }

      return {
        ruleId: 'G-CLASS-03',
        passed: violations.length === 0,
        violations,
      };
    },
  };

  return [riskScoringRule, capabilityMappingRule, oboDetectionRule];
}
