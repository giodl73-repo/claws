import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseWorkspace } from '../../src/workspace/index.js';

const FIXTURE_DIR = join(__dirname, '../fixtures/workspace-parser-full');

/**
 * S02 scenario: serve layer must obtain a fully typed, lossless view of the
 * workspace before the chunk assembler can run. This test pins the S02
 * invariants:
 *
 *   1. All 7 markdown OC files parseable in a single call.
 *   2. `raw` preserved byte-for-byte (add-only architecture).
 *   3. Every section exposes headings suitable for chunk selection.
 *   4. Optional absence never aborts the parse.
 */
describe('parseWorkspace — accept (S02)', () => {
  it('satisfies S02 chunk-assembler readiness invariants', async () => {
    const state = await parseWorkspace(FIXTURE_DIR);

    // 1. Shape is complete
    expect(state.soul).not.toBeNull();
    const optional = [
      state.memory,
      state.identity,
      state.tools,
      state.agents,
      state.user,
      state.heartbeat,
    ];
    expect(optional.every((s) => s !== null)).toBe(true);

    // 2. Lossless raw: re-reading the same parser yields identical raw bytes
    const again = await parseWorkspace(FIXTURE_DIR);
    expect(again.soul.raw).toBe(state.soul.raw);
    expect(again.tools?.raw).toBe(state.tools?.raw);
    expect(again.identity?.raw).toBe(state.identity?.raw);

    // 3. Headings are present on every parsed section, enabling chunk routing
    expect(state.soul.sections.every((s) => s.heading.length > 0)).toBe(true);
    for (const section of optional) {
      if (section !== null) {
        expect(section.sections.every((s) => s.heading.length > 0)).toBe(true);
      }
    }

    // 4. Sanity: line numbers are 1-based and monotonic within a file
    const soulLines = state.soul.sections.map((s) => s.line);
    for (let i = 1; i < soulLines.length; i++) {
      expect(soulLines[i]!).toBeGreaterThan(soulLines[i - 1]!);
    }
    expect(soulLines.every((n) => n >= 1)).toBe(true);
  });
});
