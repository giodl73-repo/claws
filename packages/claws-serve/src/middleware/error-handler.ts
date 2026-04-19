/**
 * Centralized error handler middleware for claws-serve.
 *
 * Maps SDK and serve-layer errors to structured JSON HTTP responses.
 * Never leaks stack traces when NODE_ENV === 'production'.
 *
 * Mapping:
 * - ValidationError / name === 'ValidationError' -> 400
 * - OcPathError / name === 'OcPathError' -> 400 (malformed oc:// input)
 * - WorkspaceError / name === 'WorkspaceError' -> discriminated by `code`:
 *     * WORKSPACE_SOUL_MISSING (default) and any *_MISSING code  -> 404
 *     * *_STALE codes                                             -> 409
 *     * any other code                                            -> 400
 * - WorkspaceNotFoundError / name === 'WorkspaceNotFoundError' -> 404
 * - Everything else -> 500 (generic internal error, no details)
 *
 * Routes throw these SDK errors without per-route try/catch; this
 * middleware is the single mapping seam so every partner gets the same
 * `{ error: { code, message, details? } }` response shape.
 *
 * @module claws-serve/middleware/error-handler
 */

import type { ErrorRequestHandler, Request, Response, NextFunction, RequestHandler } from 'express';
import { WorkspaceError, OcPathError } from '../../../claws-sdk/src/workspace/index.js';

/**
 * Serve-layer validation error. Route handlers throw this to signal
 * a 400 Bad Request with a structured code + message + details payload.
 */
export class ValidationError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(message: string, code = 'VALIDATION_ERROR', details?: Record<string, unknown>) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Serve-layer "not found" error. Route handlers throw this when a
 * requested resource (workspace, chunk, snapshot) does not exist.
 */
export class WorkspaceNotFoundError extends Error {
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(message: string, code = 'WORKSPACE_NOT_FOUND', details?: Record<string, unknown>) {
    super(message);
    this.name = 'WorkspaceNotFoundError';
    this.code = code;
    this.details = details;
  }
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
}

function isProduction(): boolean {
  return process.env['NODE_ENV'] === 'production';
}

function isDuckTyped(err: unknown, name: string): boolean {
  return err instanceof Error && err.name === name;
}

function statusForWorkspaceError(code: string): number {
  if (code.endsWith('_STALE')) return 409;
  if (code.endsWith('_MISSING')) return 404;
  return 400;
}

function statusForError(err: unknown): number {
  if (err instanceof ValidationError) return 400;
  if (err instanceof OcPathError) return 400;
  if (err instanceof WorkspaceError) return statusForWorkspaceError(err.code);
  if (err instanceof WorkspaceNotFoundError) return 404;
  if (err instanceof Error) {
    if (err.name === 'ValidationError') return 400;
    if (err.name === 'OcPathError') return 400;
    if (err.name === 'WorkspaceError') {
      const code = (err as unknown as { code?: unknown }).code;
      return typeof code === 'string' ? statusForWorkspaceError(code) : 400;
    }
    if (err.name === 'WorkspaceNotFoundError') return 404;
  }
  return 500;
}

function codeForError(err: unknown, status: number): string {
  if (err instanceof ValidationError || err instanceof WorkspaceNotFoundError) {
    return err.code;
  }
  if (err instanceof OcPathError || err instanceof WorkspaceError) {
    return err.code;
  }
  if (err instanceof Error) {
    const maybeCode = (err as unknown as { code?: unknown }).code;
    if (typeof maybeCode === 'string') {
      return maybeCode;
    }
  }
  if (status === 400) return 'VALIDATION_ERROR';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  return 'INTERNAL_ERROR';
}

function messageForError(err: unknown, status: number): string {
  if (status >= 500) {
    return 'Internal server error';
  }
  if (err instanceof Error && err.message !== '') {
    return err.message;
  }
  return 'Error';
}

function detailsForError(err: unknown): Record<string, unknown> | undefined {
  if (err instanceof ValidationError || err instanceof WorkspaceNotFoundError) {
    return err.details;
  }
  if (err instanceof OcPathError) {
    return { input: err.input };
  }
  if (err instanceof WorkspaceError) {
    return { workspaceRoot: err.workspaceRoot };
  }
  if (isDuckTyped(err, 'OcPathError')) {
    const maybeInput = (err as unknown as { input?: unknown }).input;
    if (typeof maybeInput === 'string') return { input: maybeInput };
  }
  if (isDuckTyped(err, 'WorkspaceError')) {
    const maybeRoot = (err as unknown as { workspaceRoot?: unknown }).workspaceRoot;
    if (typeof maybeRoot === 'string') return { workspaceRoot: maybeRoot };
  }
  return undefined;
}

/**
 * Express error-handling middleware. Must be registered last, after all
 * routes. Produces a `{ error: { code, message, details? } }` JSON body
 * with an appropriate HTTP status.
 */
export function errorHandler(): ErrorRequestHandler {
  return (err: unknown, _req: Request, res: Response, next: NextFunction): void => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const status = statusForError(err);
    const code = codeForError(err, status);
    const message = messageForError(err, status);
    const details = detailsForError(err);

    const body: ErrorBody = {
      error: { code, message },
    };
    if (details !== undefined) {
      body.error.details = details;
    }
    if (!isProduction() && status >= 500 && err instanceof Error && err.stack !== undefined) {
      body.error.stack = err.stack;
    }

    res.status(status).json(body);
  };
}

/**
 * 404 handler for unknown routes. Must be registered after all routes
 * but before `errorHandler()`. Emits a structured JSON 404 response.
 */
export function notFoundHandler(): RequestHandler {
  return (req: Request, res: Response): void => {
    res.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `No route matches ${req.method} ${req.path}`,
      },
    });
  };
}
