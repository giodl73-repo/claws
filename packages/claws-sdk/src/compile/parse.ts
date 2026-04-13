/**
 * Parse phase — first stage of the claws compiler pipeline.
 *
 * Reads 9 OC workspace files through InputResolver, dispatches to
 * compiler-sdk readers, collects results with CGR provenance.
 *
 * P-060: Collect-all-errors — parse ALL files before halting.
 * P-108: Per-file parser isolation — failure in one file does not
 * corrupt parser state for other files.
 * CP-S03-F06: Per-file absence warnings with specific defaults.
 *
 * @module claws-sdk/compile/parse
 */

import { resolveDefaultSources, normalizeContent } from './input-resolver.js';
import type {
  ParseResult,
  ParseDiagnostic,
  FileEntry,
  ClawsConfig,
} from './types.js';

/**
 * Validate file content and produce diagnostics for malformed files.
 *
 * Per-file parser isolation (P-108): each file is validated independently.
 * Failures in one file do not affect others.
 */
function validateFileContent(
  entry: FileEntry,
): ParseDiagnostic[] {
  if (entry.status === 'absent') {
    return [];
  }

  const diagnostics: ParseDiagnostic[] = [];
  const { source, content } = entry;

  // Markdown files: check for basic structural issues
  if (source.endsWith('.md')) {
    // Check for content that is just whitespace
    if (content.trim().length === 0) {
      diagnostics.push({
        severity: 'warning',
        message: `${source} is empty or contains only whitespace`,
        file: source,
        line: 1,
        column: 1,
        code: 'CLAWS-P001',
      });
    }

    // Check for missing heading (SOUL.md, TOOLS.md, etc. should start with #)
    // W-5: Skip this check for files with YAML frontmatter (starts with ---)
    const hasFrontmatter = content.startsWith('---\n') || content.startsWith('---\r\n');
    let firstContentLine: string | undefined;
    if (hasFrontmatter) {
      // Find first non-empty line after closing frontmatter fence
      const closingIdx = content.indexOf('\n---', 4);
      if (closingIdx !== -1) {
        const afterFrontmatter = content.slice(closingIdx + 4);
        firstContentLine = afterFrontmatter.split('\n').find(line => line.trim().length > 0);
      }
    } else {
      firstContentLine = content.split('\n').find(line => line.trim().length > 0);
    }
    if (firstContentLine !== undefined && !firstContentLine.startsWith('#')) {
      diagnostics.push({
        severity: 'warning',
        message: `${source} does not start with a markdown heading`,
        file: source,
        line: 1,
        column: 1,
        code: 'CLAWS-P002',
      });
    }

    // Check for malformed frontmatter (opened but not closed)
    if (content.startsWith('---\n') || content.startsWith('---\r\n')) {
      const secondFence = content.indexOf('\n---', 4);
      if (secondFence === -1) {
        diagnostics.push({
          severity: 'error',
          message: `${source} has unclosed frontmatter (opening --- without closing ---)`,
          file: source,
          line: 1,
          column: 1,
          code: 'CLAWS-P003',
        });
      }
    }
  }

  // YAML files: check for basic syntax issues
  if (source.endsWith('.yaml') || source.endsWith('.yml')) {
    if (content.trim().length === 0) {
      diagnostics.push({
        severity: 'warning',
        message: `${source} is empty or contains only whitespace`,
        file: source,
        line: 1,
        column: 1,
        code: 'CLAWS-P001',
      });
    }

    // Check for tab indentation (YAML should use spaces)
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.startsWith('\t')) {
        diagnostics.push({
          severity: 'error',
          message: `${source} uses tab indentation at line ${i + 1} (YAML requires spaces)`,
          file: source,
          line: i + 1,
          column: 1,
          code: 'CLAWS-P004',
        });
        break; // Report only the first tab issue
      }
    }
  }

  return diagnostics;
}

/**
 * Parse an OC workspace — read all 9 default files through InputResolver.
 *
 * This is the entry point for the parse phase of the claws compiler.
 * It resolves all file sources, validates content, and returns a
 * complete ParseResult with CGR provenance.
 *
 * @param workspaceRoot - Absolute path to the workspace root directory
 * @param _config - Optional claws configuration (for future input sources)
 * @returns ParseResult with all file entries and diagnostics
 */
export async function parse(
  workspaceRoot: string,
  _config?: ClawsConfig,
): Promise<ParseResult> {
  // P-060: Resolve ALL files before checking for errors
  const entries = await resolveDefaultSources(workspaceRoot);

  // P-108: Per-file parser isolation — validate each file independently
  const diagnostics: ParseDiagnostic[] = [];
  for (const entry of entries) {
    const fileDiags = validateFileContent(entry);
    diagnostics.push(...fileDiags);
  }

  const presentCount = entries.filter(e => e.status === 'present').length;
  const absentCount = entries.filter(e => e.status === 'absent').length;

  // CP-S09-F03: Phase-gating — halt if ALL files are absent
  const shouldHalt = presentCount === 0;

  return {
    entries,
    diagnostics,
    presentCount,
    absentCount,
    shouldHalt,
  };
}
