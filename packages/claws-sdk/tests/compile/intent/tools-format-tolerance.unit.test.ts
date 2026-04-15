/**
 * L0: TOOLS.md format tolerance unit tests.
 *
 * Tests both table format (| Tool | Guidance |) and section format (## tool-name)
 * to verify CL-09 format diversity handling.
 *
 * 8 tests covering all table-format branches:
 * 1. Table format with backtick-wrapped tool names
 * 2. Table format with bare tool names (no backticks)
 * 3. Section format still works (regression guard)
 * 4. Table format with Risk: and OBO: annotations in guidance cells
 * 5. Table header without separator row falls back to section
 * 6. Table with empty tool name rows skipped
 * 7. Table terminated by non-table content
 * 8. Table with "Tool Name" / "Description" / "Notes" column headers
 */

import { describe, it, expect } from 'vitest';
import { extractToolsIntents } from '../../../src/compile/intent/tools-intent.js';
import type { FileEntryPresent } from '../../../src/compile/types.js';

function makeEntry(content: string): FileEntryPresent {
  return {
    status: 'present',
    source: 'TOOLS.md',
    content,
    provenance: {
      source: 'TOOLS.md',
      sourceType: 'filesystem',
      contentHash: 'test-hash',
      readAt: '2026-04-13T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('extractToolsIntents — table format', () => {
  it('parses backtick-wrapped tool names from markdown table', () => {
    const entry = makeEntry(
      '# Tool Guidance\n\n' +
      '## Tool Guidance\n\n' +
      '| Tool | Guidance |\n' +
      '| --- | --- |\n' +
      '| `Bash` | Run shell commands safely |\n' +
      '| `Read` | Read any file in workspace |\n' +
      '| `Write` | Write files in src/ only |\n',
    );
    const result = extractToolsIntents(entry);

    expect(result.intents).toHaveLength(3);
    expect(result.intents.map(i => i.name)).toEqual(['Bash', 'Read', 'Write']);

    const bash = result.intents.find(i => i.name === 'Bash')!;
    expect(bash.description).toContain('shell commands');
    expect(bash.capabilities).toContain('execute');
  });

  it('parses bare tool names (no backticks) from markdown table', () => {
    const entry = makeEntry(
      '| Tool | Guidance |\n' +
      '| --- | --- |\n' +
      '| FileReader | Read files from disk |\n' +
      '| APIClient | External API calls to third-party services |\n',
    );
    const result = extractToolsIntents(entry);

    expect(result.intents).toHaveLength(2);
    expect(result.intents[0]!.name).toBe('FileReader');
    expect(result.intents[0]!.riskClass).toBe(2); // file access -> R2
    expect(result.intents[1]!.name).toBe('APIClient');
    expect(result.intents[1]!.riskClass).toBe(3); // external API -> R3
  });

  it('extracts Risk: and OBO: annotations from guidance cells', () => {
    const entry = makeEntry(
      '| Tool | Guidance |\n' +
      '| --- | --- |\n' +
      '| `DatabaseQuery` | Production read access to analytics DB. Risk: R4 |\n' +
      '| `SendSlack` | Send messages on behalf of the user via Slack API. OBO: true |\n',
    );
    const result = extractToolsIntents(entry);

    const dbTool = result.intents.find(i => i.name === 'DatabaseQuery')!;
    expect(dbTool.riskClass).toBe(4);

    const slackTool = result.intents.find(i => i.name === 'SendSlack')!;
    expect(slackTool.oboFlag).toBe(true);
    expect(slackTool.riskClass).toBeGreaterThanOrEqual(3); // API -> R3+
  });

  it('section format still works as fallback (regression guard)', () => {
    const entry = makeEntry(
      '# Tool Guidance\n\n' +
      '## Bash\n\nRun shell commands.\nNever run destructive commands.\n\n' +
      '## Read\n\nRead any file in the workspace.\n',
    );
    const result = extractToolsIntents(entry);

    expect(result.intents).toHaveLength(2);
    expect(result.intents[0]!.name).toBe('Bash');
    expect(result.intents[1]!.name).toBe('Read');
    expect(result.intents[0]!.description).toContain('shell commands');
  });

  it('falls back to section format when table header has no separator row', () => {
    // Table header present but no separator row — should fall back to section format
    const entry = makeEntry(
      '| Tool | Guidance |\n' +
      '| `Bash` | Run commands |\n' +
      '\n## Actual\n\nA real tool.\n',
    );
    const result = extractToolsIntents(entry);

    // Falls back to section format, finding "Actual"
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.name).toBe('Actual');
  });

  it('skips rows with empty tool name cells', () => {
    const entry = makeEntry(
      '| Tool | Guidance |\n' +
      '| --- | --- |\n' +
      '| `Bash` | Run commands |\n' +
      '|  | Empty name row |\n' +
      '| `Read` | Read files |\n',
    );
    const result = extractToolsIntents(entry);

    expect(result.intents).toHaveLength(2);
    expect(result.intents.map(i => i.name)).toEqual(['Bash', 'Read']);
  });

  it('stops table parsing at non-table line', () => {
    const entry = makeEntry(
      '| Tool | Guidance |\n' +
      '| --- | --- |\n' +
      '| `Bash` | Run commands |\n' +
      'This is not a table row.\n' +
      '| `Read` | Should not be parsed |\n',
    );
    const result = extractToolsIntents(entry);

    // Only Bash should be parsed; Read comes after non-table line
    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.name).toBe('Bash');
  });

  it('recognizes alternative column headers: "Tool Name" and "Description"', () => {
    const entry = makeEntry(
      '| Tool Name | Description |\n' +
      '| --- | --- |\n' +
      '| `Grep` | Search file contents |\n' +
      '| `Glob` | Find files by pattern |\n',
    );
    const result = extractToolsIntents(entry);

    expect(result.intents).toHaveLength(2);
    expect(result.intents.map(i => i.name)).toEqual(['Grep', 'Glob']);
  });
});
