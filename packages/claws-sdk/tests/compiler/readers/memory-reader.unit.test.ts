/**
 * L0 unit tests for memory-reader.ts
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { memoryReader } from '#src/compiler/readers/memory-reader.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('memoryReader', () => {
  it('parses MEMORY.md with memory entries', async () => {
    const result = await memoryReader.read(resolve(FIXTURES, 'full-workspace'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.entries.length).toBe(2);
    expect(result.data.entries[0]!.title).toContain('Security Incident');
    expect(result.data.entries[0]!.body).toContain('misconfigured');
    expect(result.data.entries[1]!.title).toContain('Policy Update');
  });

  it('returns warning for missing optional MEMORY.md', async () => {
    const result = await memoryReader.read('/nonexistent/path');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]!.severity).toBe('warning');
    }
  });
});
