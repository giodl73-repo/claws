/**
 * L0 unit tests for lobster-reader.ts — lobster.yaml parsing.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { lobsterReader } from '#src/compiler/readers/lobster-reader.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('lobsterReader', () => {
  it('parses a valid lobster.yaml with steps and dependencies', async () => {
    const result = await lobsterReader.read(resolve(FIXTURES, 'full-workspace'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.name).toBe('security-check');
    expect(result.data.description).toBe('Run security validation pipeline');
    expect(result.data.steps).toHaveLength(3);
    expect(result.data.steps[0]).toEqual({ name: 'scan', command: 'npm audit' });
    expect(result.data.steps[1]).toEqual({ name: 'lint', command: 'npm run lint' });
    expect(result.data.steps[2]).toEqual({ name: 'test', command: 'npm test' });
  });

  it('parses lobster.yaml with dependencies', async () => {
    const result = await lobsterReader.read(resolve(FIXTURES, 'conflict-workspace'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.name).toBe('deploy-check');
    expect(result.data.dependencies).toBeDefined();
    expect(result.data.dependencies['validate']).toEqual(['scan']);
    expect(result.data.dependencies['deploy']).toEqual(['validate']);
  });

  it('parses lobster.yaml with no steps or dependencies', async () => {
    const result = await lobsterReader.read(resolve(FIXTURES, 'reader-test-empty-content'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.name).toBe('minimal-workflow');
    expect(result.data.steps).toHaveLength(0);
  });

  it('produces error when lobster.yaml is missing required "name" field', async () => {
    const result = await lobsterReader.read(resolve(FIXTURES, 'reader-test-bad-lobster'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const errorDiag = result.diagnostics.find(d => d.code === 'LOBSTER-MISSING-NAME');
      expect(errorDiag).toBeDefined();
      expect(errorDiag!.severity).toBe('error');
    }
  });

  it('returns warning for missing optional lobster.yaml', async () => {
    const result = await lobsterReader.read('/nonexistent/path');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.diagnostics[0]!.severity).toBe('warning');
    }
  });
});
