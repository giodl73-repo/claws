/**
 * GET /diagnostics — return governance violations with location, severity, rule ID.
 *
 * Extracts violations from the cached GovernanceIR's analysis section
 * and returns them in a flat list with file:line location, severity level,
 * and rule ID for each violation.
 *
 * @module claws-serve/routes/diagnostics
 */

import { Router, type Request, type Response } from 'express';
import type { CompilationHost } from '../compilation-host.js';

export interface DiagnosticEntry {
  readonly ruleId: string;
  readonly level: number;
  readonly message: string;
  readonly target: string;
  readonly diagnosticCode: string;
}

export interface DiagnosticsResponse {
  readonly violations: readonly DiagnosticEntry[];
  readonly count: number;
}

export function diagnosticsRouter(host: CompilationHost): Router {
  const router = Router();

  router.get('/diagnostics', (_req: Request, res: Response) => {
    const ir = host.getCachedIR();

    if (ir === undefined) {
      res.status(404).json({ error: 'No compiled IR available. POST /compile first.' });
      return;
    }

    const violations: DiagnosticEntry[] = ir.analysis.violations.map((v) => ({
      ruleId: v.ruleId,
      level: v.level,
      message: v.message,
      target: v.target,
      diagnosticCode: v.diagnosticCode,
    }));

    const body: DiagnosticsResponse = {
      violations,
      count: violations.length,
    };

    res.status(200).json(body);
  });

  return router;
}
