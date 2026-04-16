/**
 * Maker annotate engine — capability analysis for governance annotation.
 *
 * Reads an existing skill's SKILL.md and handler.ts, analyzes capabilities
 * (tool usage patterns, OBO indicators, data labels), and suggests governance
 * frontmatter additions. Uses collect-all-errors: reports all suggestions at
 * once rather than failing on the first issue.
 *
 * Capability analysis includes:
 * - OBO pattern detection (send-email, post-message, submit-form)
 * - Risk inference from tool usage patterns (browser control = R4, file read = R2)
 * - Data label suggestion from tool capabilities and content patterns
 * - Frontmatter-to-decorator propagation (S02-F02)
 *
 * @module claws-sdk/maker/annotate
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { analyzeHeuristics } from '../annotate/heuristics.js';
import { detectObo } from '../annotate/obo-detect.js';
import { parseSkillFrontmatter } from '../annotate/orchestrator.js';
import type { AnnotationSuggestion, GovernanceTier, RiskLevel } from './types.js';

// ── Types ──────────────────────────────────────────────────────────────

/**
 * OBO capability type classification.
 */
export type OboCapabilityType = 'email' | 'social' | 'transact' | 'general';

/**
 * An OBO detection finding with capability type.
 */
export interface OboFinding {
  /** Capability type detected. */
  readonly type: OboCapabilityType;
  /** Pattern that triggered detection. */
  readonly pattern: string;
  /** Confidence score (0.0-1.0). */
  readonly confidence: number;
}

/**
 * Data label inferred from skill analysis.
 */
export interface DataLabelSuggestion {
  /** Suggested label. */
  readonly label: string;
  /** Reason for the suggestion. */
  readonly reason: string;
  /** Confidence score (0.0-1.0). */
  readonly confidence: number;
}

/**
 * A decorator suggestion for handler.ts propagation (S02-F02).
 */
export interface DecoratorSuggestion {
  /** Decorator name (e.g., '@Obo', '@Risk'). */
  readonly decorator: string;
  /** Arguments for the decorator. */
  readonly args: string;
}

/**
 * A single diagnostic produced during annotation analysis.
 * Collect-all-errors: every issue is reported, not fail-fast.
 */
export interface AnnotateDiagnostic {
  /** Severity level. */
  readonly severity: 'info' | 'warning' | 'error';
  /** Diagnostic message. */
  readonly message: string;
  /** Source of the diagnostic. */
  readonly source: 'obo' | 'risk' | 'data-label' | 'tier' | 'decorator';
}

/**
 * Options for the annotate operation.
 */
export interface MakerAnnotateOptions {
  /** Path to the skill directory. */
  readonly skillDir: string;
}

/**
 * Result of the annotate operation — collect-all-errors.
 */
export interface MakerAnnotateResult {
  /** Skill name parsed from SKILL.md. */
  readonly name: string;
  /** OBO findings from capability analysis. */
  readonly oboFindings: readonly OboFinding[];
  /** Inferred risk level. */
  readonly inferredRisk: RiskLevel;
  /** Data label suggestions. */
  readonly dataLabels: readonly DataLabelSuggestion[];
  /** Annotation suggestions (compatible with P27 types). */
  readonly suggestions: readonly AnnotationSuggestion[];
  /** Decorator suggestions for handler.ts propagation. */
  readonly decorators: readonly DecoratorSuggestion[];
  /** All diagnostics (collect-all-errors). */
  readonly diagnostics: readonly AnnotateDiagnostic[];
  /** Suggested governance tier. */
  readonly suggestedTier: GovernanceTier;
  /** Duration in milliseconds. */
  readonly durationMs: number;
}

// ── OBO Capability Patterns ───────────────────────────────────────────

interface OboCapabilityPattern {
  readonly regex: RegExp;
  readonly type: OboCapabilityType;
  readonly label: string;
  readonly confidence: number;
}

const OBO_CAPABILITY_PATTERNS: readonly OboCapabilityPattern[] = [
  // Email capabilities
  { regex: /send[_-]?email/i, type: 'email', label: 'send-email', confidence: 0.90 },
  { regex: /\bemail\b.*\bsend\b/i, type: 'email', label: 'email-send', confidence: 0.85 },
  { regex: /\bmail\b/i, type: 'email', label: 'mail', confidence: 0.60 },
  // Social / messaging capabilities
  { regex: /post[_-]?message/i, type: 'social', label: 'post-message', confidence: 0.85 },
  { regex: /send[_-]?(?:slack|teams|message)/i, type: 'social', label: 'send-message', confidence: 0.85 },
  { regex: /\btweet\b/i, type: 'social', label: 'tweet', confidence: 0.80 },
  { regex: /\bnotif/i, type: 'social', label: 'notification', confidence: 0.65 },
  // Transactional capabilities
  { regex: /submit[_-]?form/i, type: 'transact', label: 'submit-form', confidence: 0.85 },
  { regex: /\bpurchas/i, type: 'transact', label: 'purchase', confidence: 0.90 },
  { regex: /\btransact/i, type: 'transact', label: 'transaction', confidence: 0.85 },
  { regex: /\bpay(?:ment)?\b/i, type: 'transact', label: 'payment', confidence: 0.80 },
  { regex: /\border\b/i, type: 'transact', label: 'order', confidence: 0.55 },
];

// ── Data Label Patterns ───────────────────────────────────────────────

interface DataLabelPattern {
  readonly regex: RegExp;
  readonly label: string;
  readonly reason: string;
  readonly confidence: number;
}

const DATA_LABEL_PATTERNS: readonly DataLabelPattern[] = [
  { regex: /\bpii\b/i, label: 'pii', reason: 'References PII data', confidence: 0.90 },
  { regex: /\b(?:email|e-mail)\b/i, label: 'communication', reason: 'Handles email communication', confidence: 0.75 },
  { regex: /\b(?:password|secret|credential|api[_-]?key)\b/i, label: 'secrets', reason: 'References credentials or secrets', confidence: 0.90 },
  { regex: /\b(?:credit[_-]?card|payment|billing)\b/i, label: 'financial', reason: 'Handles financial data', confidence: 0.85 },
  { regex: /\b(?:hipaa|phi|medical|health)\b/i, label: 'health', reason: 'References health/medical data', confidence: 0.85 },
  { regex: /\b(?:file[_-]?read|fs\.read|readFile)\b/i, label: 'file-access', reason: 'Reads file system data', confidence: 0.65 },
  { regex: /\b(?:browser|web[_-]?session|cookie)\b/i, label: 'web-session', reason: 'Handles browser/session data', confidence: 0.70 },
];

// ── Risk Inference from Tool Patterns ─────────────────────────────────

interface ToolRiskPattern {
  readonly regex: RegExp;
  readonly risk: RiskLevel;
  readonly label: string;
  readonly weight: number;
}

const TOOL_RISK_PATTERNS: readonly ToolRiskPattern[] = [
  // R5 — shell exec, production deploy
  { regex: /child_process|exec\s*\(|spawn\s*\(/i, risk: 5, label: 'shell-exec', weight: 0.90 },
  { regex: /\bdeploy\b/i, risk: 5, label: 'deploy', weight: 0.85 },
  // R4 — external side effects, browser control
  { regex: /\bbrowser\b.*\bcontrol\b|\bpuppeteer\b|\bplaywright\b/i, risk: 4, label: 'browser-control', weight: 0.85 },
  { regex: /send[_-]?email/i, risk: 4, label: 'send-email', weight: 0.85 },
  { regex: /\bdelete\b/i, risk: 4, label: 'delete', weight: 0.75 },
  { regex: /\bpost\b.*\bmessage\b/i, risk: 4, label: 'post-message', weight: 0.70 },
  // R3 — file writes, API mutations
  { regex: /fs\.write|writeFile/i, risk: 3, label: 'file-write', weight: 0.75 },
  { regex: /\bcreate\b/i, risk: 3, label: 'create', weight: 0.50 },
  { regex: /\bupdate\b/i, risk: 3, label: 'update', weight: 0.55 },
  // R2 — file read, network read
  { regex: /fs\.read|readFile/i, risk: 2, label: 'file-read', weight: 0.55 },
  { regex: /\bfetch\b|\bhttp\b|\baxios\b/i, risk: 2, label: 'network-read', weight: 0.55 },
  // R1 — pure computation
  { regex: /\bsearch\b|\bread\b|\blist\b|\bquery\b/i, risk: 1, label: 'read-only', weight: 0.40 },
];

// ── Core Engine ───────────────────────────────────────────────────────

/**
 * Detect OBO capabilities from combined skill text.
 */
export function detectOboCapabilities(text: string): readonly OboFinding[] {
  const findings: OboFinding[] = [];
  const seenTypes = new Set<string>();

  for (const pattern of OBO_CAPABILITY_PATTERNS) {
    if (pattern.regex.test(text)) {
      const key = `${pattern.type}:${pattern.label}`;
      if (!seenTypes.has(key)) {
        seenTypes.add(key);
        findings.push({
          type: pattern.type,
          pattern: pattern.label,
          confidence: pattern.confidence,
        });
      }
    }
  }

  return findings;
}

/**
 * Infer risk level from combined skill text using tool patterns.
 */
export function inferRiskLevel(text: string): RiskLevel {
  const votes: { risk: RiskLevel; weight: number }[] = [];

  for (const pattern of TOOL_RISK_PATTERNS) {
    if (pattern.regex.test(text)) {
      votes.push({ risk: pattern.risk, weight: pattern.weight });
    }
  }

  if (votes.length === 0) return 1;

  // Weighted vote: accumulate per risk level, highest risk wins ties
  const weights = new Map<RiskLevel, number>();
  for (const vote of votes) {
    weights.set(vote.risk, (weights.get(vote.risk) ?? 0) + vote.weight);
  }

  let bestRisk: RiskLevel = 1;
  let bestWeight = 0;
  for (const [risk, weight] of weights) {
    if (weight > bestWeight || (weight === bestWeight && risk > bestRisk)) {
      bestWeight = weight;
      bestRisk = risk;
    }
  }

  // Higher risk class with competitive weight (>= 50% of best) wins
  for (const [risk, weight] of weights) {
    if (risk > bestRisk && weight >= bestWeight * 0.5) {
      bestRisk = risk;
    }
  }

  return bestRisk;
}

/**
 * Suggest data labels from combined skill text.
 */
export function suggestDataLabels(text: string): readonly DataLabelSuggestion[] {
  const labels: DataLabelSuggestion[] = [];
  const seenLabels = new Set<string>();

  for (const pattern of DATA_LABEL_PATTERNS) {
    if (pattern.regex.test(text) && !seenLabels.has(pattern.label)) {
      seenLabels.add(pattern.label);
      labels.push({
        label: pattern.label,
        reason: pattern.reason,
        confidence: pattern.confidence,
      });
    }
  }

  return labels;
}

/**
 * Build decorator suggestions from analysis results (S02-F02).
 */
function buildDecoratorSuggestions(
  oboFindings: readonly OboFinding[],
  risk: RiskLevel,
  dataLabels: readonly DataLabelSuggestion[],
): readonly DecoratorSuggestion[] {
  const decorators: DecoratorSuggestion[] = [];

  decorators.push({ decorator: '@Risk', args: `${risk}` });

  if (oboFindings.length > 0) {
    decorators.push({ decorator: '@Obo', args: '' });
  }

  if (dataLabels.length > 0) {
    const labelNames = dataLabels.map(d => d.label).join(', ');
    decorators.push({ decorator: '@DataLabel', args: labelNames });
  }

  return decorators;
}

/**
 * Determine tier from workspace state and analysis (S02-F05).
 * Prompt-only skills (no handler) are capped at DECLARED (S02-F01).
 */
function inferTier(hasHandler: boolean): GovernanceTier {
  if (!hasHandler) return 'DECLARED';
  return 'TYPED';
}

/**
 * Read a file, returning undefined if it doesn't exist.
 */
async function readOptionalFile(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch {
    return undefined;
  }
}

/**
 * Run the maker annotate pipeline on a skill directory.
 *
 * Collect-all-errors: every diagnostic is accumulated, nothing short-circuits.
 *
 * @param options - Annotate options with skill directory path
 * @returns MakerAnnotateResult with all findings, suggestions, and diagnostics
 */
export async function makerAnnotate(
  options: MakerAnnotateOptions,
): Promise<MakerAnnotateResult> {
  const start = performance.now();
  const diagnostics: AnnotateDiagnostic[] = [];

  // Read SKILL.md
  const skillMdPath = join(options.skillDir, 'SKILL.md');
  const skillMdContent = await readOptionalFile(skillMdPath);

  if (!skillMdContent) {
    diagnostics.push({
      severity: 'error',
      source: 'tier',
      message: `SKILL.md not found at ${skillMdPath}`,
    });
    return {
      name: 'unknown',
      oboFindings: [],
      inferredRisk: 1,
      dataLabels: [],
      suggestions: [],
      decorators: [],
      diagnostics,
      suggestedTier: 'DECLARED',
      durationMs: performance.now() - start,
    };
  }

  // Parse frontmatter
  const { name, description } = parseSkillFrontmatter(skillMdContent);
  const skillName = name ?? 'unknown';

  // Read handler.ts
  const handlerPath = join(options.skillDir, 'handler.ts');
  const handlerContent = await readOptionalFile(handlerPath);
  const hasHandler = handlerContent !== undefined;

  if (!hasHandler) {
    diagnostics.push({
      severity: 'warning',
      source: 'tier',
      message: 'No handler.ts found — skill capped at DECLARED tier (S02-F01)',
    });
  }

  // Combine all text for analysis
  const combinedText = [
    skillName,
    description ?? '',
    skillMdContent,
    handlerContent ?? '',
  ].join(' ');

  // OBO detection
  const oboFindings = detectOboCapabilities(combinedText);
  if (oboFindings.length > 0) {
    for (const finding of oboFindings) {
      diagnostics.push({
        severity: 'warning',
        source: 'obo',
        message: `OBO pattern detected: ${finding.pattern} (${finding.type}, confidence ${(finding.confidence * 100).toFixed(0)}%)`,
      });
    }
  }

  // Also run the annotate engine's OBO detection for additional coverage
  const oboResult = detectObo(skillName, description ?? '');
  if (oboResult.detected && oboFindings.length === 0) {
    diagnostics.push({
      severity: 'info',
      source: 'obo',
      message: `OBO keywords detected from name/description: ${oboResult.matchedPatterns.join(', ')}`,
    });
  }

  // Risk inference
  const inferredRisk = inferRiskLevel(combinedText);
  diagnostics.push({
    severity: 'info',
    source: 'risk',
    message: `Inferred risk level: R${inferredRisk}`,
  });

  // Data label suggestion
  const dataLabels = suggestDataLabels(combinedText);
  for (const dl of dataLabels) {
    diagnostics.push({
      severity: 'info',
      source: 'data-label',
      message: `Suggested label '${dl.label}': ${dl.reason} (confidence ${(dl.confidence * 100).toFixed(0)}%)`,
    });
  }

  // Tier inference
  const suggestedTier = inferTier(hasHandler);

  // Decorator suggestions (S02-F02)
  const allOboFindings = oboFindings.length > 0
    ? oboFindings
    : oboResult.detected
      ? [{ type: 'general' as OboCapabilityType, pattern: oboResult.matchedPatterns[0] ?? 'obo', confidence: oboResult.confidence }]
      : [];

  const decorators = buildDecoratorSuggestions(allOboFindings, inferredRisk, dataLabels);
  for (const dec of decorators) {
    diagnostics.push({
      severity: 'info',
      source: 'decorator',
      message: `Suggested decorator: ${dec.decorator}(${dec.args})`,
    });
  }

  // Build AnnotationSuggestion (compatible with P27 types)
  const suggestions: AnnotationSuggestion[] = [];

  if (allOboFindings.length > 0) {
    suggestions.push({
      type: 'obo',
      message: `OBO capabilities detected: ${allOboFindings.map(f => f.pattern).join(', ')}. Enable OBO governance.`,
      confidence: Math.max(...allOboFindings.map(f => f.confidence)),
    });
  }

  suggestions.push({
    type: 'risk',
    message: `Inferred risk level R${inferredRisk} from tool usage patterns.`,
    confidence: 0.7,
  });

  if (dataLabels.length > 0) {
    suggestions.push({
      type: 'data-label',
      message: `Suggested data labels: ${dataLabels.map(d => d.label).join(', ')}`,
      confidence: Math.max(...dataLabels.map(d => d.confidence)),
    });
  }

  suggestions.push({
    type: 'tier',
    message: `Suggested governance tier: ${suggestedTier}`,
    confidence: hasHandler ? 0.8 : 0.9,
  });

  const durationMs = performance.now() - start;

  return {
    name: skillName,
    oboFindings: allOboFindings,
    inferredRisk,
    dataLabels,
    suggestions,
    decorators,
    diagnostics,
    suggestedTier,
    durationMs,
  };
}
