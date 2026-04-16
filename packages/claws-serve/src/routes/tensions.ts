/**
 * GET /tensions — return cross-file tension list with cluster mapping.
 *
 * Derives tension entries from the cached GovernanceIR's conflict report,
 * mapping OBO conflicts and multi-constraint conflicts into a unified
 * tension list with cluster identifiers (A-G), involved files, and
 * resolution guidance.
 *
 * @module claws-serve/routes/tensions
 */

import { Router, type Request, type Response } from 'express';
import type { CompilationHost } from '../compilation-host.js';

/**
 * Cluster identifiers for tension classification.
 * A = OBO grant/deny, B = multi-constraint, C-G reserved for future.
 */
export type TensionCluster = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface TensionEntry {
  readonly cluster: TensionCluster;
  readonly severity: string;
  readonly involvedFiles: readonly string[];
  readonly description: string;
  readonly resolution: string;
}

export interface TensionsResponse {
  readonly tensions: readonly TensionEntry[];
  readonly count: number;
}

function oboResolution(grantRuleId: string, denyRuleId: string, oboWithoutElicit: boolean): string {
  if (oboWithoutElicit) {
    return `Add elicit gate for OBO permission granted by ${grantRuleId}, or remove OBO grant.`;
  }
  return `Reconcile grant rule ${grantRuleId} with deny rule ${denyRuleId}.`;
}

export function tensionsRouter(host: CompilationHost): Router {
  const router = Router();

  router.get('/tensions', (_req: Request, res: Response) => {
    const ir = host.getCachedIR();

    if (ir === undefined) {
      res.status(404).json({ error: 'No compiled IR available. POST /compile first.' });
      return;
    }

    const tensions: TensionEntry[] = [];

    // Map OBO conflicts to cluster A tensions
    for (const obo of ir.conflicts.oboConflicts) {
      tensions.push({
        cluster: 'A',
        severity: obo.severity,
        involvedFiles: [obo.grantRuleId, obo.denyRuleId],
        description: obo.description,
        resolution: oboResolution(obo.grantRuleId, obo.denyRuleId, obo.oboWithoutElicit),
      });
    }

    // Map multi-constraint conflicts to cluster B tensions
    for (const mc of ir.conflicts.multiConstraintConflicts) {
      tensions.push({
        cluster: 'B',
        severity: mc.severity,
        involvedFiles: mc.ruleIds.slice(),
        description: mc.description,
        resolution: `Resolve multi-constraint conflict on target "${mc.target}" involving ${String(mc.ruleIds.length)} rules.`,
      });
    }

    const body: TensionsResponse = {
      tensions,
      count: tensions.length,
    };

    res.status(200).json(body);
  });

  return router;
}
