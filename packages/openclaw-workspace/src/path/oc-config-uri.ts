/**
 * `oc://config/...` URI scheme for runtime-config addressing.
 *
 * Companion to `oc-path.ts` (workspace-file URIs). Where workspace-file
 * URIs use file / section / item / field nesting, config URIs use
 * arbitrary-depth path segments matching the JSON object structure of
 * `openclaw.config.json`:
 *
 *   `oc://config/channels/matrix/accessToken`
 *   `oc://config/plugins/entries/my-plugin/options/timeout-ms`
 *   `oc://config/channels/matrix/allowFrom/0`         (array index)
 *
 * Round-trip contract: `formatOcConfigUri(parseOcConfigUri(s).path) === s`
 * for any URI produced by `formatOcConfigUri`.
 *
 * Forward-compat: PR-2 in the openclaw-upstream wave canonicalizes this
 * scheme upstream. The implementation here is the proto; the lint module
 * uses it today so findings carry deep-linkable URIs even before PR-2
 * lands.
 *
 * @module @bic/openclaw-workspace/path/oc-config-uri
 */

const PREFIX = 'oc://config';

export interface ParsedOcConfigUri {
  readonly path: ReadonlyArray<string | number>;
}

export class OcConfigUriError extends Error {
  readonly code: string;
  readonly input: string;
  constructor(message: string, input: string, code: string) {
    super(message);
    this.name = 'OcConfigUriError';
    this.input = input;
    this.code = code;
  }
}

/**
 * Format a path (mix of object keys and array indices) as an oc://config URI.
 * Empty path produces `oc://config` (the document root).
 */
export function formatOcConfigUri(path: ReadonlyArray<string | number>): string {
  if (path.length === 0) return PREFIX;
  const segments = path.map((seg) => encodeSegment(seg));
  return `${PREFIX}/${segments.join('/')}`;
}

/**
 * Parse an oc://config URI back into a structured path. Numeric segments
 * become numbers (array indices); string segments stay strings (object keys).
 */
export function parseOcConfigUri(uri: string): ParsedOcConfigUri {
  if (!uri.startsWith(PREFIX)) {
    throw new OcConfigUriError(`expected "${PREFIX}" prefix`, uri, 'OC_CFG_URI_BAD_SCHEME');
  }
  const rest = uri.slice(PREFIX.length);
  if (rest === '') return { path: [] };
  if (rest === '/') {
    throw new OcConfigUriError('trailing slash with no path segments', uri, 'OC_CFG_URI_TRAILING_SLASH');
  }
  if (!rest.startsWith('/')) {
    throw new OcConfigUriError('expected "/" after scheme prefix', uri, 'OC_CFG_URI_MISSING_SLASH');
  }
  if (rest.includes('//')) {
    throw new OcConfigUriError('empty path segment ("//")', uri, 'OC_CFG_URI_EMPTY_SEGMENT');
  }
  const rawSegments = rest.slice(1).split('/');
  const path: Array<string | number> = [];
  for (const raw of rawSegments) {
    if (raw === '') {
      throw new OcConfigUriError('empty path segment', uri, 'OC_CFG_URI_EMPTY_SEGMENT');
    }
    const decoded = decodeURIComponent(raw);
    // Numeric → array index. Match strict integer form (no leading zeros
    // except the single-zero case, no signs, no decimal).
    if (/^(?:0|[1-9][0-9]*)$/.test(decoded)) {
      path.push(Number.parseInt(decoded, 10));
    } else {
      path.push(decoded);
    }
  }
  return { path };
}

function encodeSegment(seg: string | number): string {
  if (typeof seg === 'number') return String(seg);
  // Must encode `/`, `%`, `?`, `#`, `[`, `]`, and any chars that would
  // break URI syntax. encodeURIComponent does this and more (encodes `=`,
  // `&` too — fine, errs on safe side).
  return encodeURIComponent(seg);
}

/**
 * Resolve an `oc://config/...` URI against a config tree (an arbitrary
 * `unknown` root, typed by the caller). Walks string keys and numeric
 * indices following the URI's path.
 *
 * Returns `{found: true, value, parentNode, leafKey}` if the path
 * resolves to a leaf, or `{found: false}` if any segment is missing
 * (including array out-of-bounds). Never throws on missing path.
 *
 * Throws `OcConfigUriError` only if the URI itself is malformed (caller
 * gave us garbage). Mirrors the throw-on-bad-input convention of
 * `parseOcConfigUri` so callers have a single error type to handle.
 *
 * **Caller-typed config**: the `configRoot` parameter is `unknown` so
 * this helper doesn't take a dependency on any specific config schema.
 * Real consumers cast their typed config (`OpenClawConfig`, etc.) to
 * `unknown` at the call site.
 */
export type ResolveResult =
  | {
      readonly found: true;
      readonly value: unknown;
      readonly parentNode: object | readonly unknown[];
      readonly leafKey: string | number;
    }
  | { readonly found: false };

export function resolveConfigUri(uri: string, configRoot: unknown): ResolveResult {
  const parsed = parseOcConfigUri(uri); // throws on malformed URI
  const path = parsed.path;
  if (path.length === 0) {
    // Root-level URI: no leaf to address.
    return { found: false };
  }
  let parent: unknown = configRoot;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i]!;
    if (parent === null || parent === undefined) return { found: false };
    if (typeof seg === 'number') {
      if (!Array.isArray(parent)) return { found: false };
      if (seg < 0 || seg >= parent.length) return { found: false };
      parent = parent[seg];
    } else {
      if (typeof parent !== 'object' || Array.isArray(parent)) return { found: false };
      const obj = parent as Record<string, unknown>;
      if (!Object.prototype.hasOwnProperty.call(obj, seg)) return { found: false };
      parent = obj[seg];
    }
  }
  const leafKey = path[path.length - 1]!;
  if (parent === null || parent === undefined) return { found: false };
  if (typeof leafKey === 'number') {
    if (!Array.isArray(parent)) return { found: false };
    if (leafKey < 0 || leafKey >= parent.length) return { found: false };
    return {
      found: true,
      value: parent[leafKey],
      parentNode: parent,
      leafKey,
    };
  } else {
    if (typeof parent !== 'object' || Array.isArray(parent)) return { found: false };
    const obj = parent as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(obj, leafKey)) return { found: false };
    return {
      found: true,
      value: obj[leafKey],
      parentNode: obj,
      leafKey,
    };
  }
}
