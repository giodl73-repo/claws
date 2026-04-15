/**
 * L0: Color system — risk tier mapping, severity mapping, NO_COLOR support.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isColorEnabled, createColorPalette } from '../../src/color/index.js';
import { riskColor, RISK_TIER_COLORS } from '../../src/color/risk.js';
import { severityColor, SEVERITY_COLORS } from '../../src/color/severity.js';
import type { RiskTier } from '../../src/color/risk.js';
import type { SeverityLevel } from '../../src/color/severity.js';

describe('color system', () => {
  const origNoColor = process.env['NO_COLOR'];
  const origForceColor = process.env['FORCE_COLOR'];

  afterEach(() => {
    if (origNoColor === undefined) delete process.env['NO_COLOR'];
    else process.env['NO_COLOR'] = origNoColor;

    if (origForceColor === undefined) delete process.env['FORCE_COLOR'];
    else process.env['FORCE_COLOR'] = origForceColor;
  });

  beforeEach(() => {
    delete process.env['NO_COLOR'];
    delete process.env['FORCE_COLOR'];
  });

  describe('risk tier mapping', () => {
    it('maps each risk tier R1-R5 to a distinct color', () => {
      const palette = createColorPalette(true);
      const tiers: RiskTier[] = [1, 2, 3, 4, 5];
      const colorFns = tiers.map((t) => riskColor(t, palette));

      // Each tier produces distinct output
      const outputs = colorFns.map((fn) => fn('test'));
      const uniqueOutputs = new Set(outputs);
      expect(uniqueOutputs.size).toBe(5);

      // Static mapping covers all tiers
      expect(RISK_TIER_COLORS[1]).toBe('green');
      expect(RISK_TIER_COLORS[2]).toBe('cyan');
      expect(RISK_TIER_COLORS[3]).toBe('yellow');
      expect(RISK_TIER_COLORS[4]).toBe('red');
      expect(RISK_TIER_COLORS[5]).toBe('brightRed');
    });

    it('throws on invalid risk tier', () => {
      const palette = createColorPalette(true);
      // Force an invalid tier past the type system to cover the exhaustive default branch
      expect(() => riskColor(99 as RiskTier, palette)).toThrow('Invalid risk tier');
    });
  });

  describe('severity mapping', () => {
    it('maps each severity level to a distinct color', () => {
      const palette = createColorPalette(true);
      const levels: SeverityLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      const colorFns = levels.map((l) => severityColor(l, palette));

      // Each level produces distinct output
      const outputs = colorFns.map((fn) => fn('test'));
      const uniqueOutputs = new Set(outputs);
      expect(uniqueOutputs.size).toBe(4);

      // Static mapping covers all levels
      expect(SEVERITY_COLORS.CRITICAL).toBe('brightRed');
      expect(SEVERITY_COLORS.HIGH).toBe('red');
      expect(SEVERITY_COLORS.MEDIUM).toBe('yellow');
      expect(SEVERITY_COLORS.LOW).toBe('dim');
    });
  });

  describe('NO_COLOR disables all color output', () => {
    it('isColorEnabled returns false when NO_COLOR is set', () => {
      process.env['NO_COLOR'] = '1';
      expect(isColorEnabled()).toBe(false);
      expect(isColorEnabled(true)).toBe(false); // override cannot override NO_COLOR
    });

    it('FORCE_COLOR enables color even without TTY', () => {
      process.env['FORCE_COLOR'] = '1';
      expect(isColorEnabled()).toBe(true);
      expect(isColorEnabled(false)).toBe(true); // FORCE_COLOR wins over override
    });

    it('NO_COLOR takes priority over FORCE_COLOR', () => {
      process.env['NO_COLOR'] = '1';
      process.env['FORCE_COLOR'] = '1';
      expect(isColorEnabled()).toBe(false);
    });

    it('createColorPalette returns identity functions when NO_COLOR is set', () => {
      process.env['NO_COLOR'] = '1';
      const palette = createColorPalette();
      expect(palette.green('text')).toBe('text');
      expect(palette.red('text')).toBe('text');
      expect(palette.brightRed('text')).toBe('text');
      expect(palette.yellow('text')).toBe('text');
      expect(palette.cyan('text')).toBe('text');
      expect(palette.dim('text')).toBe('text');
      expect(palette.bold('text')).toBe('text');
    });

    it('createColorPalette returns ANSI-wrapped functions when color is enabled', () => {
      const palette = createColorPalette(true);
      const result = palette.green('ok');
      expect(result).toContain('ok');
      expect(result).not.toBe('ok');
      expect(result).toContain('\x1b[');
    });
  });
});
