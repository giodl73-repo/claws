/**
 * L0: Error contract formatting — WHAT + HOW + WHERE.
 */

import { describe, it, expect } from 'vitest';
import {
  formatError,
  formatErrorJson,
  noWorkspaceError,
  compileFailedError,
  noSourceFilesError,
} from '../../src/output/errors.js';
import type { ClawsError } from '../../src/output/errors.js';

describe('error contract', () => {
  describe('formatError', () => {
    it('produces WHAT + HOW + WHERE sections', () => {
      const err: ClawsError = {
        code: 'CLAWS-E999',
        what: 'Something broke',
        howToFix: 'Run this command',
        docsRef: 'https://example.com/docs',
      };
      const output = formatError(err);
      expect(output).toContain('CLAWS-E999');
      expect(output).toContain('Something broke');
      expect(output).toContain('Fix: Run this command');
      expect(output).toContain('Docs: https://example.com/docs');
    });

    it('formats multi-line output', () => {
      const err = noWorkspaceError();
      const output = formatError(err);
      const lines = output.split('\n');
      expect(lines.length).toBe(3);
      expect(lines[0]).toContain('Error CLAWS-E010');
      expect(lines[1]).toContain('Fix:');
      expect(lines[2]).toContain('Docs:');
    });
  });

  describe('formatErrorJson', () => {
    it('produces valid JSON with error object', () => {
      const err = compileFailedError('parse error');
      const json = formatErrorJson(err);
      const parsed = JSON.parse(json);
      expect(parsed.error).toBeDefined();
      expect(parsed.error.code).toBe('CLAWS-E020');
      expect(parsed.error.what).toContain('parse error');
      expect(parsed.error.howToFix).toBeDefined();
      expect(parsed.error.docsRef).toBeDefined();
    });
  });

  describe('common errors', () => {
    it('noWorkspaceError has correct code and fix', () => {
      const err = noWorkspaceError();
      expect(err.code).toBe('CLAWS-E010');
      expect(err.howToFix).toContain('claws init');
    });

    it('noSourceFilesError suggests claws init --template', () => {
      const err = noSourceFilesError();
      expect(err.code).toBe('CLAWS-E021');
      expect(err.howToFix).toContain('claws init --template soc2');
    });
  });
});
