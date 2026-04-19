/**
 * Shared markdown parsing utilities for workspace readers.
 *
 * Extracts H2 sections from markdown content. Used by SOUL, TOOLS,
 * AGENTS, MEMORY, IDENTITY, USER, and HEARTBEAT readers.
 *
 * @module claws-sdk/compiler/readers/markdown-utils
 */

import type { MarkdownSection } from './types.js';

/**
 * Extract H2-level sections from markdown content.
 *
 * Each section runs from its `## Heading` line to the next `## ` line
 * or end of content. The body is trimmed.
 *
 * @param content - Normalized markdown content
 * @returns Array of sections with heading, body, and line number
 */
export function extractH2Sections(content: string): MarkdownSection[] {
  const lines = content.split('\n');
  const sections: MarkdownSection[] = [];
  let currentHeading: string | null = null;
  let currentLine = 0;
  let bodyLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.startsWith('## ')) {
      // Flush previous section
      if (currentHeading !== null) {
        sections.push({
          heading: currentHeading,
          body: bodyLines.join('\n').trim(),
          line: currentLine,
        });
      }
      currentHeading = line.slice(3).trim();
      currentLine = i + 1; // 1-based
      bodyLines = [];
    } else if (currentHeading !== null) {
      bodyLines.push(line);
    }
  }

  // Flush last section
  if (currentHeading !== null) {
    sections.push({
      heading: currentHeading,
      body: bodyLines.join('\n').trim(),
      line: currentLine,
    });
  }

  return sections;
}

/**
 * Extract the top-level content before the first H2 section.
 *
 * Strips the H1 heading line if present.
 *
 * @param content - Normalized markdown content
 * @returns Trimmed top-level text
 */
export function extractPreamble(content: string): string {
  const lines = content.split('\n');
  const preambleLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) break;
    // Skip H1 heading
    if (line.startsWith('# ') && preambleLines.length === 0) continue;
    preambleLines.push(line);
  }

  return preambleLines.join('\n').trim();
}

/**
 * Extract list items (lines starting with `- `) from a section body.
 *
 * @param body - Section body text
 * @returns Array of list item strings (without the `- ` prefix)
 */
export function extractListItems(body: string): string[] {
  return body
    .split('\n')
    .filter(line => line.trimStart().startsWith('- '))
    .map(line => line.trimStart().slice(2).trim());
}

/**
 * Find the value of a key in a section that uses `- Key: Value` format.
 *
 * @param body - Section body text
 * @param key - Key to search for (case-insensitive)
 * @returns The value string, or undefined if not found
 */
export function findListValue(body: string, key: string): string | undefined {
  const lowerKey = key.toLowerCase();
  for (const line of body.split('\n')) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith('- ')) {
      const rest = trimmed.slice(2);
      const colonIdx = rest.indexOf(':');
      if (colonIdx !== -1) {
        const k = rest.slice(0, colonIdx).trim().toLowerCase();
        if (k === lowerKey) {
          return rest.slice(colonIdx + 1).trim();
        }
      }
    }
  }
  return undefined;
}
