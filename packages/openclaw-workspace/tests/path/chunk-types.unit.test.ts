import { describe, expect, it } from 'vitest';
import {
  CHUNK_TABS,
  OC_WORKSPACE_FILES,
  OC_PARSED_FILES,
  type ChunkTab,
  type ItemLock,
  type RiskClassification,
} from '../../src/path/index.js';

describe('chunk type contracts — invariants', () => {
  it('CHUNK_TABS has exactly 9 entries with no duplicates', () => {
    expect(CHUNK_TABS.length).toBe(9);
    expect(new Set(CHUNK_TABS).size).toBe(9);
  });

  it('ItemLock.source admits the 6 canonical values', () => {
    const sources: Array<ItemLock['source']> = ['r5', 'fleet', 'governance', 'violation', 'unclassified', 'none'];
    for (const source of sources) {
      const lock: ItemLock = { source };
      expect(lock.source).toBe(source);
    }
  });

  it('RiskClassification pairs level with capability exhaustively', () => {
    const pairs: RiskClassification[] = [
      { level: 1, capability: 'read' },
      { level: 2, capability: 'write' },
      { level: 3, capability: 'communicate' },
      { level: 4, capability: 'execute' },
      { level: 5, capability: 'transact' },
    ];
    for (const rc of pairs) expect(rc.level).toBeGreaterThanOrEqual(1);
  });

  it('OC_WORKSPACE_FILES has exactly 9 entries and OC_PARSED_FILES has 7', () => {
    expect(OC_WORKSPACE_FILES.length).toBe(9);
    expect(new Set(OC_WORKSPACE_FILES).size).toBe(9);
    expect(OC_PARSED_FILES.length).toBe(7);
    for (const f of OC_PARSED_FILES) expect(OC_WORKSPACE_FILES).toContain(f);
  });
});
