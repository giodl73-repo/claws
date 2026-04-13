/**
 * Annotation schema unit tests — SKILL.md governance frontmatter validation.
 *
 * Tests:
 * - Accepts valid governance frontmatter with risk_level, obo, data_labels
 * - Rejects invalid frontmatter with all errors collected (not fail-fast) + nearest-value suggestions
 * - Handles YAML None/null disambiguation: string "None" parsed as "none", not null
 * - Cross-field validation (R1 + transact OBO contradiction)
 * - Semantic error context (R6 explains scale)
 */

import { describe, it, expect } from 'vitest';
import { GovernanceAnnotationSchema, parseAnnotation } from '../../src/schema/annotation.js';
import type { AnnotationError, GovernanceFrontmatter } from '../../src/schema/types.js';

describe('GovernanceAnnotationSchema', () => {
  describe('valid frontmatter', () => {
    it('accepts minimal valid frontmatter with risk_level only', () => {
      const result = parseAnnotation({ risk_level: 'R3' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.risk_level).toBe('R3');
      }
    });

    it('accepts full valid frontmatter with risk_level, obo, and data_labels', () => {
      const result = parseAnnotation({
        risk_level: 'R3',
        obo: 'email',
        data_labels: ['pii', 'financial'],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.risk_level).toBe('R3');
        expect(result.data.obo).toBe('email');
        expect(result.data.data_labels).toEqual(['pii', 'financial']);
      }
    });

    it('accepts all valid risk levels R1 through R5', () => {
      for (const level of ['R1', 'R2', 'R3', 'R4', 'R5']) {
        const result = parseAnnotation({ risk_level: level });
        expect(result.success, `Expected ${level} to be valid`).toBe(true);
      }
    });

    it('accepts all valid OBO boundaries', () => {
      for (const boundary of ['email', 'message', 'calendar', 'social', 'purchase', 'transact']) {
        const result = parseAnnotation({ risk_level: 'R3', obo: boundary });
        expect(result.success, `Expected obo="${boundary}" to be valid`).toBe(true);
      }
    });
  });

  describe('invalid frontmatter — collect all errors', () => {
    it('rejects invalid risk_level with nearest-value suggestion', () => {
      const result = parseAnnotation({ risk_level: 'R6' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const riskError = result.errors.find((e) => e.path.includes('risk_level'));
        expect(riskError).toBeDefined();
        expect(riskError!.message).toContain('R5');
        // S04-F03: explains risk level scale
        expect(riskError!.message).toMatch(/R1.*READ|R5.*TRANSACT/i);
      }
    });

    it('collects multiple errors simultaneously (not fail-fast)', () => {
      const result = parseAnnotation({
        risk_level: 'R6',
        obo: 'invalid-boundary',
        data_labels: 'not-an-array',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        // Should have errors for all three fields
        expect(result.errors.length).toBeGreaterThanOrEqual(3);
        const paths = result.errors.map((e) => e.path);
        expect(paths).toContain('risk_level');
        expect(paths).toContain('obo');
        expect(paths).toContain('data_labels');
      }
    });

    it('suggests nearest valid enum for invalid OBO boundary', () => {
      const result = parseAnnotation({ risk_level: 'R3', obo: 'mail' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const oboError = result.errors.find((e) => e.path.includes('obo'));
        expect(oboError).toBeDefined();
        // S04-F01: nearest-value suggestion — "mail" -> "email"
        expect(oboError!.suggestion).toBe('email');
      }
    });

    it('rejects missing risk_level (required field)', () => {
      const result = parseAnnotation({ obo: 'email' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.some((e) => e.path === 'risk_level')).toBe(true);
      }
    });
  });

  describe('YAML None/null disambiguation (S04-F04 / P-229)', () => {
    it('treats string "None" as "none" risk concept, not null', () => {
      // In YAML, bare None without quotes becomes null.
      // But "None" in quotes is a valid string. The schema should:
      // 1. Reject null (risk_level is required)
      // 2. Accept "none" as a special keyword meaning "no governance" mapped to R1
      const result = parseAnnotation({ risk_level: 'none' });
      expect(result.success).toBe(true);
      if (result.success) {
        // "none" normalizes to R1 (informational, no enforcement)
        expect(result.data.risk_level).toBe('R1');
      }
    });

    it('rejects null risk_level', () => {
      const result = parseAnnotation({ risk_level: null });
      expect(result.success).toBe(false);
    });
  });

  describe('cross-field validation', () => {
    it('warns on R1 + transact OBO as contradictory (S03-F06)', () => {
      const result = parseAnnotation({ risk_level: 'R1', obo: 'transact' });
      // Cross-field: R1 (read-only) with transact OBO is contradictory
      // This should still parse but include a warning
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.warnings).toBeDefined();
        expect(result.warnings!.length).toBeGreaterThan(0);
        expect(result.warnings![0]).toMatch(/contradictory|mismatch/i);
      }
    });
  });

  describe('frontmatter-to-decorator propagation (S02-F02)', () => {
    it('propagation map converts frontmatter fields to decorator arguments', async () => {
      const { propagateToDecorators } = await import('../../src/schema/propagation.js');

      const frontmatter: GovernanceFrontmatter = {
        risk_level: 'R3',
        obo: 'email',
        data_labels: ['pii'],
      };

      const decoratorArgs = propagateToDecorators(frontmatter);

      expect(decoratorArgs).toEqual(
        expect.objectContaining({
          classify: 'R3',
          obo: 'email',
        }),
      );
    });

    it('propagation skips undefined optional fields', async () => {
      const { propagateToDecorators } = await import('../../src/schema/propagation.js');

      const frontmatter: GovernanceFrontmatter = {
        risk_level: 'R2',
      };

      const decoratorArgs = propagateToDecorators(frontmatter);

      expect(decoratorArgs.classify).toBe('R2');
      expect(decoratorArgs.obo).toBeUndefined();
    });

    it('prompt-only skills cannot use Tier 2 decorators (S02-F01)', async () => {
      const { propagateToDecorators } = await import('../../src/schema/propagation.js');

      const frontmatter: GovernanceFrontmatter = {
        risk_level: 'R3',
        obo: 'email',
        tier: 'prompt-only',
      };

      expect(() => propagateToDecorators(frontmatter)).toThrow(
        /prompt-only.*cannot.*tier 2/i,
      );
    });
  });
});
