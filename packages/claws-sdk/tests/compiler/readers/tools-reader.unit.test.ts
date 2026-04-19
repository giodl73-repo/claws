/**
 * L0 unit tests for tools-reader.ts
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { toolsReader } from '#src/compiler/readers/tools-reader.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('toolsReader', () => {
  it('parses TOOLS.md with multiple tool declarations', async () => {
    const result = await toolsReader.read(resolve(FIXTURES, 'full-workspace'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.tools.length).toBe(3);
    expect(result.data.tools[0]!.name).toBe('Bash');
    expect(result.data.tools[0]!.description).toContain('read-only');
    expect(result.data.tools[1]!.name).toBe('Write');
    expect(result.data.tools[2]!.name).toBe('Read');
  });

  it('produces warning when TOOLS.md has no tool declarations', async () => {
    const result = await toolsReader.read(resolve(FIXTURES, 'reader-test-empty-content'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.tools).toHaveLength(0);
    const warning = result.diagnostics.find(d => d.code === 'TOOLS-NO-DECLARATIONS');
    expect(warning).toBeDefined();
    expect(warning!.severity).toBe('warning');
  });

  it('returns error when TOOLS.md does not exist', async () => {
    const result = await toolsReader.read('/nonexistent/path');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]!.severity).toBe('error');
    }
  });
});
