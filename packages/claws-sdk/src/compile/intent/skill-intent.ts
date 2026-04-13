/**
 * skills/ directory intent extraction — capability extraction from SKILL.md files.
 *
 * Extracts skill name, description, and required tools from the concatenated
 * skills/ content (multiple SKILL.md files joined by "---" separators).
 *
 * PC1-S06-F01 / P-106: NL tool reference extraction with keyword matching.
 *
 * @module claws-sdk/compile/intent/skill-intent
 */

import type {
  FileEntryPresent,
  SkillIntent,
  IntentResult,
} from '../types.js';

/**
 * Known tool names for fuzzy matching in skill descriptions.
 */
const KNOWN_TOOLS = [
  'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
  'WebSearch', 'WebFetch', 'SendMessage', 'TaskCreate',
];

/**
 * Extract tool references from text using keyword matching.
 */
function extractToolRefs(text: string): string[] {
  const tools: string[] = [];
  for (const tool of KNOWN_TOOLS) {
    if (new RegExp(`\\b${tool}\\b`, 'i').test(text)) {
      tools.push(tool);
    }
  }
  return tools;
}

/**
 * Extract skill intents from a skills/ file entry.
 *
 * The skills/ entry contains concatenated SKILL.md files separated by "---".
 * Each SKILL.md may have YAML frontmatter with name, description, and tools.
 */
export function extractSkillIntents(entry: FileEntryPresent): IntentResult<SkillIntent> {
  const intents: SkillIntent[] = [];
  const sections = entry.content.split('\n---\n');

  let lineOffset = 0;

  for (const section of sections) {
    const lines = section.split('\n');
    let name = '';
    let description = '';
    let tools: string[] = [];
    let inFrontmatter = false;
    let frontmatterDone = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trim();

      // Frontmatter handling
      if (trimmed === '---' && !frontmatterDone) {
        if (inFrontmatter) {
          frontmatterDone = true;
        } else {
          inFrontmatter = true;
        }
        continue;
      }

      if (inFrontmatter && !frontmatterDone) {
        const nameMatch = /^name:\s*(\S[^\n]*)$/.exec(trimmed);
        if (nameMatch) {
          name = nameMatch[1]!.trim();
          continue;
        }

        const descMatch = /^description:\s*(\S[^\n]*)$/.exec(trimmed);
        if (descMatch) {
          description = descMatch[1]!.trim();
          continue;
        }

        const toolsMatch = /^tools:$/.exec(trimmed);
        if (toolsMatch) continue;

        const toolItem = /^-\s+(\S[^\n]*)$/.exec(trimmed);
        if (toolItem) {
          tools.push(toolItem[1]!.trim());
        }
        continue;
      }

      // Body content: extract tool refs and description
      if (trimmed.startsWith('# ') && !name) {
        name = trimmed.replace(/^#\s+/, '').trim();
        continue;
      }

      if (trimmed.length > 0 && !description) {
        description = trimmed;
      }
    }

    // If no tools found in frontmatter, extract from body text
    if (tools.length === 0) {
      tools = extractToolRefs(section);
    }

    if (name.length > 0) {
      intents.push({
        name,
        description,
        requiredTools: tools,
        line: lineOffset + 1,
      });
    }

    lineOffset += lines.length + 1; // +1 for the "---" separator
  }

  return {
    source: entry.source,
    intents,
    diagnostics: [],
  };
}
