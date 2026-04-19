/**
 * oc:// path syntax — universal addressing for the OC workspace.
 *
 * Canonical form: `oc://{file}[/{section}[/{item}[/{field}]]][?session={id}]`
 *
 * Used in PatchError messages, audit events, governance warnings, chunk
 * governance context, API error responses, SSE events, TUI error banners,
 * and VS Code diagnostics. No ad-hoc string paths anywhere — every path
 * through the serve layer flows through `parseOcPath` / `formatOcPath`.
 *
 * Round-trip contract: `formatOcPath(parseOcPath(s)) === s` for every valid
 * path produced by `formatOcPath`.
 *
 * @module @bic/openclaw-workspace/path/oc-path
 */

const OC_SCHEME = 'oc://';

/**
 * Parsed oc:// path. Components nest strictly: `item` implies `section`,
 * `field` implies `item`. Structural violations are rejected by `formatOcPath`.
 */
export interface OcPath {
  /** Target file or virtual root (e.g. `SOUL.md`, `skills/email-drafter`). Always present. */
  readonly file: string;
  /** Optional H2 section within the file (e.g. `Boundaries`). */
  readonly section?: string;
  /** Optional item within a section (e.g. `deny-rule-1`). Requires `section`. */
  readonly item?: string;
  /** Optional field on an item (e.g. `risk`). Requires `item`. */
  readonly field?: string;
  /** Optional session scope (e.g. `cron:daily`). Orthogonal to nesting. */
  readonly session?: string;
}

/**
 * Error thrown when an oc:// path cannot be parsed or formatted.
 *
 * `code` is a stable, machine-readable tag; downstream consumers (PatchError,
 * audit events, error handlers) match on `code`, not on `message`.
 */
export class OcPathError extends Error {
  readonly code: string;
  readonly input: string;

  constructor(message: string, input: string, code: string) {
    super(message);
    this.name = 'OcPathError';
    this.input = input;
    this.code = code;
  }
}

/**
 * Parse an oc:// path string into a structured `OcPath`.
 *
 * Accepts the full syntax: file, optional section/item/field, optional
 * `?session=` query parameter. Unknown query parameters are silently ignored.
 *
 * Throws `OcPathError` for missing scheme, empty file, or empty path segments.
 */
export function parseOcPath(input: string): OcPath {
  if (typeof input !== 'string') {
    throw new OcPathError('oc:// path must be a string', String(input), 'OC_PATH_NOT_STRING');
  }
  if (!input.startsWith(OC_SCHEME)) {
    throw new OcPathError(`Missing oc:// scheme: ${input}`, input, 'OC_PATH_MISSING_SCHEME');
  }

  const afterScheme = input.slice(OC_SCHEME.length);
  const queryIndex = afterScheme.indexOf('?');
  const pathPart = queryIndex === -1 ? afterScheme : afterScheme.slice(0, queryIndex);
  const queryPart = queryIndex === -1 ? '' : afterScheme.slice(queryIndex + 1);

  if (pathPart.length === 0) {
    throw new OcPathError(`Empty oc:// path: ${input}`, input, 'OC_PATH_EMPTY');
  }

  const segments = pathPart.split('/');
  for (const seg of segments) {
    if (seg.length === 0) {
      throw new OcPathError(`Empty segment in oc:// path: ${input}`, input, 'OC_PATH_EMPTY_SEGMENT');
    }
  }

  const session = extractSession(queryPart);

  const result: OcPath = {
    file: segments[0]!,
    ...(segments[1] !== undefined ? { section: segments[1] } : {}),
    ...(segments[2] !== undefined ? { item: segments[2] } : {}),
    ...(segments[3] !== undefined ? { field: segments[3] } : {}),
    ...(session !== undefined ? { session } : {}),
  };

  if (segments.length > 4) {
    throw new OcPathError(
      `Too many segments in oc:// path (max 4): ${input}`,
      input,
      'OC_PATH_TOO_DEEP'
    );
  }

  return result;
}

/**
 * Format an `OcPath` struct back into its canonical string form.
 */
export function formatOcPath(path: OcPath): string {
  if (!path.file || path.file.length === 0) {
    throw new OcPathError('oc:// path requires a file', '', 'OC_PATH_FILE_REQUIRED');
  }
  if (path.item !== undefined && path.section === undefined) {
    throw new OcPathError(
      'Structural nesting violation: item requires section',
      path.file,
      'OC_PATH_NESTING'
    );
  }
  if (path.field !== undefined && path.item === undefined) {
    throw new OcPathError(
      'Structural nesting violation: field requires item',
      path.file,
      'OC_PATH_NESTING'
    );
  }

  let out = OC_SCHEME + path.file;
  if (path.section !== undefined) out += '/' + path.section;
  if (path.item !== undefined) out += '/' + path.item;
  if (path.field !== undefined) out += '/' + path.field;
  if (path.session !== undefined) out += '?session=' + path.session;
  return out;
}

/**
 * Type guard — true iff `input` is a non-empty string that `parseOcPath`
 * would accept. Does not throw; callers can branch on this before parsing.
 */
export function isValidOcPath(input: unknown): input is string {
  if (typeof input !== 'string') return false;
  try {
    parseOcPath(input);
    return true;
  } catch {
    return false;
  }
}

function extractSession(queryPart: string): string | undefined {
  if (queryPart.length === 0) return undefined;
  for (const pair of queryPart.split('&')) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex === -1) continue;
    const key = pair.slice(0, eqIndex);
    const value = pair.slice(eqIndex + 1);
    if (key === 'session' && value.length > 0) return value;
  }
  return undefined;
}
