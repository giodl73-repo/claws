/**
 * parseWorkspace — read the 7 markdown OC workspace files into a typed
 * WorkspaceState.
 *
 * Reads are parallel, lossless, and tolerate missing optional files.
 * BOM and CRLF are preserved on `raw`; parsing works on a normalized copy.
 *
 * The workspace file list is authoritatively declared in `./oc-files.ts`
 * (9 entries — the 7 markdown files parsed here plus `skills/` and
 * `lobster.yaml` which the compile plane reads but the serve layer does
 * not need to surface today).
 *
 * @module claws-sdk/workspace/parser
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { extractH2Sections, extractPreamble } from '../compiler/readers/markdown-utils.js';
import { normalizeFileContent } from '../compiler/readers/normalize.js';
import {
  OC_PARSED_FILES,
  WorkspaceError,
  type OcParsedFile,
  type SectionBase,
  type WorkspaceState,
} from '@bic/openclaw-workspace/path';

interface ReadOutcome {
  readonly name: OcParsedFile;
  readonly section: SectionBase | null;
}

/** Read a single workspace file; return null if the file does not exist. */
async function readOne(workspaceRoot: string, name: OcParsedFile): Promise<ReadOutcome> {
  const fullPath = join(workspaceRoot, name);
  try {
    const raw = await readFile(fullPath, 'utf-8');
    const normalized = normalizeFileContent(raw);
    const section: SectionBase = {
      raw,
      preamble: extractPreamble(normalized),
      sections: extractH2Sections(normalized),
    };
    return { name, section };
  } catch {
    return { name, section: null };
  }
}

/**
 * Parse an OC workspace directory into a typed WorkspaceState.
 *
 * Reads all markdown OC files in parallel. Missing optional files are
 * returned as `null` on the corresponding WorkspaceState field.
 * Missing SOUL.md throws {@link WorkspaceError}.
 *
 * Every section preserves the original file content byte-for-byte on the
 * `raw` field (BOM, CRLF, and trailing whitespace untouched). Parsed fields
 * (`preamble`, `sections`) operate on a normalized copy for consistency.
 *
 * @param workspaceRoot - Absolute path to the workspace directory
 * @returns WorkspaceState with typed sections and raw fidelity preserved
 * @throws {WorkspaceError} when SOUL.md is missing
 */
export async function parseWorkspace(workspaceRoot: string): Promise<WorkspaceState> {
  const outcomes = await Promise.all(
    OC_PARSED_FILES.map((name) => readOne(workspaceRoot, name)),
  );
  const byName = new Map<OcParsedFile, SectionBase | null>(
    outcomes.map((o) => [o.name, o.section]),
  );

  const soul = byName.get('SOUL.md') ?? null;
  if (soul === null) {
    throw new WorkspaceError(
      `SOUL.md not found in workspace: ${workspaceRoot}`,
      workspaceRoot,
    );
  }

  return {
    workspaceRoot,
    soul,
    memory: byName.get('MEMORY.md') ?? null,
    identity: byName.get('IDENTITY.md') ?? null,
    tools: byName.get('TOOLS.md') ?? null,
    agents: byName.get('AGENTS.md') ?? null,
    user: byName.get('USER.md') ?? null,
    heartbeat: byName.get('HEARTBEAT.md') ?? null,
  };
}
