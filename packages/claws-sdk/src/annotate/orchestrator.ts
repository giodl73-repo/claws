/**
 * Annotate orchestrator — directory scanning, skill parsing, and
 * annotation injection for `claws annotate`.
 *
 * This is the SDK entry point. The CLI adapter calls
 * `annotateDirectory()` and renders the result — no domain logic
 * in the CLI layer.
 *
 * @module claws-sdk/annotate/orchestrator
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { analyzeHeuristics } from './heuristics.js';
import { toFrontmatterAnnotations } from './heuristics.js';
import type { HeuristicAnnotation, AnnotateResult } from './heuristics.js';

/**
 * Options controlling annotate orchestration.
 */
export interface AnnotateDirectoryOptions {
  /** If true, do not write any files — only compute annotations. */
  readonly dryRun: boolean;
}

/**
 * Parse name, description, and tools from SKILL.md frontmatter.
 */
export function parseSkillFrontmatter(content: string): {
  name: string | undefined;
  description: string | undefined;
  tools: string[] | undefined;
} {
  // Parse YAML frontmatter without regex to avoid ReDoS (CodeQL).
  // Normalize CRLF to LF for cross-platform compatibility (Windows writes CRLF).
  const normalized = content.replace(/\r\n/g, '\n');
  const fmStart = normalized.indexOf('---\n');
  if (fmStart !== 0) return { name: undefined, description: undefined, tools: undefined };
  const fmEnd = normalized.indexOf('\n---', 4);
  if (fmEnd === -1) return { name: undefined, description: undefined, tools: undefined };

  const fmLines = normalized.slice(4, fmEnd).split('\n');

  let name: string | undefined;
  let description: string | undefined;
  let tools: string[] | undefined;

  for (let i = 0; i < fmLines.length; i++) {
    const line = fmLines[i]!;
    if (line.startsWith('name:')) {
      name = line.slice(5).trim() || undefined;
    } else if (line.startsWith('description:')) {
      description = line.slice(12).trim() || undefined;
    } else if (line.startsWith('tools:')) {
      // Collect indented list items following the tools: key
      const items: string[] = [];
      for (let j = i + 1; j < fmLines.length; j++) {
        const item = fmLines[j]!;
        if (item.startsWith(' ') || item.startsWith('\t')) {
          const trimmed = item.replace(/^[\s-]+/, '').trim();
          if (trimmed) items.push(trimmed);
        } else {
          break;
        }
      }
      if (items.length > 0) tools = items;
    }
  }

  return { name, description, tools };
}

/**
 * Inject heuristic annotations into SKILL.md frontmatter.
 *
 * Adds `heuristic-risk`, `heuristic-obo`, etc. fields to existing frontmatter.
 * Does NOT modify original content outside frontmatter.
 */
export function injectAnnotations(content: string, annotation: HeuristicAnnotation): string {
  const fmMatch = content.match(/^(---\n)([^]*?)(\n---)/);
  if (!fmMatch?.[1] || !fmMatch[2] || !fmMatch[3]) return content;

  const before = fmMatch[1];
  let fm: string = fmMatch[2];
  const after = fmMatch[3];
  const rest = content.slice(fmMatch[0].length);

  const annotations = toFrontmatterAnnotations(annotation);

  // Remove existing heuristic fields
  fm = fm.replace(/^heuristic-[a-z-]+:[^\n]*\n?/gm, '');
  fm = fm.replace(/^  - .*\n?/gm, (line) => {
    // Keep non-heuristic list items
    return line;
  });

  // Append heuristic fields
  let heuristicBlock = '';
  for (const [key, value] of Object.entries(annotations)) {
    if (Array.isArray(value)) {
      heuristicBlock += `heuristic-${key}:\n`;
      for (const item of value) {
        heuristicBlock += `  - ${item}\n`;
      }
    } else {
      heuristicBlock += `heuristic-${key}: ${String(value)}\n`;
    }
  }

  return `${before}${fm.trimEnd()}\n${heuristicBlock}${after}${rest}`;
}

/**
 * Scan a skill directory, run heuristic analysis on each SKILL.md,
 * and optionally inject annotations into frontmatter.
 *
 * @param skillDir - Directory containing skill subdirectories
 * @param opts - Orchestration options
 * @returns AnnotateResult with annotations and modified files
 * @throws Error if the directory cannot be read (error message includes path)
 */
export async function annotateDirectory(
  skillDir: string,
  opts: AnnotateDirectoryOptions,
): Promise<AnnotateResult> {
  const entries = await readdir(skillDir);

  const annotations: HeuristicAnnotation[] = [];
  const modifiedFiles: string[] = [];

  for (const entry of entries) {
    const skillMdPath = join(skillDir, entry, 'SKILL.md');
    let content: string;
    try {
      content = await readFile(skillMdPath, 'utf-8');
    } catch {
      // Not a skill directory — skip
      continue;
    }

    // Extract name and description from frontmatter
    const { name, description } = parseSkillFrontmatter(content);
    const skillName = name ?? entry;
    const desc = description ?? '';

    // Analyze the skill content
    const annotation = analyzeHeuristics(skillName, desc, content);
    annotations.push(annotation);

    // Write annotations if not dry-run
    if (!opts.dryRun) {
      const updated = injectAnnotations(content, annotation);
      if (updated !== content) {
        await writeFile(skillMdPath, updated, 'utf-8');
        modifiedFiles.push(skillMdPath);
      }
    }
  }

  return {
    annotations,
    dryRun: opts.dryRun,
    modifiedFiles,
  };
}
