/**
 * L0 parametrized unit test — per-reader cache scoping (CL-04 §IS.3, S02-F07).
 *
 * Each reader's key is scoped to its OWN input content hash; changing
 * another reader's input must not invalidate it. Parametrized over all 9
 * readers so the contract is verified uniformly.
 */

import { describe, it, expect } from 'vitest';
import {
  STAGE_CACHE_KEY_SCHEMA_VERSION,
  deriveReaderStageKey,
} from '#src/compiler/host/stage-cache-key.js';
import { READER_STAGES } from '#src/compiler/host/stage-deps.js';

describe('per-reader cache scoping (unit)', () => {
  for (const stage of READER_STAGES) {
    it(`reader "${stage}" key is scoped to its own content hash`, () => {
      const k1 = deriveReaderStageKey({
        stage,
        contentHash: 'my-content-A',
        compilerVersion: '0.1.0',
        keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION,
      });
      const k2Same = deriveReaderStageKey({
        stage,
        contentHash: 'my-content-A',
        compilerVersion: '0.1.0',
        keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION,
      });
      const k3Different = deriveReaderStageKey({
        stage,
        contentHash: 'my-content-B',
        compilerVersion: '0.1.0',
        keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION,
      });
      // Same content hash: identical key.
      expect(k1).toBe(k2Same);
      // Different content hash: different key (content-scoped invalidation).
      expect(k1).not.toBe(k3Different);
    });

    it(`reader "${stage}" key differs from every other reader at same content`, () => {
      const keyForThis = deriveReaderStageKey({
        stage,
        contentHash: 'shared',
        compilerVersion: '0.1.0',
        keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION,
      });
      for (const other of READER_STAGES) {
        if (other === stage) continue;
        const keyForOther = deriveReaderStageKey({
          stage: other,
          contentHash: 'shared',
          compilerVersion: '0.1.0',
          keySchemaVersion: STAGE_CACHE_KEY_SCHEMA_VERSION,
        });
        expect(keyForThis).not.toBe(keyForOther);
      }
    });
  }
});
