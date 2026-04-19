/**
 * Request validation middleware for PATCH chunk routes.
 *
 * Runs AHEAD of the route handler so malformed requests are rejected
 * before the SDK's ValidationPipeline ever sees them. Three checks, all
 * fail-closed:
 *   1. Content-Type must be `application/json` (exact media type, ignoring
 *      charset). Anything else → 415.
 *   2. Content-Length must be declared and within the 1MB cap. Oversize or
 *      missing length on PATCH → 413 / 411.
 *   3. After Express JSON parsing, the body must shape-match an
 *      {@link EditOperation}. Non-conforming bodies → 400 with a
 *      descriptive error code so the CAP UI can highlight the offending
 *      field.
 *
 * Structural (preflight) and governance validation happen downstream in
 * the SDK's ValidationPipeline — this middleware only guards the HTTP
 * edge so business logic never sees a malformed request.
 *
 * @module claws-serve/middleware/validation-middleware
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import {
  CHUNK_EDITABLE_FILES,
  type ChunkEditableFile,
  type EditOperation,
} from '../../../claws-sdk/src/workspace-edit/index.js';

const DEFAULT_MAX_BYTES = 1_048_576; // 1 MB

/** Response body when request validation fails before reaching the handler. */
export interface RequestValidationErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

function parseMediaType(header: string): string {
  const semi = header.indexOf(';');
  const raw = semi === -1 ? header : header.slice(0, semi);
  return raw.trim().toLowerCase();
}

function sendError(res: Response, status: number, code: string, message: string): void {
  const body: RequestValidationErrorBody = { error: { code, message } };
  res.status(status).json(body);
}

const EDIT_KINDS = new Set(['toggle', 'set', 'append', 'remove']);

function isChunkEditableFile(value: unknown): value is ChunkEditableFile {
  return typeof value === 'string' && (CHUNK_EDITABLE_FILES as readonly string[]).includes(value);
}

/**
 * Shape-check a JSON body against the {@link EditOperation} union.
 *
 * This is intentionally lightweight (no Zod dependency): the CAP UI is
 * the only partner that POSTs here today, and every other validator in
 * the chain re-checks its own invariants. The middleware guarantees the
 * handler never branches on `undefined` or wrong-type fields.
 */
function validateEditOperationShape(
  body: unknown,
): { ok: true; op: EditOperation } | { ok: false; code: string; message: string } {
  if (body === null || typeof body !== 'object') {
    return { ok: false, code: 'INVALID_BODY', message: 'Request body must be a JSON object' };
  }
  const obj = body as Record<string, unknown>;
  if (typeof obj['kind'] !== 'string' || !EDIT_KINDS.has(obj['kind'])) {
    return {
      ok: false,
      code: 'INVALID_EDIT_KIND',
      message: `Field "kind" must be one of: toggle, set, append, remove`,
    };
  }
  if (!isChunkEditableFile(obj['file'])) {
    return {
      ok: false,
      code: 'INVALID_EDIT_FILE',
      message: `Field "file" must be one of: ${CHUNK_EDITABLE_FILES.join(', ')}`,
    };
  }
  if (typeof obj['section'] !== 'string') {
    return { ok: false, code: 'INVALID_EDIT_SECTION', message: 'Field "section" must be a string' };
  }
  const kind = obj['kind'];
  if (kind === 'toggle') {
    if (typeof obj['field'] !== 'string') {
      return { ok: false, code: 'INVALID_EDIT_FIELD', message: 'Field "field" must be a string' };
    }
    if (typeof obj['value'] !== 'boolean') {
      return { ok: false, code: 'INVALID_EDIT_VALUE', message: 'Field "value" must be a boolean for toggle' };
    }
  } else if (kind === 'set') {
    if (typeof obj['field'] !== 'string') {
      return { ok: false, code: 'INVALID_EDIT_FIELD', message: 'Field "field" must be a string' };
    }
    if (typeof obj['value'] !== 'string') {
      return { ok: false, code: 'INVALID_EDIT_VALUE', message: 'Field "value" must be a string for set' };
    }
  } else {
    if (typeof obj['item'] !== 'string') {
      return { ok: false, code: 'INVALID_EDIT_ITEM', message: 'Field "item" must be a string' };
    }
  }
  return { ok: true, op: body as EditOperation };
}

export interface PatchValidationOptions {
  readonly maxBytes?: number;
}

/**
 * Envelope check — runs BEFORE `express.json()` so oversized/unsupported
 * requests surface a structured JSON error instead of Express's default
 * HTML body-parser rejection. Only inspects headers.
 */
export function patchEnvelopeMiddleware(options: PatchValidationOptions = {}): RequestHandler {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  return (req: Request, res: Response, next: NextFunction): void => {
    const ct = req.headers['content-type'];
    if (ct === undefined || parseMediaType(ct) !== 'application/json') {
      sendError(res, 415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json');
      return;
    }

    const contentLength = req.headers['content-length'];
    if (contentLength === undefined) {
      sendError(res, 411, 'LENGTH_REQUIRED', 'Content-Length header is required on PATCH');
      return;
    }
    const declared = parseInt(contentLength, 10);
    if (Number.isNaN(declared)) {
      sendError(res, 400, 'INVALID_CONTENT_LENGTH', 'Content-Length header is malformed');
      return;
    }
    if (declared > maxBytes) {
      sendError(res, 413, 'PAYLOAD_TOO_LARGE', `Request body exceeds ${String(maxBytes)} bytes`);
      return;
    }

    next();
  };
}

/**
 * Shape check — runs AFTER `express.json()`. Validates the parsed body
 * matches an {@link EditOperation} and stashes it on `req.editOperation`
 * so the handler never re-parses.
 */
export function patchShapeMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const shape = validateEditOperationShape(req.body);
    if (!shape.ok) {
      sendError(res, 400, shape.code, shape.message);
      return;
    }
    (req as Request & { editOperation?: EditOperation }).editOperation = shape.op;
    next();
  };
}

/**
 * Convenience combinator — returns a two-stage middleware stack that
 * mounts correctly around `express.json()`. Use
 * `patchEnvelopeMiddleware()` + `express.json()` + `patchShapeMiddleware()`
 * for full control.
 */
export function patchValidationMiddleware(options: PatchValidationOptions = {}): RequestHandler[] {
  return [patchEnvelopeMiddleware(options), patchShapeMiddleware()];
}
