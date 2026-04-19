/**
 * GET /api/chunks/preferences/{instructions|schedule} — Layer 2 Preferences tab chunks.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): the handlers parse the workspace
 * once per request, call `assembleChunks`, and re-label the assembled
 * preferences chunk for the requested sub-section. All per-tab data
 * projection — including schedule derivation from HEARTBEAT.md — lives in
 * `claws-sdk/workspace/chunk-assembler#assemblePreferences`. Routes must
 * not contain domain classification logic (CP-5 R1 M02 — arch-M1).
 *
 * Two sub-sections are exposed to give CAP partners distinct routing
 * targets with section-specific `writeBack` URLs. Both serve the same
 * upstream chunk data so switching panes does not cause a flicker in the
 * UI. When HEARTBEAT.md is absent, the assembler omits `data.schedule`,
 * so partners know the schedule surface is empty without a 404.
 *
 * IR-resolution contract: defers to the shared {@link resolveIR} helper.
 * Partners that receive 409 `COMPILATION_REQUIRED` drive `POST /compile`;
 * 503 `COMPILATION_ERRORED` indicates the last-good IR is unavailable.
 *
 * @module claws-serve/routes/chunks-preferences
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  assembleChunks,
  parseWorkspace,
  type Chunk,
  type FleetPolicy,
} from '../../../claws-sdk/src/workspace/index.js';
import type { CompilationHost } from '../compilation-host.js';
import {
  applyTimeTravelCache,
  resolveReadIR,
  respondCompilationRequired,
  respondIrErrored,
} from './ir-resolution.js';

export interface ChunksPreferencesRouterOptions {
  /** Absolute workspace root to parse per request. */
  readonly workspaceRoot: string;
  /** Optional fleet policy to pass through to the assembler. */
  readonly fleetPolicy?: FleetPolicy;
}

export function chunksPreferencesRouter(
  host: CompilationHost,
  options: ChunksPreferencesRouterOptions,
): Router {
  const router = Router();

  router.get('/preferences/instructions', (req, res, next) => {
    handleSubSection(host, options, 'instructions', req, res, next).catch(next);
  });
  router.get('/preferences/schedule', (req, res, next) => {
    handleSubSection(host, options, 'schedule', req, res, next).catch(next);
  });

  return router;
}

type SubSection = 'instructions' | 'schedule';

async function handleSubSection(
  host: CompilationHost,
  options: ChunksPreferencesRouterOptions,
  subsection: SubSection,
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const workspace = await parseWorkspace(options.workspaceRoot);
  const resolution = resolveReadIR(req, host);
  if (resolution.status === 'missing') {
    respondCompilationRequired(res);
    return;
  }
  if (resolution.status === 'errored') {
    respondIrErrored(res, resolution.haltReason);
    return;
  }
  const result = await assembleChunks(workspace, resolution.ir, {
    ...(options.fleetPolicy !== undefined ? { fleetPolicy: options.fleetPolicy } : {}),
  });
  const labelled = relabelForSubSection(result.preferences, subsection);
  if (resolution.historical) applyTimeTravelCache(res);
  res.status(200).json(labelled);
}

/**
 * Apply the section label + writeBack URL for the requested sub-section.
 * Upstream chunk data (including `data.schedule` when HEARTBEAT.md is
 * present) is preserved verbatim — the assembler owns all projection.
 */
function relabelForSubSection(
  base: Chunk<'preferences'>,
  subsection: SubSection,
): Chunk<'preferences'> {
  if (subsection === 'instructions') {
    return {
      ...base,
      section: 'instructions',
      writeBack: { method: 'PATCH', url: '/api/chunks/preferences/instructions' },
    };
  }
  return {
    ...base,
    section: 'schedule',
    editable: { schedule: { type: 'object' } },
    writeBack: { method: 'PATCH', url: '/api/chunks/preferences/schedule' },
  };
}
