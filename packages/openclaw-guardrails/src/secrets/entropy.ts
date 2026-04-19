/**
 * @bic/openclaw-guardrails/secrets — Shannon entropy analysis.
 *
 * Computes entropy in bits/char. Maximum for base64 (|A|=64) is ~6; for
 * hex (|A|=16) is 4. Tokens below minLength or threshold are skipped.
 */

export function shannonEntropy(value: string): number {
  if (value.length === 0) return 0;

  const freq = new Map<string, number>();
  for (const char of value) {
    freq.set(char, (freq.get(char) ?? 0) + 1);
  }

  let entropy = 0;
  const len = value.length;

  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

const TOKEN_REGEX = /[A-Za-z0-9+/=_-]{8,}/g;

export interface EntropyTokenMatch {
  token: string;
  start: number;
  end: number;
  entropy: number;
}

/**
 * Scan `content` for high-entropy tokens. Returns spans (start/end byte
 * offsets) + computed entropy per match — callers can emit findings with
 * position + confidence without re-scanning.
 */
export function findHighEntropyTokens(
  content: string,
  threshold: number = 4.5,
  minLength: number = 20,
): EntropyTokenMatch[] {
  const matches: EntropyTokenMatch[] = [];
  let match: RegExpExecArray | null;

  TOKEN_REGEX.lastIndex = 0;

  while ((match = TOKEN_REGEX.exec(content)) !== null) {
    const token = match[0];
    if (token.length < minLength) continue;
    const entropy = shannonEntropy(token);
    if (entropy < threshold) continue;
    const start = match.index;
    matches.push({
      token,
      start,
      end: start + token.length,
      entropy,
    });
  }

  return matches;
}
