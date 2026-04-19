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
  alreadyInitializedError,
  initDetectFailedError,
  initWriteFailedError,
  templateNotFoundError,
  llmApiKeyMissingError,
  llmSdkMissingError,
} from '../../src/output/errors.js';
import type { ClawsError } from '../../src/output/errors.js';

describe('error contract', () => {
  describe('formatError', () => {
    it('produces WHAT + HOW + WHERE sections', () => {
      const err: ClawsError = {
        code: 'OC-POLICY-E999',
        what: 'Something broke',
        howToFix: 'Run this command',
        docsRef: 'https://example.com/docs',
      };
      const output = formatError(err);
      expect(output).toContain('OC-POLICY-E999');
      expect(output).toContain('Something broke');
      expect(output).toContain('Fix: Run this command');
      expect(output).toContain('Docs: https://example.com/docs');
    });

    it('formats multi-line output', () => {
      const err = noWorkspaceError();
      const output = formatError(err);
      const lines = output.split('\n');
      expect(lines.length).toBe(3);
      expect(lines[0]).toContain('Error OC-POLICY-E010');
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
      expect(parsed.error.code).toBe('OC-POLICY-E020');
      expect(parsed.error.what).toContain('parse error');
      expect(parsed.error.howToFix).toBeDefined();
      expect(parsed.error.docsRef).toBeDefined();
    });
  });

  describe('common errors', () => {
    it('noWorkspaceError has correct code and fix', () => {
      const err = noWorkspaceError();
      expect(err.code).toBe('OC-POLICY-E010');
      expect(err.howToFix).toContain('claws init');
    });

    it('noSourceFilesError suggests claws init --template', () => {
      const err = noSourceFilesError();
      expect(err.code).toBe('OC-POLICY-E021');
      expect(err.howToFix).toContain('claws init --template soc2');
    });

    it('initDetectFailedError includes reason and fallback guidance', () => {
      const err = initDetectFailedError('permission denied on .cursorrules');
      expect(err.code).toBe('OC-POLICY-E083');
      expect(err.what).toContain('permission denied on .cursorrules');
      expect(err.howToFix).toContain('claws init');
    });

    it('templateNotFoundError lists available templates', () => {
      const err = templateNotFoundError('nonexistent', ['soc2', 'hipaa', 'minimal']);
      expect(err.code).toBe('OC-POLICY-E082');
      expect(err.what).toContain('"nonexistent"');
      expect(err.howToFix).toContain('soc2, hipaa, minimal');
    });

    it('alreadyInitializedError includes config path', () => {
      const err = alreadyInitializedError('/project/claws.json');
      expect(err.code).toBe('OC-POLICY-E080');
      expect(err.what).toContain('/project/claws.json');
      expect(err.howToFix).toContain('/project/claws.json');
    });

    it('initWriteFailedError includes reason', () => {
      const err = initWriteFailedError('disk full');
      expect(err.code).toBe('OC-POLICY-E081');
      expect(err.what).toContain('disk full');
      expect(err.howToFix).toContain('write permissions');
    });

    it('llmApiKeyMissingError has correct code and fix', () => {
      const err = llmApiKeyMissingError();
      expect(err.code).toBe('OC-POLICY-E040');
      expect(err.what).toContain('ANTHROPIC_API_KEY');
      expect(err.howToFix).toContain('ANTHROPIC_API_KEY');
      expect(err.docsRef).toContain('llm-extraction');
    });

    it('llmApiKeyMissingError accepts custom provider params', () => {
      const err = llmApiKeyMissingError('OpenAI', 'OPENAI_API_KEY');
      expect(err.code).toBe('OC-POLICY-E040');
      expect(err.what).toContain('OPENAI_API_KEY');
      expect(err.howToFix).toContain('OPENAI_API_KEY');
    });

    it('llmSdkMissingError has correct code and fix', () => {
      const err = llmSdkMissingError();
      expect(err.code).toBe('OC-POLICY-E041');
      expect(err.what).toContain('@anthropic-ai/sdk');
      expect(err.howToFix).toContain('npm install @anthropic-ai/sdk');
      expect(err.docsRef).toContain('llm-extraction');
    });

    it('llmSdkMissingError accepts custom SDK package', () => {
      const err = llmSdkMissingError('openai');
      expect(err.code).toBe('OC-POLICY-E041');
      expect(err.what).toContain('openai');
      expect(err.howToFix).toContain('npm install openai');
    });
  });
});
