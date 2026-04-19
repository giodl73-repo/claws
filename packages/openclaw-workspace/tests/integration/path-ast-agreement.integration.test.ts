import { describe, expect, it } from 'vitest';
import { classify } from '../../src/ast/index.js';
import { OC_WORKSPACE_FILES } from '../../src/path/index.js';

describe('path <-> ast classifier agreement', () => {
  it('every OC_WORKSPACE_FILES entry has a classifier kind (except directories)', () => {
    for (const file of OC_WORKSPACE_FILES) {
      if (file.endsWith('/')) continue;
      const kind = classify(file);
      expect(kind, `classify(${file}) should not be null`).not.toBe(null);
    }
  });
});
