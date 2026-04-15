/**
 * DiagnosticError — the error contract for all claws user-facing errors.
 *
 * Every diagnostic includes:
 * - WHAT: what went wrong
 * - HOW: actionable remediation steps
 * - WHERE: file + line + column location
 * - docsUrl: (optional) link to relevant documentation; falls back to
 *   `claws help {code}` inline suggestion when absent.
 *
 * @module claws-cli/errors/contract
 */

import { lookupErrorCode } from './codes.js';

/**
 * Source location for a diagnostic.
 */
export interface DiagnosticLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

/**
 * Structured diagnostic output from `toDiagnostic()`.
 */
export interface Diagnostic {
  readonly code: string;
  readonly what: string;
  readonly how: string;
  readonly where: DiagnosticLocation;
  readonly docsUrl: string | null;
  readonly docsHint: string;
}

/**
 * Error class that enforces the four-field diagnostic contract.
 *
 * WHAT is always set (inherited from Error.message).
 * HOW is always set (actionable remediation).
 * WHERE is always set (file + line + column).
 * docsUrl is optional; when absent, `toDiagnostic()` provides an
 * inline `claws help {code}` fallback.
 */
export class DiagnosticError extends Error {
  readonly code: string;
  readonly how: string;
  readonly where: DiagnosticLocation;
  readonly docsUrl: string | undefined;

  constructor(opts: {
    code: string;
    what: string;
    how: string;
    where: DiagnosticLocation;
    docsUrl?: string | undefined;
  }) {
    super(opts.what);
    this.name = 'DiagnosticError';
    this.code = opts.code;
    this.how = opts.how;
    this.where = opts.where;
    this.docsUrl = opts.docsUrl;
  }

  /**
   * Produce a structured diagnostic for rendering or serialization.
   *
   * When docsUrl is not provided, the diagnostic falls back to an
   * inline `claws help {code}` hint that resolves the error code
   * description from the registry.
   */
  toDiagnostic(): Diagnostic {
    const entry = lookupErrorCode(this.code);
    const fallbackHint = entry
      ? `Run \`claws help ${this.code}\` — ${entry.description}`
      : `Run \`claws help ${this.code}\` for details`;

    return {
      code: this.code,
      what: this.message,
      how: this.how,
      where: this.where,
      docsUrl: this.docsUrl ?? null,
      docsHint: fallbackHint,
    };
  }
}
