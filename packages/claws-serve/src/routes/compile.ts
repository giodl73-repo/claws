/**
 * POST /compile — trigger recompilation and return GovernanceIR.
 *
 * When a ClientManager is provided, emits compile:start and compile:complete
 * WebSocket events to all connected clients.
 *
 * ## Violation guard (P73 / CP-7 R1 C1)
 *
 * When a `ViolationStateMachine` is threaded in via options, each compile
 * pass is reduced through `compileWithViolationGuard` so that:
 *
 *   - A clean compile advances the machine (transition listeners fire
 *     `governance_resolved` if the previous state was degraded).
 *   - A compile that surfaces violations keeps the previous last-good IR
 *     in place and transitions the machine to the severity-matching
 *     degraded state.
 *   - A compile that throws invokes the synthetic ERROR classifier and
 *     transitions the machine to ERROR; the route still returns 500 so
 *     the client sees the explicit failure (the gate protects subsequent
 *     PATCHes).
 *
 * @module claws-serve/routes/compile
 */

import { Router, type Request, type Response } from 'express';
import type { CompilationHost } from '../compilation-host.js';
import type { ServerState } from '../server.js';
import type { ClientManager } from '../ws/events.js';
import { createEvent } from '../ws/events.js';
import { compileWithViolationGuard } from '../../../claws-sdk/src/compile/violation-aware-compile.js';
import type { ViolationInput } from '../../../claws-sdk/src/workspace/violation-state.js';
import type { ViolationStateMachine } from '../../../claws-sdk/src/workspace/violation-state.js';
import type { GovernanceIR } from '../../../claws-sdk/src/index.js';

export interface CompileResponse {
  readonly ir: unknown;
  readonly cached: boolean;
  readonly durationMs: number;
}

export interface CompileRouterOptions {
  /**
   * Violation state machine — when present, compiles are reduced through
   * `compileWithViolationGuard` so the machine's state matches the live
   * IR health. When absent (legacy tests, CLI `once` mode), the route
   * compiles directly without touching any machine state.
   */
  readonly machine?: ViolationStateMachine | undefined;
  /**
   * Supplier of the current workspace version (monotonic counter). Called
   * per compile so the machine records the version at which the last
   * successful compile landed. Defaults to `0` when omitted.
   */
  readonly currentVersion?: (() => number) | undefined;
}

/**
 * Default classifier — maps `GovernanceIR.analysis.violations` (compiler
 * rule violations) onto `ViolationInput`. Level 5 with `haltReason !== null`
 * signals a structural failure and becomes an ERROR; level 5 alone is an
 * R5 tool lock; level 3+ is a warning; anything else is info.
 *
 * Exposed so tests and the LSP layer can share the exact same mapping.
 */
export function classifyIRViolations(ir: GovernanceIR): readonly ViolationInput[] {
  const out: ViolationInput[] = [];
  const structural = ir.conflicts.haltReason !== null;
  for (const v of ir.analysis.violations) {
    if (v.level >= 5) {
      if (structural) {
        out.push({
          path: `oc://${v.target}`,
          severity: 'error',
          rule: v.ruleId,
          message: v.message,
          fixGuidance: v.fixSuggestions[0]?.description ?? '',
          source: 'external_edit',
          scope: 'structural',
        });
      } else {
        out.push({
          path: `oc://${v.target}`,
          severity: 'error',
          rule: v.ruleId,
          message: v.message,
          fixGuidance: v.fixSuggestions[0]?.description ?? '',
          source: 'external_edit',
          scope: 'isolated',
          tool: v.target,
        });
      }
    } else if (v.level >= 3) {
      out.push({
        path: `oc://${v.target}`,
        severity: 'warning',
        rule: v.ruleId,
        message: v.message,
        fixGuidance: v.fixSuggestions[0]?.description ?? '',
        source: 'external_edit',
        scope: 'isolated',
      });
    }
  }
  return out;
}

export function compileRouter(
  host: CompilationHost,
  state: ServerState,
  clientManager?: ClientManager | undefined,
  options: CompileRouterOptions = {},
): Router {
  const router = Router();

  // Track the last-good IR so `compileWithViolationGuard` can preserve it
  // when a compile pass surfaces violations. The CompilationHost already
  // holds its own cache, but its cache reflects "last compile" — not
  // "last CLEAN compile". Holding this separately lets the machine tell
  // the two apart (P73 AC: "last good IR serves during degraded").
  let lastGoodIR: GovernanceIR | undefined;

  router.post('/compile', async (_req: Request, res: Response) => {
    try {
      clientManager?.broadcast(createEvent('compile:start'));

      if (options.machine !== undefined) {
        const currentVersion = options.currentVersion?.() ?? 0;
        // Thread CompileResult out of the guard so cached/durationMs are
        // reported accurately on subsequent compiles (CompilationHost's
        // SHA-256 hash cache skips the body when nothing changed).
        let lastCompileResult: import('../compilation-host.js').CompileResult | undefined;
        const guardResult = await compileWithViolationGuard(
          {
            compile: async () => {
              const r = await host.compile();
              lastCompileResult = r;
              return r.ir;
            },
            classify: classifyIRViolations,
            machine: options.machine,
            currentVersion,
          },
          lastGoodIR,
        );
        state.compileCount++;

        if (!guardResult.degraded && guardResult.ir !== undefined) {
          lastGoodIR = guardResult.ir;
        }

        // Fallback for degraded + cold-start: no cached IR yet. Report the
        // fresh IR from the host so partners see a coherent body; the
        // machine's state carries the degradation signal.
        const ir = guardResult.ir ?? host.getCachedIR();
        if (ir === undefined) {
          res.status(500).json({ error: 'Compilation produced no IR' });
          return;
        }

        const cached = lastCompileResult?.cached ?? false;
        const durationMs = lastCompileResult?.durationMs ?? 0;
        const body: CompileResponse = {
          ir,
          cached,
          durationMs,
        };
        clientManager?.broadcast(createEvent('compile:complete', {
          cached,
          durationMs,
        }));
        if (ir.analysis.violations.length > 0 || ir.analysis.warnings.length > 0) {
          clientManager?.broadcast(createEvent('diagnostic:update', {
            violationCount: ir.analysis.violations.length,
            warningCount: ir.analysis.warnings.length,
          }));
        }
        if (ir.conflicts.totalConflicts > 0) {
          clientManager?.broadcast(createEvent('tension:detected', {
            totalConflicts: ir.conflicts.totalConflicts,
            oboConflicts: ir.conflicts.oboConflicts.length,
            multiConstraintConflicts: ir.conflicts.multiConstraintConflicts.length,
          }));
        }
        res.status(200).json(body);
        return;
      }

      const result = await host.compile();
      state.compileCount++;

      const body: CompileResponse = {
        ir: result.ir,
        cached: result.cached,
        durationMs: result.durationMs,
      };

      clientManager?.broadcast(createEvent('compile:complete', {
        cached: result.cached,
        durationMs: result.durationMs,
      }));

      // Emit diagnostic:update if there are violations or warnings
      const ir = result.ir;
      if (ir.analysis.violations.length > 0 || ir.analysis.warnings.length > 0) {
        clientManager?.broadcast(createEvent('diagnostic:update', {
          violationCount: ir.analysis.violations.length,
          warningCount: ir.analysis.warnings.length,
        }));
      }

      // Emit tension:detected for each conflict
      if (ir.conflicts.totalConflicts > 0) {
        clientManager?.broadcast(createEvent('tension:detected', {
          totalConflicts: ir.conflicts.totalConflicts,
          oboConflicts: ir.conflicts.oboConflicts.length,
          multiConstraintConflicts: ir.conflicts.multiConstraintConflicts.length,
        }));
      }

      res.status(200).json(body);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Compilation failed';
      res.status(500).json({ error: message });
    }
  });

  return router;
}
