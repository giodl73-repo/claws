/**
 * skills/ directory reader — enumerates skill files, extracts metadata.
 *
 * Scans skills/ subdirectories for SKILL.md files and extracts
 * frontmatter (name, description, tools) from each.
 *
 * @module claws-sdk/compiler/readers/skills-reader
 */

import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { readWorkspaceFile, buildFailure } from './read-file.js';
import type {
  WorkspaceReader,
  WorkspaceReadResult,
  SkillsData,
  SkillMetadata,
  WorkspaceDiagnostic,
  WorkspaceFile,
} from './types.js';

const DIR_PATH = 'skills/';

/**
 * Parse simple YAML-like frontmatter from a SKILL.md file.
 *
 * Extracts `name`, `description`, and `tools` from `---` delimited
 * frontmatter. Falls back to directory name and first paragraph.
 */
function parseSkillFrontmatter(
  content: string,
  dirName: string,
  relativePath: string,
): SkillMetadata {
  let name = dirName;
  let description = '';
  let tools: string[] = [];

  // Check for frontmatter (content is already CRLF-normalized)
  if (content.startsWith('---\n')) {
    const endIdx = content.indexOf('\n---', 3);
    if (endIdx !== -1) {
      const frontmatter = content.slice(4, endIdx);
      for (const line of frontmatter.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('name:')) {
          name = trimmed.slice(5).trim();
        } else if (trimmed.startsWith('description:')) {
          description = trimmed.slice(12).trim();
        } else if (trimmed.startsWith('- ') && tools !== undefined) {
          tools.push(trimmed.slice(2).trim());
        } else if (trimmed.startsWith('tools:')) {
          // tools list follows on subsequent lines
          tools = [];
        }
      }
    }
  }

  // Fallback: extract description from first paragraph after frontmatter
  if (!description) {
    const bodyStart = content.indexOf('\n---\n');
    const body = bodyStart !== -1 ? content.slice(bodyStart + 5) : content;
    const lines = body.split('\n').filter(l => l.trim() && !l.startsWith('#'));
    if (lines.length > 0 && lines[0]) {
      description = lines[0].trim();
    }
  }

  return {
    name,
    description,
    tools,
    path: relativePath.replace(/\\/g, '/'),
  };
}

export const skillsReader: WorkspaceReader<SkillsData> = {
  filePath: DIR_PATH,
  required: false,

  async read(workspaceRoot: string): Promise<WorkspaceReadResult<SkillsData>> {
    const skillsDir = join(workspaceRoot, 'skills');
    const diagnostics: WorkspaceDiagnostic[] = [];

    // Check if skills/ directory exists
    try {
      const dirStat = await stat(skillsDir);
      if (!dirStat.isDirectory()) {
        return buildFailure(DIR_PATH, false, 'skills/ is not a directory');
      }
    } catch {
      return buildFailure(DIR_PATH, false, 'skills/ not found — no skills directory defined');
    }

    // Enumerate subdirectories
    const subdirs = await readdir(skillsDir);
    const skills: SkillMetadata[] = [];

    for (const subdir of subdirs.sort()) {
      const relativePath = `skills/${subdir}/SKILL.md`;
      const file = await readWorkspaceFile(workspaceRoot, relativePath);
      if (file) {
        skills.push(parseSkillFrontmatter(file.normalizedContent, subdir, relativePath));
      }
    }

    if (skills.length === 0) {
      diagnostics.push({
        severity: 'warning',
        message: 'skills/ directory exists but contains no SKILL.md files',
        file: DIR_PATH,
        code: 'SKILLS-EMPTY',
      });
    }

    // Build a synthetic WorkspaceFile for the directory
    const combinedContent = skills.map(s => `# ${s.name}\n${s.description}`).join('\n---\n');
    const syntheticFile: WorkspaceFile = {
      path: DIR_PATH,
      rawContent: combinedContent,
      normalizedContent: combinedContent,
    };

    return { ok: true, file: syntheticFile, data: { skills }, diagnostics };
  },
};
