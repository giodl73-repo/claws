/**
 * InputResolver — resolves OC workspace file sources and records CGR provenance.
 *
 * Handles 3 source types:
 * - 'filesystem': reads files from workspace root (default for 9 OC files)
 * - 'package': npm package source (deferred — returns absent)
 * - 'url': URL source from claws.json inputs (deferred — returns absent)
 *
 * P-100, PF1-S01-F01: BOM stripping on ALL files before parsing.
 * PF1-S02-F01: CRLF→LF normalization after BOM strip.
 * CP-S02-F01: skills/ directory enumeration.
 *
 * @module claws-sdk/compile/input-resolver
 */

import { readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { normalizePath } from '../util/path.js';
import { stripBOM, normalizeLF } from '../util/text.js';
import type {
  FileEntry,
  FileEntryPresent,
  FileEntryAbsent,
  CGRProvenance,
  DefaultFileSource,
  SourceType,
} from './types.js';
import { DEFAULT_FILE_SOURCES, ABSENT_DEFAULTS } from './types.js';

/**
 * Normalize file content: BOM strip first, then CRLF→LF.
 */
export function normalizeContent(raw: string): string {
  return normalizeLF(stripBOM(raw));
}

/**
 * Compute SHA-256 hash of normalized content.
 */
function hashContent(normalized: string): string {
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Build a CGR provenance record for a file.
 */
function buildProvenance(
  source: string,
  sourceType: SourceType,
  normalized: string,
  rawSize: number,
): CGRProvenance {
  return {
    source: normalizePath(source),
    sourceType,
    contentHash: hashContent(normalized),
    readAt: new Date().toISOString(),
    rawSize,
  };
}

/**
 * Read a single file from the filesystem, returning a present or absent entry.
 */
async function readSingleFile(
  workspaceRoot: string,
  relativePath: string,
  defaultDescription: string,
): Promise<FileEntry> {
  const fullPath = join(workspaceRoot, relativePath);
  try {
    const raw = await readFile(fullPath, 'utf-8');
    const normalized = normalizeContent(raw);
    const provenance = buildProvenance(relativePath, 'filesystem', normalized, Buffer.byteLength(raw, 'utf-8'));
    return {
      status: 'present',
      source: normalizePath(relativePath),
      content: normalized,
      provenance,
    } satisfies FileEntryPresent;
  } catch {
    return {
      status: 'absent',
      source: normalizePath(relativePath),
      defaultDescription,
    } satisfies FileEntryAbsent;
  }
}

/**
 * Enumerate skills/ directory — find all SKILL.md files in subdirectories.
 *
 * CP-S02-F01: enumerate all SKILL.md files in subdirectories.
 * Returns a single present entry with concatenated skill content,
 * or an absent entry if skills/ does not exist.
 */
async function readSkillsDirectory(
  workspaceRoot: string,
): Promise<FileEntry> {
  const skillsDir = join(workspaceRoot, 'skills');
  try {
    const dirStat = await stat(skillsDir);
    if (!dirStat.isDirectory()) {
      return {
        status: 'absent',
        source: 'skills/',
        defaultDescription: ABSENT_DEFAULTS['skills/'],
      };
    }

    const subdirs = await readdir(skillsDir);
    const skillContents: string[] = [];
    let totalRawSize = 0;

    for (const subdir of subdirs.sort()) {
      const skillPath = join(skillsDir, subdir, 'SKILL.md');
      try {
        const raw = await readFile(skillPath, 'utf-8');
        const normalized = normalizeContent(raw);
        skillContents.push(normalized);
        totalRawSize += Buffer.byteLength(raw, 'utf-8');
      } catch {
        // Subdirectory without SKILL.md — skip silently
      }
    }

    if (skillContents.length === 0) {
      return {
        status: 'absent',
        source: 'skills/',
        defaultDescription: ABSENT_DEFAULTS['skills/'],
      };
    }

    const combined = skillContents.join('\n---\n');
    const provenance = buildProvenance('skills/', 'filesystem', combined, totalRawSize);
    return {
      status: 'present',
      source: 'skills/',
      content: combined,
      provenance,
    };
  } catch {
    return {
      status: 'absent',
      source: 'skills/',
      defaultDescription: ABSENT_DEFAULTS['skills/'],
    };
  }
}

/**
 * Resolve all 9 default OC workspace file sources.
 *
 * Each file is read independently (P-108: per-file isolation).
 * Missing files produce absent entries, not errors (CP-S03-F06).
 * All files are read before returning (P-060: collect-all-errors).
 *
 * @param workspaceRoot - Absolute path to the workspace root
 * @returns Array of FileEntry (one per default source)
 */
export async function resolveDefaultSources(
  workspaceRoot: string,
): Promise<FileEntry[]> {
  // All 9 file reads are independent — resolve in parallel (CM-3).
  const promises = DEFAULT_FILE_SOURCES.map(source =>
    source === 'skills/'
      ? readSkillsDirectory(workspaceRoot)
      : readSingleFile(
          workspaceRoot,
          source,
          ABSENT_DEFAULTS[source as DefaultFileSource],
        ),
  );

  return Promise.all(promises);
}
