import { Router, type Request, type Response } from 'express';
import type { CompilationHost } from '../compilation-host.js';

export interface ViolationSummary {
  error: number;
  warning: number;
  info: number;
}

export interface StatusResponse {
  fileCount: number;
  lastCompileTime: string | null;
  violations: ViolationSummary;
}

export function statusRouter(host?: CompilationHost | undefined): Router {
  const router = Router();

  router.get('/status', (_req: Request, res: Response) => {
    // If no CompilationHost is wired, return 501 Not Implemented
    if (host === undefined) {
      res.status(501).json({ error: 'Status not available — no compile function configured' });
      return;
    }

    const ir = host.getCachedIR();

    // No compilation has run yet — report zeros truthfully
    if (ir === undefined) {
      const body: StatusResponse = {
        fileCount: 0,
        lastCompileTime: null,
        violations: { error: 0, warning: 0, info: 0 },
      };
      res.json(body);
      return;
    }

    // Derive real counts from the cached GovernanceIR
    const fileCount = ir.capabilities.tools.length
      + ir.capabilities.skills.length
      + ir.capabilities.agents.length
      + ir.capabilities.workflows.length;

    // getCompiledAt() is guaranteed to have a value when getCachedIR() does
    const lastCompileTime = host.getCompiledAt()!;

    // Violations at level >= 4 are errors, level 3 = warning, the rest are info
    let errorCount = 0;
    let warningCount = 0;
    for (const v of ir.analysis.violations) {
      if (v.level >= 4) {
        errorCount++;
      } else {
        warningCount++;
      }
    }
    const infoCount = ir.analysis.warnings.length;

    const body: StatusResponse = {
      fileCount,
      lastCompileTime,
      violations: { error: errorCount, warning: warningCount, info: infoCount },
    };

    res.json(body);
  });

  return router;
}
