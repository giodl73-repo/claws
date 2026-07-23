/**
 * @bic/openclaw-guardrails/secrets — SecretScanner reference implementation.
 *
 * Per guardrails.md §/secrets: `scan(content, opts): ScanResult` + a
 * `registerPattern()` admin-trust-boundary seam. Findings carry `span`,
 * `confidence`, and `entropy`. Masked previews only — full secret values
 * NEVER leave the scanner.
 */

import type { ScanOptions, ScanResult, SecretFinding, SecretPattern } from "./types.js";
import { DEFAULT_PATTERNS, matchPatterns } from "./patterns.js";
import { findHighEntropyTokens, shannonEntropy } from "./entropy.js";

/** The public scanner contract per guardrails.md §/secrets. */
export interface SecretScanner {
  scan(content: string, opts?: ScanOptions): ScanResult;
  registerPattern(pattern: SecretPattern): void;
}

/** First 4 chars + `***`. `****` for values ≤4 chars. */
export function maskSecret(value: string): string {
  if (value.length <= 4) return "****";
  return value.slice(0, 4) + "***";
}

/**
 * In-memory `SecretScanner`. Registering a custom pattern is an
 * admin-trust-boundary operation — hosts MUST gate access to this seam.
 */
export class DefaultSecretScanner implements SecretScanner {
  private patterns: SecretPattern[] = [...DEFAULT_PATTERNS];

  scan(content: string, opts?: ScanOptions): ScanResult {
    const entropyThreshold = opts?.entropyThreshold ?? 4.5;
    const minEntropyLength = opts?.minEntropyLength ?? 20;

    const findings: SecretFinding[] = [];

    for (const m of matchPatterns(content, this.patterns)) {
      findings.push({
        ruleId: m.patternId,
        type: m.type,
        span: { start: m.start, end: m.end },
        preview: maskSecret(m.matched),
        confidence: m.confidence ?? "medium",
        entropy: shannonEntropy(m.matched),
      });
    }

    for (const t of findHighEntropyTokens(content, entropyThreshold, minEntropyLength)) {
      const overlaps = findings.some((f) => !(t.end <= f.span.start || t.start >= f.span.end));
      if (overlaps) continue;
      findings.push({
        ruleId: "entropy",
        type: "high-entropy",
        span: { start: t.start, end: t.end },
        preview: maskSecret(t.token),
        confidence: "low",
        entropy: t.entropy,
      });
    }

    // Sort deterministically by span.start so output is stable regardless of
    // pattern iteration order.
    findings.sort((a, b) => a.span.start - b.span.start);

    return {
      findings,
      entropy: shannonEntropy(content),
    };
  }

  registerPattern(pattern: SecretPattern): void {
    if (this.patterns.some((p) => p.id === pattern.id)) {
      throw new Error(`Pattern "${pattern.id}" is already registered`);
    }
    this.patterns.push(pattern);
  }
}

/** Factory returning the default `SecretScanner`. */
export function createSecretScanner(): SecretScanner {
  return new DefaultSecretScanner();
}
