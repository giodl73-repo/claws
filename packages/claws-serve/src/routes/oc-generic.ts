/**
 * GET/PATCH /api/oc/{path} — Layer 1 generic OC router.
 *
 * The central router that serves every OC workspace file as parsed
 * markdown. `GET /api/oc/TOOLS.md` returns the full file, `GET
 * /api/oc/TOOLS.md#Tools` returns only the `Tools` H2 section.
 * Missing files return a structured 404.
 *
 * `PATCH /api/oc/{path}` is routed through write-time validation.
 * The actual edit surface lands in pulse 29 (workspace-edit); until
 * then this route returns a 501 with a stable NOT_IMPLEMENTED code so
 * partners can detect the capability boundary.
 *
 * Thin HTTP adapter (SDK-owns-logic rule): the handler composes
 * `parseWorkspace` and returns the pre-parsed `SectionBase` from
 * `WorkspaceState`. All parsing lives in `claws-sdk/workspace/parser`.
 *
 * File set: the 7 markdown OC files surfaced on `WorkspaceState`
 * (`OC_PARSED_FILES`). Compile-only entries (`skills/`, `lobster.yaml`)
 * are not routed here; requests for them fall through to ROUTE_NOT_FOUND.
 *
 * @module claws-serve/routes/oc-generic
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  OC_PARSED_FILES,
  parseWorkspace,
  type OcParsedFile,
  type ParsedSection,
  type SectionBase,
  type WorkspaceState,
} from '../../../claws-sdk/src/workspace/index.js';
import type { CompilationHost } from '../compilation-host.js';

export interface OcGenericRouterOptions {
  readonly workspaceRoot: string;
}

export interface OcFileResponse {
  readonly file: OcParsedFile;
  readonly sections: readonly ParsedSection[];
  readonly preamble: string;
  readonly raw: string;
}

export interface OcSectionResponse {
  readonly file: OcParsedFile;
  readonly section: ParsedSection;
}

const OC_FILE_NAMES: readonly OcParsedFile[] = OC_PARSED_FILES;

function isOcFileName(name: string): name is OcParsedFile {
  return (OC_FILE_NAMES as readonly string[]).includes(name);
}

function selectSection(file: SectionBase, heading: string): ParsedSection | undefined {
  return file.sections.find((s) => s.heading === heading);
}

function fileFromWorkspace(state: WorkspaceState, name: OcParsedFile): SectionBase | null {
  const map: Record<OcParsedFile, SectionBase | null> = {
    'SOUL.md': state.soul,
    'MEMORY.md': state.memory,
    'IDENTITY.md': state.identity,
    'TOOLS.md': state.tools,
    'AGENTS.md': state.agents,
    'USER.md': state.user,
    'HEARTBEAT.md': state.heartbeat,
  };
  return map[name];
}

/**
 * Attach `GET /:file` and `PATCH /:file` to the `oc` prefix router.
 * Uses Express's `:file` param so fragment addressing is handled by
 * the query string (`?section=Tools`) — HTTP fragments (`#`) never
 * reach the server, so partners encode the section via query.
 *
 * Both `?section=` and a trailing `/section/{heading}` form are
 * accepted; the trailing form is canonical for CLI tools that cannot
 * encode `#`.
 */
export function ocGenericRouter(
  host: CompilationHost,
  options: OcGenericRouterOptions,
): Router {
  const router = Router();

  router.get('/:file', (req, res, next) => {
    handleGet(host, options, req, res, next).catch(next);
  });

  router.get('/:file/section/:heading', (req, res, next) => {
    handleGetSection(host, options, req, res, next).catch(next);
  });

  router.patch('/:file', (req, res, next) => {
    handlePatch(host, options, req, res, next).catch(next);
  });

  return router;
}

async function handleGet(
  _host: CompilationHost,
  options: OcGenericRouterOptions,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const fileParam = req.params['file']!;
  if (!isOcFileName(fileParam)) {
    // Defer to the next handler (404 middleware) — unknown OC file
    // names are not route-level errors, they are simply unmatched
    // routes and should surface as ROUTE_NOT_FOUND.
    next();
    return;
  }

  const state = await parseWorkspace(options.workspaceRoot);
  const file = fileFromWorkspace(state, fileParam);
  if (file === null) {
    res.status(404).json({
      error: {
        code: 'OC_FILE_MISSING',
        message: `OC file not found in workspace: ${fileParam}`,
      },
    });
    return;
  }

  const sectionQuery = req.query['section'];
  if (typeof sectionQuery === 'string' && sectionQuery.length > 0) {
    const section = selectSection(file, sectionQuery);
    if (section === undefined) {
      res.status(404).json({
        error: {
          code: 'OC_SECTION_MISSING',
          message: `Section not found in ${fileParam}: ${sectionQuery}`,
        },
      });
      return;
    }
    const body: OcSectionResponse = { file: fileParam, section };
    res.status(200).json(body);
    return;
  }

  const body: OcFileResponse = {
    file: fileParam,
    sections: file.sections,
    preamble: file.preamble,
    raw: file.raw,
  };
  res.status(200).json(body);
}

async function handleGetSection(
  _host: CompilationHost,
  options: OcGenericRouterOptions,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const fileParam = req.params['file']!;
  const heading = req.params['heading']!;
  if (!isOcFileName(fileParam)) {
    next();
    return;
  }

  const state = await parseWorkspace(options.workspaceRoot);
  const file = fileFromWorkspace(state, fileParam);
  if (file === null) {
    res.status(404).json({
      error: {
        code: 'OC_FILE_MISSING',
        message: `OC file not found in workspace: ${fileParam}`,
      },
    });
    return;
  }
  const section = selectSection(file, heading);
  if (section === undefined) {
    res.status(404).json({
      error: {
        code: 'OC_SECTION_MISSING',
        message: `Section not found in ${fileParam}: ${heading}`,
      },
    });
    return;
  }
  const body: OcSectionResponse = { file: fileParam, section };
  res.status(200).json(body);
}

async function handlePatch(
  _host: CompilationHost,
  _options: OcGenericRouterOptions,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const fileParam = req.params['file']!;
  if (!isOcFileName(fileParam)) {
    // Defer to the next handler (404 middleware) — unknown OC file
    // names are not route-level errors, they are simply unmatched
    // routes and should surface as ROUTE_NOT_FOUND.
    next();
    return;
  }
  res.status(501).json({
    error: {
      code: 'OC_PATCH_NOT_IMPLEMENTED',
      message: 'PATCH /api/oc/{file} lands in pulse 29 (workspace-edit).',
    },
  });
}
