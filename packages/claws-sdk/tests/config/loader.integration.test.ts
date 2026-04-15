/**
 * L1: config load from OC reference workspace fixture returns expected values.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { loadConfig } from '../../src/config/loader.js';

const OC_WORKSPACE = resolve(__dirname, '../fixtures/oc-reference-workspace');

describe('loadConfig() — reference workspace integration', () => {
  it('loads config from OC reference workspace with expected field values', async () => {
    const result = await loadConfig(OC_WORKSPACE);

    expect(result.found).toBe(true);
    expect(result.config.trustTier).toBe(2);
    expect(result.config.suppressions).toEqual([]);
    expect(result.config.policySet).toBe('default');
    expect(result.config.auditLevel).toBe('full');
    expect(result.config.failMode.R1).toBe('open');
    expect(result.config.failMode.R5).toBe('closed');
  });
});
