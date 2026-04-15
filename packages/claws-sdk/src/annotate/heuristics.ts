/**
 * Heuristic-based annotation engine for `claws annotate`.
 *
 * Infers governance metadata (risk level, OBO boundary, data classification)
 * from skill source code using keyword-anchored pattern matching. Three
 * pattern families:
 *
 * 1. Tool name patterns — "send"/"delete" → R4-R5, "search"/"read" → R1-R2
 * 2. Import patterns — "fs.write"/"exec" → R3-R5, "fetch"/"http.get" → R2
 * 3. API signature patterns — known SDK method names → risk classification
 *
 * @module claws-sdk/annotate/heuristics
 */

import type { ToolRiskClass } from '../compile/types.js';
import type { ConfidenceEvidence } from './confidence.js';
import { combineConfidence } from './confidence.js';
import { detectObo } from './obo-detect.js';
import type { OboDetectionResult } from './obo-detect.js';

// ── Types ──────────────────────────────────────────────────────────────

/**
 * Data classification inferred from content analysis.
 */
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

/**
 * A single annotation inferred by the heuristic engine.
 */
export interface HeuristicAnnotation {
  /** Tool or skill name that was analyzed. */
  readonly name: string;
  /** Inferred risk class (R1-R5). */
  readonly riskClass: ToolRiskClass;
  /** Confidence score for the risk classification (0.0–1.0). */
  readonly riskConfidence: number;
  /** OBO boundary detection result. */
  readonly obo: OboDetectionResult;
  /** Inferred data classification. */
  readonly dataClassification: DataClassification;
  /** Evidence items that contributed to the risk classification. */
  readonly evidence: readonly ConfidenceEvidence[];
}

/**
 * Result of running heuristic annotation on a skill directory.
 */
export interface AnnotateResult {
  /** Annotations for each tool/skill analyzed. */
  readonly annotations: readonly HeuristicAnnotation[];
  /** Whether this was a dry run (no files modified). */
  readonly dryRun: boolean;
  /** Files that were (or would be) modified. */
  readonly modifiedFiles: readonly string[];
}

// ── Pattern Registries ─────────────────────────────────────────────────

/**
 * Tool name pattern with risk classification.
 */
interface ToolNamePattern {
  readonly regex: RegExp;
  readonly label: string;
  readonly riskClass: ToolRiskClass;
  readonly weight: number;
}

/**
 * Tool name patterns: keywords in tool/skill names → risk class.
 */
const TOOL_NAME_PATTERNS: readonly ToolNamePattern[] = [
  // R5 — production write, transactional
  { regex: /purchas/i, label: 'purchase', riskClass: 5, weight: 0.90 },
  { regex: /transact/i, label: 'transact', riskClass: 5, weight: 0.90 },
  { regex: /deploy/i, label: 'deploy', riskClass: 5, weight: 0.85 },
  { regex: /shell[_-]?exec/i, label: 'shell-exec', riskClass: 5, weight: 0.90 },
  // R4 — external side effects
  { regex: /send[_-]?email/i, label: 'send-email', riskClass: 4, weight: 0.85 },
  { regex: /send[_-]?slack/i, label: 'send-slack', riskClass: 4, weight: 0.85 },
  { regex: /\bsend\b/i, label: 'send', riskClass: 4, weight: 0.70 },
  { regex: /\bdelete\b/i, label: 'delete', riskClass: 4, weight: 0.80 },
  { regex: /\bemail\b/i, label: 'email', riskClass: 4, weight: 0.70 },
  { regex: /\bpost\b/i, label: 'post', riskClass: 4, weight: 0.60 },
  { regex: /\bpublish\b/i, label: 'publish', riskClass: 4, weight: 0.65 },
  // R3 — file writes, external API
  { regex: /\bwrite\b/i, label: 'write', riskClass: 3, weight: 0.70 },
  { regex: /\bupdate\b/i, label: 'update', riskClass: 3, weight: 0.55 },
  { regex: /\bcreate\b/i, label: 'create', riskClass: 3, weight: 0.50 },
  { regex: /api[_-]?call/i, label: 'api-call', riskClass: 3, weight: 0.65 },
  // R2 — read with network
  { regex: /\bfetch\b/i, label: 'fetch', riskClass: 2, weight: 0.60 },
  { regex: /\bdownload\b/i, label: 'download', riskClass: 2, weight: 0.55 },
  { regex: /\bhttp\b/i, label: 'http', riskClass: 2, weight: 0.50 },
  // R1 — read-only, computation
  { regex: /\bsearch\b/i, label: 'search', riskClass: 1, weight: 0.60 },
  { regex: /\bread\b/i, label: 'read', riskClass: 1, weight: 0.55 },
  { regex: /\bget\b/i, label: 'get', riskClass: 1, weight: 0.45 },
  { regex: /\blist\b/i, label: 'list', riskClass: 1, weight: 0.45 },
  { regex: /\bquery\b/i, label: 'query', riskClass: 1, weight: 0.40 },
  { regex: /\blookup\b/i, label: 'lookup', riskClass: 1, weight: 0.40 },
  { regex: /\bsummariz/i, label: 'summarize', riskClass: 1, weight: 0.50 },
];

/**
 * Import pattern with risk classification.
 */
interface ImportPattern {
  readonly regex: RegExp;
  readonly label: string;
  readonly riskClass: ToolRiskClass;
  readonly weight: number;
}

/**
 * Import patterns: require/import paths → risk class.
 */
const IMPORT_PATTERNS: readonly ImportPattern[] = [
  // R5 — arbitrary execution
  { regex: /child_process(?:\.exec|\.spawn)?/i, label: 'child_process.exec', riskClass: 5, weight: 0.90 },
  { regex: /\bexec\s*\(/i, label: 'exec()', riskClass: 5, weight: 0.85 },
  { regex: /\bspawn\s*\(/i, label: 'spawn()', riskClass: 4, weight: 0.75 },
  // R3 — file system writes
  { regex: /fs\.write/i, label: 'fs.write', riskClass: 3, weight: 0.80 },
  { regex: /fs\.mkdir/i, label: 'fs.mkdir', riskClass: 3, weight: 0.60 },
  { regex: /fs\.unlink/i, label: 'fs.unlink', riskClass: 4, weight: 0.75 },
  { regex: /fs\.rm/i, label: 'fs.rm', riskClass: 4, weight: 0.75 },
  // R2 — network read
  { regex: /\bfetch\s*\(/i, label: 'fetch()', riskClass: 2, weight: 0.65 },
  { regex: /http\.get/i, label: 'http.get', riskClass: 2, weight: 0.60 },
  { regex: /https\.get/i, label: 'https.get', riskClass: 2, weight: 0.60 },
  { regex: /axios/i, label: 'axios', riskClass: 2, weight: 0.60 },
  // R2 — file system read
  { regex: /fs\.read/i, label: 'fs.read', riskClass: 2, weight: 0.50 },
];

/**
 * API signature pattern for known SDK methods → risk.
 */
interface ApiSignaturePattern {
  readonly regex: RegExp;
  readonly label: string;
  readonly riskClass: ToolRiskClass;
  readonly weight: number;
}

/**
 * API signature patterns: known SDK method calls → risk class.
 */
const API_SIGNATURE_PATTERNS: readonly ApiSignaturePattern[] = [
  { regex: /\.sendEmail\s*\(/i, label: 'sendEmail()', riskClass: 4, weight: 0.85 },
  { regex: /\.sendMessage\s*\(/i, label: 'sendMessage()', riskClass: 4, weight: 0.80 },
  { regex: /\.deleteRecord\s*\(/i, label: 'deleteRecord()', riskClass: 4, weight: 0.85 },
  { regex: /\.deploy\s*\(/i, label: 'deploy()', riskClass: 5, weight: 0.85 },
  { regex: /\.executeQuery\s*\(/i, label: 'executeQuery()', riskClass: 3, weight: 0.70 },
  { regex: /\.writeFile\s*\(/i, label: 'writeFile()', riskClass: 3, weight: 0.75 },
  { regex: /\.readFile\s*\(/i, label: 'readFile()', riskClass: 2, weight: 0.50 },
  { regex: /\.fetchData\s*\(/i, label: 'fetchData()', riskClass: 2, weight: 0.55 },
];

// ── Data Classification Patterns ───────────────────────────────────────

interface DataPattern {
  readonly regex: RegExp;
  readonly classification: DataClassification;
}

const DATA_PATTERNS: readonly DataPattern[] = [
  { regex: /\b(?:password|secret|credential|private[_-]?key|ssn|social[_-]?security)\b/i, classification: 'restricted' },
  { regex: /\b(?:pii|hipaa|phi|credit[_-]?card|bank[_-]?account)\b/i, classification: 'restricted' },
  { regex: /\b(?:internal|proprietary|confidential)\b/i, classification: 'confidential' },
  { regex: /\b(?:employee|salary|performance[_-]?review)\b/i, classification: 'confidential' },
  { regex: /\b(?:draft|work[_-]?in[_-]?progress)\b/i, classification: 'internal' },
];

// ── Core Engine ────────────────────────────────────────────────────────

/**
 * Analyze a tool/skill name and its source content to infer risk classification.
 *
 * @param name - Tool or skill name (e.g., "send-email", "search-docs")
 * @param description - Tool description text
 * @param sourceContent - Full source content of the skill (for import/API analysis)
 * @returns Heuristic annotation with risk, OBO, data classification, and evidence
 */
export function analyzeHeuristics(
  name: string,
  description: string,
  sourceContent: string,
): HeuristicAnnotation {
  const evidence: ConfidenceEvidence[] = [];
  const riskVotes: { risk: ToolRiskClass; weight: number }[] = [];

  // Pass 1: Tool name patterns
  for (const pattern of TOOL_NAME_PATTERNS) {
    if (pattern.regex.test(name)) {
      evidence.push({ source: `name:${pattern.label}`, weight: pattern.weight });
      riskVotes.push({ risk: pattern.riskClass, weight: pattern.weight });
    }
  }

  // Also check description for tool name patterns
  for (const pattern of TOOL_NAME_PATTERNS) {
    if (pattern.regex.test(description) && !pattern.regex.test(name)) {
      const descWeight = pattern.weight * 0.6; // Description matches are weaker
      evidence.push({ source: `desc:${pattern.label}`, weight: descWeight });
      riskVotes.push({ risk: pattern.riskClass, weight: descWeight });
    }
  }

  // Pass 2: Import patterns (on source content)
  for (const pattern of IMPORT_PATTERNS) {
    if (pattern.regex.test(sourceContent)) {
      evidence.push({ source: `import:${pattern.label}`, weight: pattern.weight });
      riskVotes.push({ risk: pattern.riskClass, weight: pattern.weight });
    }
  }

  // Pass 3: API signature patterns (on source content)
  for (const pattern of API_SIGNATURE_PATTERNS) {
    if (pattern.regex.test(sourceContent)) {
      evidence.push({ source: `api:${pattern.label}`, weight: pattern.weight });
      riskVotes.push({ risk: pattern.riskClass, weight: pattern.weight });
    }
  }

  // Compute risk class: weighted vote, highest-risk evidence wins ties
  const riskClass = computeRiskClass(riskVotes);

  // Compute overall confidence for the risk classification
  const riskEvidence = evidence.filter((_, i) => riskVotes[i]?.risk === riskClass);
  const confidenceResult = combineConfidence(riskEvidence.length > 0 ? riskEvidence : evidence);

  // OBO detection
  const obo = detectObo(name, description);

  // Data classification
  const dataClassification = classifyData(name, description, sourceContent);

  return {
    name,
    riskClass,
    riskConfidence: evidence.length > 0 ? confidenceResult.score : 0.0,
    obo,
    dataClassification,
    evidence,
  };
}

/**
 * Compute risk class from weighted votes. Higher risk wins when
 * total weight is competitive (within 50% of the top-weighted class).
 */
function computeRiskClass(votes: { risk: ToolRiskClass; weight: number }[]): ToolRiskClass {
  if (votes.length === 0) return 1;

  // Accumulate weight per risk class
  const weights = new Map<ToolRiskClass, number>();
  for (const vote of votes) {
    weights.set(vote.risk, (weights.get(vote.risk) ?? 0) + vote.weight);
  }

  // Find the class with the highest accumulated weight.
  // Among ties, prefer the higher risk class (conservative).
  let bestRisk: ToolRiskClass = 1;
  let bestWeight = 0;

  for (const [risk, weight] of weights) {
    if (weight > bestWeight || (weight === bestWeight && risk > bestRisk)) {
      bestWeight = weight;
      bestRisk = risk;
    }
  }

  // Check if any higher risk class has competitive weight (>= 50% of best)
  for (const [risk, weight] of weights) {
    if (risk > bestRisk && weight >= bestWeight * 0.5) {
      bestRisk = risk;
    }
  }

  return bestRisk;
}

/**
 * Classify data sensitivity from name, description, and source.
 */
function classifyData(
  name: string,
  description: string,
  sourceContent: string,
): DataClassification {
  const text = `${name} ${description} ${sourceContent}`;

  for (const pattern of DATA_PATTERNS) {
    if (pattern.regex.test(text)) {
      return pattern.classification;
    }
  }

  return 'public';
}

/**
 * Format an annotation as a dry-run output line.
 */
export function formatAnnotation(annotation: HeuristicAnnotation): string {
  const oboTag = annotation.obo.detected ? ' [OBO]' : '';
  const dataTag = annotation.dataClassification !== 'public'
    ? ` [data:${annotation.dataClassification}]`
    : '';
  const conf = (annotation.riskConfidence * 100).toFixed(0);
  return `  R${annotation.riskClass} (${conf}%)${oboTag}${dataTag}  ${annotation.name}`;
}

/**
 * Generate YAML frontmatter annotations for a skill.
 */
export function toFrontmatterAnnotations(annotation: HeuristicAnnotation): Record<string, unknown> {
  const result: Record<string, unknown> = {
    risk: `R${annotation.riskClass}`,
    'risk-confidence': Number(annotation.riskConfidence.toFixed(2)),
  };

  if (annotation.obo.detected) {
    result['obo'] = true;
    result['obo-patterns'] = annotation.obo.matchedPatterns;
  }

  if (annotation.dataClassification !== 'public') {
    result['data-classification'] = annotation.dataClassification;
  }

  return result;
}
