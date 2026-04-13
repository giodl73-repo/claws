/**
 * L0: Color utility — NO_COLOR handling, severity-to-color mapping.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createPalette, isColorDisabled, severityColor, severityLabel } from '../../src/output/color.js';

describe('color utilities', () => {
  const origNoColor = process.env['NO_COLOR'];

  afterEach(() => {
    if (origNoColor === undefined) {
      delete process.env['NO_COLOR'];
    } else {
      process.env['NO_COLOR'] = origNoColor;
    }
  });

  describe('isColorDisabled', () => {
    it('returns false when color is enabled and NO_COLOR is not set', () => {
      delete process.env['NO_COLOR'];
      expect(isColorDisabled(true)).toBe(false);
    });

    it('returns true when colorEnabled is explicitly false', () => {
      delete process.env['NO_COLOR'];
      expect(isColorDisabled(false)).toBe(true);
    });

    it('returns true when NO_COLOR env var is set', () => {
      process.env['NO_COLOR'] = '1';
      expect(isColorDisabled()).toBe(true);
    });

    it('returns true when NO_COLOR is empty string', () => {
      process.env['NO_COLOR'] = '';
      expect(isColorDisabled()).toBe(true);
    });
  });

  describe('createPalette', () => {
    it('returns identity functions when color is disabled', () => {
      const palette = createPalette(false);
      expect(palette.pass('text')).toBe('text');
      expect(palette.fail('text')).toBe('text');
      expect(palette.warn('text')).toBe('text');
    });

    it('returns ANSI-wrapped functions when color is enabled', () => {
      delete process.env['NO_COLOR'];
      const palette = createPalette(true);
      const result = palette.pass('ok');
      expect(result).toContain('ok');
      expect(result).not.toBe('ok');
      expect(result).toContain('\x1b[');
    });

    it('NO_COLOR env var overrides colorEnabled=true', () => {
      process.env['NO_COLOR'] = '1';
      const palette = createPalette(true);
      expect(palette.pass('text')).toBe('text');
    });
  });

  describe('severityColor', () => {
    it('maps level 5 to fail (red)', () => {
      const palette = createPalette(false);
      const fn = severityColor(5, palette);
      expect(fn).toBe(palette.fail);
    });

    it('maps level 4 to fail (red)', () => {
      const palette = createPalette(false);
      expect(severityColor(4, palette)).toBe(palette.fail);
    });

    it('maps level 3 to warn (yellow)', () => {
      const palette = createPalette(false);
      expect(severityColor(3, palette)).toBe(palette.warn);
    });

    it('maps level 2 to dim', () => {
      const palette = createPalette(false);
      expect(severityColor(2, palette)).toBe(palette.dim);
    });

    it('maps level 1 to dim', () => {
      const palette = createPalette(false);
      expect(severityColor(1, palette)).toBe(palette.dim);
    });
  });

  describe('severityLabel', () => {
    it('maps 5 to critical', () => { expect(severityLabel(5)).toBe('critical'); });
    it('maps 4 to high', () => { expect(severityLabel(4)).toBe('high'); });
    it('maps 3 to medium', () => { expect(severityLabel(3)).toBe('medium'); });
    it('maps 2 to low', () => { expect(severityLabel(2)).toBe('low'); });
    it('maps 1 to info', () => { expect(severityLabel(1)).toBe('info'); });
  });
});
