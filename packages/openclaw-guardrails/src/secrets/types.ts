/**
 * @bic/openclaw-guardrails/secrets — Core types per guardrails.md §/secrets.
 *
 * Findings carry a byte `span` + `confidence` + `preview` (always masked).
 * Full secret values NEVER leave the scanner.
 */

export type PatternType =
  | "api-key"
  | "token"
  | "password"
  | "private-key"
  | "connection-string"
  | "high-entropy"
  | "jwt";

export type Confidence = "low" | "medium" | "high";

export interface SecretPattern {
  id: string;
  label: string;
  type: PatternType;
  regex: RegExp;
  /** Default confidence for matches of this pattern. */
  confidence?: Confidence;
}

export interface SecretFinding {
  ruleId: string;
  /** Byte-offset span of the matched token in the scanned content. */
  span: { start: number; end: number };
  /** First 4 chars of the matched token followed by ***; never the full value. */
  preview: string;
  confidence: Confidence;
  /**
   * Shannon entropy of the matched token in bits/char. Always present;
   * useful for ranking high-entropy-only findings vs. pattern matches.
   */
  entropy: number;
  type: PatternType;
}

export interface ScanResult {
  findings: SecretFinding[];
  /** Aggregate content entropy for the scan input (bits/char). */
  entropy: number;
}

export interface ScanOptions {
  /** Shannon-entropy floor for standalone high-entropy detection. Default 4.5. */
  entropyThreshold?: number;
  /** Minimum token length to consider for entropy scan. Default 20. */
  minEntropyLength?: number;
}
