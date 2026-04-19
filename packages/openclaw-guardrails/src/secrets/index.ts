/**
 * @bic/openclaw-guardrails/secrets
 *
 * Credential leak detection with pattern matching + Shannon entropy. Per
 * guardrails.md §/secrets.
 */

export type {
  Confidence,
  PatternType,
  ScanOptions,
  ScanResult,
  SecretFinding,
  SecretPattern,
} from './types.js';

export {
  createSecretScanner,
  DefaultSecretScanner,
  maskSecret,
} from './scanner.js';
export type { SecretScanner } from './scanner.js';

export { DEFAULT_PATTERNS, matchPatterns } from './patterns.js';
export type { PatternMatch } from './patterns.js';

export { shannonEntropy, findHighEntropyTokens } from './entropy.js';
export type { EntropyTokenMatch } from './entropy.js';
