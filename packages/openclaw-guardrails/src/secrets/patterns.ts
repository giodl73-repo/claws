/**
 * @bic/openclaw-guardrails/secrets — Regex patterns for credential detection.
 *
 * Default rule set covers AWS, GCP, Azure, GitHub, private keys, JWTs, and
 * common password / connection-string patterns. Registration of custom
 * patterns is an admin-trust-boundary operation (SecretScanner.registerPattern).
 */

import type { SecretPattern } from './types.js';

export const DEFAULT_PATTERNS: SecretPattern[] = [
  // AWS
  {
    id: 'aws-access-key',
    label: 'AWS Access Key ID',
    type: 'api-key',
    confidence: 'high',
    regex: /AKIA[0-9A-Z]{16}/g,
  },
  {
    id: 'aws-secret-key',
    label: 'AWS Secret Access Key',
    type: 'api-key',
    confidence: 'high',
    regex: /aws(?:.{0,20})?['"][0-9a-zA-Z/+]{40}['"]/gi,
  },
  // GCP
  {
    id: 'gcp-api-key',
    label: 'GCP API Key',
    type: 'api-key',
    confidence: 'high',
    regex: /AIza[0-9A-Za-z_-]{35}/g,
  },
  // Azure
  {
    id: 'azure-storage-key',
    label: 'Azure Storage Account Key',
    type: 'api-key',
    confidence: 'high',
    regex: /(?:DefaultEndpointsProtocol=|AccountKey=)[A-Za-z0-9+/=]{80,}/g,
  },
  // GitHub
  {
    id: 'github-token',
    label: 'GitHub Token',
    type: 'token',
    confidence: 'high',
    regex: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g,
  },
  // Private keys
  {
    id: 'private-key',
    label: 'Private Key (RSA/EC/DSA/OPENSSH/PGP)',
    type: 'private-key',
    confidence: 'high',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
  },
  // JWT
  {
    id: 'jwt',
    label: 'JSON Web Token',
    type: 'jwt',
    confidence: 'medium',
    regex: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  },
  // Generic
  {
    id: 'generic-api-key',
    label: 'Generic API Key',
    type: 'api-key',
    confidence: 'low',
    regex: /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([A-Za-z0-9_-]{20,})['"]?/gi,
  },
  {
    id: 'generic-bearer',
    label: 'Bearer Token',
    type: 'token',
    confidence: 'low',
    regex: /(?:bearer|token)\s*[:=]\s*['"]?([A-Za-z0-9_.-]{20,})['"]?/gi,
  },
  {
    id: 'password-assignment',
    label: 'Password Assignment',
    type: 'password',
    confidence: 'low',
    regex: /(?:password|passwd|pwd)\s*[:=]\s*['"]([^'"]{8,})['"]?/gi,
  },
  {
    id: 'connection-string',
    label: 'Connection String',
    type: 'connection-string',
    confidence: 'medium',
    regex: /(?:connectionstring|conn_str|database_url)\s*[:=]\s*['"]?([^\s'"]{20,})['"]?/gi,
  },
];

export interface PatternMatch {
  patternId: string;
  type: SecretPattern['type'];
  confidence: SecretPattern['confidence'];
  matched: string;
  start: number;
  end: number;
}

/** Run all patterns against `content`; return per-match positions + confidence. */
export function matchPatterns(
  content: string,
  patterns: readonly SecretPattern[] = DEFAULT_PATTERNS,
): PatternMatch[] {
  const results: PatternMatch[] = [];

  for (const pattern of patterns) {
    const re = pattern.regex;
    if (re.global) re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      const matched = match[1] ?? match[0];
      const start =
        match.index + (match[1] !== undefined ? match[0].indexOf(match[1]) : 0);
      results.push({
        patternId: pattern.id,
        type: pattern.type,
        confidence: pattern.confidence ?? 'medium',
        matched,
        start,
        end: start + matched.length,
      });
      if (!re.global) break;
    }
  }

  return results;
}
