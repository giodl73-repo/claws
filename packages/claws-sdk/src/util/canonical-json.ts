/**
 * RFC 8785 JCS canonical JSON serialization.
 *
 * Produces a deterministic string representation for any JSON-serializable
 * value: object keys are sorted, `undefined` fields are dropped, and
 * arrays preserve order. Used by the audit chain, WAL, and evidence
 * export modules to compute stable hashes.
 *
 * Internalized from agent-sdk/suite/audit/hash-chain.ts during the claws-sdk
 * graduation (Pulse 13). Keeping it in `util/` rather than `audit/` lets any
 * layer that needs a stable JSON string depend on it without reaching into
 * an audit-specific module.
 *
 * @module claws-sdk/util/canonical-json
 */

export function canonicalJson(obj: unknown): string {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (Array.isArray(obj)) return '[' + obj.map(canonicalJson).join(',') + ']';
  if (typeof obj === 'object') {
    const record = obj as Record<string, unknown>;
    const sorted = Object.keys(record).sort();
    const pairs = sorted
      .filter(k => record[k] !== undefined)
      .map(k => JSON.stringify(k) + ':' + canonicalJson(record[k]));
    return '{' + pairs.join(',') + '}';
  }
  return JSON.stringify(obj);
}
