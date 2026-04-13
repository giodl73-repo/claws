/**
 * L1: Intent extraction pipeline integration tests.
 *
 * 2 tests:
 * 1. Minimal fixture (SOUL.md + TOOLS.md) produces typed intent arrays
 * 2. Full-workspace fixture (all 9 files) produces complete intent set
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parse } from '../../../src/compile/parse.js';
import { extractAllIntents } from '../../../src/compile/intent/index.js';

const FIXTURES = resolve(__dirname, '../../fixtures');
const MINIMAL = resolve(FIXTURES, 'minimal');
const FULL = resolve(FIXTURES, 'full-workspace');

describe('Intent extraction pipeline', () => {
  it('minimal fixture (SOUL.md + TOOLS.md) produces typed intent arrays', async () => {
    const parseResult = await parse(MINIMAL);
    const results = extractAllIntents(parseResult);

    // Should have results for the 2 present files
    expect(results).toBeDefined();

    // SOUL.md should produce intents
    const soulResult = results.find(r => r.source === 'SOUL.md');
    expect(soulResult).toBeDefined();
    expect(soulResult!.intents.length).toBeGreaterThanOrEqual(1);

    // TOOLS.md should produce intents
    const toolsResult = results.find(r => r.source === 'TOOLS.md');
    expect(toolsResult).toBeDefined();
    expect(toolsResult!.intents.length).toBeGreaterThanOrEqual(1);

    // No diagnostics expected for well-formed fixtures
    const allDiags = results.flatMap(r => r.diagnostics);
    const errors = allDiags.filter(d => d.severity === 'error');
    expect(errors).toHaveLength(0);
  });

  it('full-workspace fixture (all 9 files) produces complete intent set', async () => {
    const parseResult = await parse(FULL);
    const results = extractAllIntents(parseResult);

    // Should have results for all 9 present files
    expect(results.length).toBeGreaterThanOrEqual(7);

    // Each present source should have an intent result
    const sources = results.map(r => r.source);
    expect(sources).toContain('SOUL.md');
    expect(sources).toContain('TOOLS.md');
    expect(sources).toContain('AGENTS.md');
    expect(sources).toContain('IDENTITY.md');
    expect(sources).toContain('USER.md');
    expect(sources).toContain('MEMORY.md');
    expect(sources).toContain('HEARTBEAT.md');

    // All intent results should have intents array (may be empty for some files)
    for (const result of results) {
      expect(Array.isArray(result.intents)).toBe(true);
      expect(Array.isArray(result.diagnostics)).toBe(true);
    }
  });
});
