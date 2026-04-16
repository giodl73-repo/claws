/**
 * GET /classify/:tool — return risk classification for a named tool.
 *
 * Looks up the tool in the cached GovernanceIR's capability manifest
 * and returns R-level, capability list (classification), and OBO status.
 * Returns 404 for unknown tool names.
 *
 * @module claws-serve/routes/classify
 */

import { Router, type Request, type Response } from 'express';
import type { CompilationHost } from '../compilation-host.js';

/**
 * Risk level mapping from ToolRiskLevel to R-level string (R1-R5).
 */
const RISK_LEVEL_MAP: Record<string, string> = {
  minimal: 'R1',
  low: 'R2',
  medium: 'R3',
  high: 'R4',
  critical: 'R5',
};

export interface ClassifyResponse {
  readonly tool: string;
  readonly rLevel: string;
  readonly classification: string;
  readonly oboFlag: boolean;
  readonly description: string;
}

export function classifyRouter(host: CompilationHost): Router {
  const router = Router();

  router.get('/classify/:tool', (req: Request, res: Response) => {
    const ir = host.getCachedIR();

    if (ir === undefined) {
      res.status(404).json({ error: 'No compiled IR available. POST /compile first.' });
      return;
    }

    const toolName = req.params['tool']!;
    const tool = ir.capabilities.tools.find((t) => t.name === toolName);

    if (tool === undefined) {
      res.status(404).json({ error: `Tool "${toolName}" not found in compiled IR.` });
      return;
    }

    const body: ClassifyResponse = {
      tool: tool.name,
      rLevel: RISK_LEVEL_MAP[tool.riskLevel] ?? 'R1',
      classification: tool.classification,
      oboFlag: tool.oboFlag,
      description: tool.description,
    };

    res.status(200).json(body);
  });

  return router;
}
