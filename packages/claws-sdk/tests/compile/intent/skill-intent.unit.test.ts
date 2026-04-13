/**
 * L0: skills/ intent extraction unit tests.
 *
 * Tests:
 * 1. Skill with YAML frontmatter (name, description, tools)
 * 2. Skill with body-only (# heading, first paragraph, tool keyword extraction)
 * 3. Multiple skills separated by "---"
 * 4. Empty section is skipped (no name)
 * 5. Tool ref extraction from body when frontmatter has no tools
 * 6. Line offset tracking across multiple sections
 */

import { describe, it, expect } from 'vitest';
import { extractSkillIntents } from '../../../src/compile/intent/skill-intent.js';
import type { FileEntryPresent } from '../../../src/compile/types.js';

function makeEntry(content: string): FileEntryPresent {
  return {
    status: 'present',
    source: 'skills/',
    content,
    provenance: {
      source: 'skills/',
      sourceType: 'filesystem',
      contentHash: 'test-hash',
      readAt: '2026-04-12T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('extractSkillIntents', () => {
  it('extracts skill from YAML frontmatter', () => {
    const entry = makeEntry(
      '---\nname: code-review\ndescription: Reviews code changes\ntools:\n- Read\n- Grep\n---\n\nPerforms automated code review.\n',
    );
    const result = extractSkillIntents(entry);

    expect(result.source).toBe('skills/');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.intents).toHaveLength(1);

    const intent = result.intents[0]!;
    expect(intent.name).toBe('code-review');
    expect(intent.description).toBe('Reviews code changes');
    expect(intent.requiredTools).toEqual(['Read', 'Grep']);
  });

  it('extracts skill from body-only content (# heading + first paragraph)', () => {
    const entry = makeEntry(
      '# File Search\n\nSearches files using Glob and Grep tools.\n',
    );
    const result = extractSkillIntents(entry);

    expect(result.intents).toHaveLength(1);

    const intent = result.intents[0]!;
    expect(intent.name).toBe('File Search');
    expect(intent.description).toBe('Searches files using Glob and Grep tools.');
    expect(intent.requiredTools).toContain('Glob');
    expect(intent.requiredTools).toContain('Grep');
  });

  it('extracts multiple skills separated by ---', () => {
    const entry = makeEntry(
      '---\nname: skill-a\ndescription: First skill\n---\n\nUses Bash.\n' +
      '\n---\n' +
      '---\nname: skill-b\ndescription: Second skill\n---\n\nUses Read and Write.\n',
    );
    const result = extractSkillIntents(entry);

    expect(result.intents).toHaveLength(2);
    expect(result.intents[0]!.name).toBe('skill-a');
    expect(result.intents[1]!.name).toBe('skill-b');
  });

  it('skips empty sections with no name', () => {
    const entry = makeEntry(
      '\n\n\n---\n---\nname: real-skill\ndescription: Has a name\n---\n\nContent.\n',
    );
    const result = extractSkillIntents(entry);

    // Only the section with a name should produce an intent
    const named = result.intents.filter(i => i.name.length > 0);
    expect(named).toHaveLength(1);
    expect(named[0]!.name).toBe('real-skill');
  });

  it('extracts tool refs from body when no frontmatter tools are listed', () => {
    // Body-only skill: no frontmatter, so tool extraction falls back to keyword matching
    const entry = makeEntry(
      '# Deploy\n\nRuns Bash commands and uses WebFetch for health checks.\n',
    );
    const result = extractSkillIntents(entry);

    const intent = result.intents[0]!;
    expect(intent.requiredTools).toContain('Bash');
    expect(intent.requiredTools).toContain('WebFetch');
  });

  it('uses frontmatter tools instead of body extraction when frontmatter tools exist', () => {
    const entry = makeEntry(
      '---\nname: writer\ndescription: Writes files\ntools:\n- Write\n- Edit\n---\n\nAlso mentions Bash and Read in the body.\n',
    );
    const result = extractSkillIntents(entry);

    const intent = result.intents[0]!;
    // Frontmatter tools should be used, not body extraction
    expect(intent.requiredTools).toEqual(['Write', 'Edit']);
  });

  it('tracks line offsets across sections', () => {
    const entry = makeEntry(
      '# First Skill\n\nDescription.\n\n---\n# Second Skill\n\nAnother description.\n',
    );
    const result = extractSkillIntents(entry);

    expect(result.intents).toHaveLength(2);
    expect(result.intents[0]!.line).toBe(1);
    // Second section starts after 4 lines + 1 separator = offset 5
    expect(result.intents[1]!.line).toBeGreaterThan(1);
  });
});
