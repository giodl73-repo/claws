/**
 * RFC 8785 JSON Canonicalization Scheme (JCS) + extended formatting rules.
 *
 * Implements rules C-1 through C-15 from workspace.md §/canonicalize. Output
 * bytes are identical across platforms (Linux + Windows + macOS on Node 20/22)
 * for any logically-equivalent input.
 *
 * Growth policy: any output-byte change for any valid input is a major bump
 * of CANONICALIZER_VERSION — even bug fixes that bring output closer to RFC
 * 8785 compliance, because they break policyId/snapshotId stability across
 * versions. New behavior goes in a new function with a separate version
 * constant, not in-place modification.
 *
 * @module @bic/openclaw-workspace/canonicalize/canonicalize
 */

import { createHash } from 'node:crypto';

/** Current canonicalizer version. Major bump on any output-byte change. */
export const CANONICALIZER_VERSION = '1.0.0';

export const CanonicalizeErrorCode = {
  NON_FINITE: 'E_NON_FINITE',
  UNDEFINED_IN_ARRAY: 'E_UNDEFINED_IN_ARRAY',
  BIGINT: 'E_BIGINT',
  NON_PLAIN_OBJECT: 'E_NON_PLAIN_OBJECT',
  DUPLICATE_KEY_AFTER_NFC: 'E_DUPLICATE_KEY_AFTER_NFC',
  NFKC_COLLAPSIBLE: 'E_NFKC_COLLAPSIBLE',
  DEPTH: 'E_DEPTH',
} as const;

export type CanonicalizeErrorCodeValue =
  (typeof CanonicalizeErrorCode)[keyof typeof CanonicalizeErrorCode];

export class CanonicalizeError extends Error {
  readonly code: CanonicalizeErrorCodeValue;

  constructor(message: string, code: CanonicalizeErrorCodeValue) {
    super(message);
    this.name = 'CanonicalizeError';
    this.code = code;
  }
}

const MAX_DEPTH = 100;

/**
 * Canonicalize an arbitrary JS value to RFC 8785 JCS UTF-8 bytes (returned
 * as a `string` — callers that need bytes do `Buffer.from(out, 'utf8')` or
 * `new TextEncoder().encode(out)`).
 *
 * Rules applied: C-1 through C-14 (C-15 is the caller's responsibility —
 * use `safeParse` at the bytes-to-value boundary).
 */
export function canonicalize(value: unknown): string {
  return serialize(value, 0);
}

/**
 * Hash of canonicalize output as `sha256-<base64url>`. The prefix is
 * load-bearing — any future algorithm change is a major version bump AND
 * produces a visually distinguishable prefix. Never emits a bare hex digest.
 */
export function canonicalHash(value: unknown): string {
  const bytes = canonicalize(value);
  const digest = createHash('sha256').update(bytes, 'utf8').digest();
  return 'sha256-' + digest.toString('base64url');
}

/**
 * Hash an object after stripping the named fields. Used when an object
 * carries a self-referential id field (policyId, snapshotId) that must
 * be excluded before canonicalizing. The one helper shared across the
 * family — @bic/openclaw-policy (PolicyIR → policyId) and
 * @bic/openclaw-snap (promote-time PolicyIR self-consistency) both call
 * this so a drift in one never desyncs the other.
 */
export function computeStrippedHash(obj: object, omit: readonly string[]): string {
  const clone = { ...obj } as Record<string, unknown>;
  for (const key of omit) delete clone[key];
  return canonicalHash(clone);
}

/**
 * Tokenizer-boundary safe JSON parser (rule C-15). Rejects input whose
 * nesting depth exceeds `options.maxDepth` at the tokenizer layer, before
 * any recursion occurs. Throws `CanonicalizeError` code `E_DEPTH` on
 * rejection.
 *
 * Why not JSON.parse? `JSON.parse` has no depth ceiling; a depth-1e6 input
 * stack-overflows the V8 parser before the canonicalize() depth check can
 * ever run. `safeParse` bounds the parse stack explicitly.
 */
export function safeParse(
  bytes: Uint8Array | string,
  options: { maxDepth: number },
): unknown {
  const text = typeof bytes === 'string' ? bytes : new TextDecoder('utf-8').decode(bytes);
  let depth = 0;
  const limit = options.maxDepth;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    if (ch === 0x7b /* { */ || ch === 0x5b /* [ */) {
      depth++;
      if (depth > limit) {
        throw new CanonicalizeError(
          `safeParse: input depth exceeds ${limit}`,
          CanonicalizeErrorCode.DEPTH,
        );
      }
    } else if (ch === 0x7d /* } */ || ch === 0x5d /* ] */) {
      depth--;
    } else if (ch === 0x22 /* " */) {
      i = skipString(text, i);
    }
  }
  return JSON.parse(text) as unknown;
}

function skipString(text: string, start: number): number {
  let i = start + 1;
  while (i < text.length) {
    const ch = text.charCodeAt(i);
    if (ch === 0x5c /* \ */) {
      i += 2;
      continue;
    }
    if (ch === 0x22 /* " */) return i;
    i++;
  }
  return text.length;
}

// -- Serialization ------------------------------------------------------

function serialize(value: unknown, depth: number): string {
  if (depth > MAX_DEPTH) {
    throw new CanonicalizeError(
      `canonicalize: input depth exceeds ${MAX_DEPTH}`,
      CanonicalizeErrorCode.DEPTH,
    );
  }

  if (value === null) return 'null';

  const t = typeof value;

  if (t === 'boolean') return value ? 'true' : 'false';

  if (t === 'string') return serializeString(normalizeNFC(value as string));

  if (t === 'number') return serializeNumber(value as number);

  if (t === 'bigint') {
    throw new CanonicalizeError(
      'canonicalize: BigInt is not serializable',
      CanonicalizeErrorCode.BIGINT,
    );
  }

  if (t === 'undefined') {
    // undefined at top level or array position is handled by callers.
    throw new CanonicalizeError(
      'canonicalize: undefined is not serializable at this position',
      CanonicalizeErrorCode.UNDEFINED_IN_ARRAY,
    );
  }

  if (t === 'function' || t === 'symbol') {
    throw new CanonicalizeError(
      `canonicalize: ${t} is not serializable`,
      CanonicalizeErrorCode.NON_PLAIN_OBJECT,
    );
  }

  if (Array.isArray(value)) return serializeArray(value, depth);

  return serializeObject(value as object, depth);
}

function serializeArray(arr: readonly unknown[], depth: number): string {
  if (arr.length === 0) return '[]';
  const parts: string[] = [];
  for (const item of arr) {
    if (item === undefined) {
      throw new CanonicalizeError(
        'canonicalize: undefined in array is not serializable',
        CanonicalizeErrorCode.UNDEFINED_IN_ARRAY,
      );
    }
    parts.push(serialize(item, depth + 1));
  }
  return '[' + parts.join(',') + ']';
}

function serializeObject(obj: object, depth: number): string {
  const proto = Object.getPrototypeOf(obj) as unknown;
  if (proto !== Object.prototype && proto !== null) {
    throw new CanonicalizeError(
      'canonicalize: non-plain object (Date, class instance, Map, Set, etc.) is not serializable',
      CanonicalizeErrorCode.NON_PLAIN_OBJECT,
    );
  }

  const rawKeys = Object.keys(obj);
  const nfcMap = new Map<string, string>();
  for (const key of rawKeys) {
    const nfc = normalizeNFC(key);
    if (nfcMap.has(nfc)) {
      throw new CanonicalizeError(
        `canonicalize: duplicate key after NFC normalization: ${JSON.stringify(nfc)}`,
        CanonicalizeErrorCode.DUPLICATE_KEY_AFTER_NFC,
      );
    }
    if (isNfkcCollapsible(nfc)) {
      throw new CanonicalizeError(
        `canonicalize: NFKC-collapsible key rejected: ${JSON.stringify(nfc)}`,
        CanonicalizeErrorCode.NFKC_COLLAPSIBLE,
      );
    }
    nfcMap.set(nfc, key);
  }

  const nfcKeys = Array.from(nfcMap.keys()).sort(utf16CodeUnitCompare);

  const parts: string[] = [];
  for (const nfc of nfcKeys) {
    const original = nfcMap.get(nfc)!;
    const raw = (obj as Record<string, unknown>)[original];
    if (raw === undefined) continue; // rule C-11 — drop key
    parts.push(serializeString(nfc) + ':' + serialize(raw, depth + 1));
  }

  return '{' + parts.join(',') + '}';
}

function serializeString(s: string): string {
  let out = '"';
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i);
    if (ch === 0x22) out += '\\"';
    else if (ch === 0x5c) out += '\\\\';
    else if (ch === 0x08) out += '\\b';
    else if (ch === 0x09) out += '\\t';
    else if (ch === 0x0a) out += '\\n';
    else if (ch === 0x0c) out += '\\f';
    else if (ch === 0x0d) out += '\\r';
    else if (ch < 0x20) out += '\\u' + ch.toString(16).padStart(4, '0');
    else out += s[i];
  }
  return out + '"';
}

function serializeNumber(n: number): string {
  if (!Number.isFinite(n)) {
    throw new CanonicalizeError(
      'canonicalize: NaN, +Infinity, -Infinity are not serializable',
      CanonicalizeErrorCode.NON_FINITE,
    );
  }
  if (Object.is(n, -0)) return '0';
  if (Number.isInteger(n) && Math.abs(n) < 2 ** 53) return n.toFixed(0);
  return n.toString();
}

function normalizeNFC(s: string): string {
  return s.normalize('NFC');
}

function isNfkcCollapsible(s: string): boolean {
  return s !== s.normalize('NFKC');
}

function utf16CodeUnitCompare(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ca = a.charCodeAt(i);
    const cb = b.charCodeAt(i);
    if (ca !== cb) return ca - cb;
  }
  return a.length - b.length;
}
