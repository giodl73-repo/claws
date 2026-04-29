/**
 * Unified `oc://` URI facade — discriminated union over the two URI
 * surfaces:
 *
 *   - `oc://config/<path>` → runtime config addressing (config form)
 *   - `oc://<file>/...` → workspace file addressing (workspace form)
 *
 * Consumers that don't care about the distinction call `parseOcUri()`
 * and `formatOcUri()` with the discriminated `ParsedOcUri`. Consumers
 * that want a specific surface still call `parseOcConfigUri` /
 * `parseOcPath` directly.
 *
 * Dispatch rule: any URI starting with `oc://config` (with no character
 * between `config` and the boundary) parses via the config branch;
 * everything else routes to the workspace branch.
 *
 * @module @bic/openclaw-workspace/path/oc-uri
 */

import { parseOcConfigUri, formatOcConfigUri } from './oc-config-uri.js';
import { parseOcPath, formatOcPath, type OcPath } from './oc-path.js';

export type ParsedOcUri =
  | { readonly kind: 'workspace'; readonly path: OcPath }
  | { readonly kind: 'config'; readonly path: ReadonlyArray<string | number> };

const CONFIG_PREFIX = 'oc://config';

/**
 * Parse any `oc://` URI to its discriminated form. Throws the appropriate
 * sub-parser's error (`OcConfigUriError` or `OcPathError`) on malformed
 * input.
 */
export function parseOcUri(uri: string): ParsedOcUri {
  if (uri === CONFIG_PREFIX || (uri.startsWith(CONFIG_PREFIX) && (uri.length === CONFIG_PREFIX.length || uri.charCodeAt(CONFIG_PREFIX.length) === 0x2f /* / */))) {
    const parsed = parseOcConfigUri(uri);
    return { kind: 'config', path: parsed.path };
  }
  const parsed = parseOcPath(uri);
  return { kind: 'workspace', path: parsed };
}

/**
 * Format a `ParsedOcUri` back to its string form. Round-trips with
 * `parseOcUri` for any input it was capable of producing.
 */
export function formatOcUri(parsed: ParsedOcUri): string {
  if (parsed.kind === 'config') return formatOcConfigUri(parsed.path);
  return formatOcPath(parsed.path);
}
