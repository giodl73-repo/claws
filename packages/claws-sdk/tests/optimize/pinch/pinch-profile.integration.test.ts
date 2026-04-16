/**
 * L1: Pinch profiles -- integration tests.
 *
 * 2 integration tests:
 * 1. Pinch at G2 profile on fixture SKILL.md produces output within budget
 * 2. Profile regression: G3 output >= G2 output (strict superset)
 */

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  getProfileByLevel,
  isStrictSuperset,
  type PinchProfile,
} from '../../../src/optimize/pinch/pinch-profile.js';

/**
 * Minimal pinch simulation: selects governance content from a SKILL.md
 * based on the profile's rule inclusion criteria and estimates token count.
 *
 * Token estimation: ~4 characters per token (conservative).
 */
function simulatePinch(skillContent: string, profile: PinchProfile): { tokens: number; sections: string[] } {
  const sections: string[] = [];
  const lines = skillContent.split('\n');

  // Always include the header and risk level
  const headerLines = lines.filter(
    (l) => l.startsWith('name:') || l.startsWith('description:') || l.startsWith('risk_level:'),
  );
  if (headerLines.length > 0) {
    sections.push(headerLines.join('\n'));
  }

  // Include rules above weight threshold
  const ruleBlocks: string[] = [];
  let inRule = false;
  let currentRule: string[] = [];
  let currentWeight = 0;

  for (const line of lines) {
    if (line.trim().startsWith('- id:')) {
      if (inRule && currentWeight >= profile.inclusion.minWeight) {
        ruleBlocks.push(currentRule.join('\n'));
      }
      inRule = true;
      currentRule = [line];
      currentWeight = 0;
    } else if (inRule && line.trim().startsWith('weight:')) {
      currentWeight = parseFloat(line.split(':')[1]?.trim() ?? '0');
      currentRule.push(line);
    } else if (inRule && (line.trim().startsWith('-') && !line.trim().startsWith('- '))) {
      // New section, flush current rule
      if (currentWeight >= profile.inclusion.minWeight) {
        ruleBlocks.push(currentRule.join('\n'));
      }
      inRule = false;
      currentRule = [];
    } else if (inRule) {
      currentRule.push(line);
    }
  }
  // Flush last rule
  if (inRule && currentWeight >= profile.inclusion.minWeight) {
    ruleBlocks.push(currentRule.join('\n'));
  }

  if (ruleBlocks.length > 0) {
    sections.push(...ruleBlocks);
  }

  // Include OBO chain if enabled
  if (profile.inclusion.includeObo && skillContent.includes('obo_chain:')) {
    const oboStart = lines.findIndex((l) => l.trim().startsWith('obo_chain:'));
    if (oboStart >= 0) {
      const oboLines: string[] = [lines[oboStart]!];
      for (let i = oboStart + 1; i < lines.length; i++) {
        const line = lines[i]!;
        if (line.trim().startsWith('- actor:') || line.trim().startsWith('action:')) {
          oboLines.push(line);
        } else if (!line.trim().startsWith('-') && !line.trim().startsWith('action:') && line.trim() !== '') {
          break;
        }
      }
      sections.push(oboLines.join('\n'));
    }
  }

  // Include tensions if enabled
  if (profile.inclusion.includeTensions && skillContent.includes('tensions:')) {
    const tensionStart = lines.findIndex((l) => l.trim().startsWith('tensions:'));
    if (tensionStart >= 0) {
      const tensionLines: string[] = [lines[tensionStart]!];
      for (let i = tensionStart + 1; i < lines.length; i++) {
        const line = lines[i]!;
        if (line.trim().startsWith('- pair:') || line.trim().startsWith('description:')) {
          tensionLines.push(line);
        } else if (!line.trim().startsWith('-') && !line.trim().startsWith('description:') && line.trim() !== '') {
          break;
        }
      }
      sections.push(tensionLines.join('\n'));
    }
  }

  // Include audit refs if enabled
  if (profile.inclusion.includeAuditRefs && skillContent.includes('audit_refs:')) {
    const auditStart = lines.findIndex((l) => l.trim().startsWith('audit_refs:'));
    if (auditStart >= 0) {
      const auditLines: string[] = [lines[auditStart]!];
      for (let i = auditStart + 1; i < lines.length; i++) {
        const line = lines[i]!;
        if (line.trim().startsWith('- "AUDIT') || line.trim().startsWith('- \'AUDIT')) {
          auditLines.push(line);
        } else if (line.trim() !== '' && !line.trim().startsWith('-')) {
          break;
        }
      }
      sections.push(auditLines.join('\n'));
    }
  }

  // Include policy links if enabled
  if (profile.inclusion.includePolicyLinks && skillContent.includes('policy_links:')) {
    const policyStart = lines.findIndex((l) => l.trim().startsWith('policy_links:'));
    if (policyStart >= 0) {
      const policyLines: string[] = [lines[policyStart]!];
      for (let i = policyStart + 1; i < lines.length; i++) {
        const line = lines[i]!;
        if (line.trim().startsWith('- "http') || line.trim().startsWith('- \'http')) {
          policyLines.push(line);
        } else if (line.trim() !== '' && !line.trim().startsWith('-')) {
          break;
        }
      }
      sections.push(policyLines.join('\n'));
    }
  }

  // Include historical notes if enabled
  if (profile.inclusion.includeHistoricalNotes && skillContent.includes('historical_notes:')) {
    const histStart = lines.findIndex((l) => l.trim().startsWith('historical_notes:'));
    if (histStart >= 0) {
      const histLines: string[] = [lines[histStart]!];
      for (let i = histStart + 1; i < lines.length; i++) {
        const line = lines[i]!;
        if (line.trim().startsWith('- "20') || line.trim().startsWith('- \'20')) {
          histLines.push(line);
        } else if (line.trim() !== '' && !line.trim().startsWith('-')) {
          break;
        }
      }
      sections.push(histLines.join('\n'));
    }
  }

  // Include risk decomposition if enabled
  if (profile.inclusion.includeRiskDecomposition && skillContent.includes('risk_decomposition:')) {
    const riskStart = lines.findIndex((l) => l.trim().startsWith('risk_decomposition:'));
    if (riskStart >= 0) {
      const riskLines: string[] = [lines[riskStart]!];
      for (let i = riskStart + 1; i < lines.length; i++) {
        const line = lines[i]!;
        if (line.trim().match(/^\w+_risk:/)) {
          riskLines.push(line);
        } else if (line.trim() !== '' && !line.trim().match(/^\w+_risk:/)) {
          break;
        }
      }
      sections.push(riskLines.join('\n'));
    }
  }

  const output = sections.join('\n\n');
  // Conservative token estimate: ~4 chars per token
  const tokens = Math.ceil(output.length / 4);

  return { tokens, sections };
}

const FIXTURE_PATH = resolve(__dirname, '../../fixtures/pinch-workspace/skills/scan-code/SKILL.md');

describe('PinchProfile integration', () => {
  it('pinch at G2 profile on fixture SKILL.md produces output within budget', async () => {
    const content = await readFile(FIXTURE_PATH, 'utf-8');
    const g2 = getProfileByLevel(2)!;

    const result = simulatePinch(content, g2);

    // Output must be within the G2 token budget
    expect(result.tokens).toBeLessThanOrEqual(g2.tokenBudget);
    expect(result.tokens).toBeGreaterThan(0);

    // G2 should include tensions (includeTensions = true)
    expect(result.sections.some((s) => s.includes('tensions'))).toBe(true);

    // G2 should NOT include audit refs (includeAuditRefs = false)
    expect(result.sections.some((s) => s.includes('AUDIT-2026'))).toBe(false);
  });

  it('profile regression: G3 output >= G2 output (strict superset)', async () => {
    const content = await readFile(FIXTURE_PATH, 'utf-8');
    const g2 = getProfileByLevel(2)!;
    const g3 = getProfileByLevel(3)!;

    // Structural superset check
    expect(isStrictSuperset(g3, g2)).toBe(true);

    // Content-level superset check: G3 includes more sections
    const resultG2 = simulatePinch(content, g2);
    const resultG3 = simulatePinch(content, g3);

    expect(resultG3.tokens).toBeGreaterThanOrEqual(resultG2.tokens);
    expect(resultG3.sections.length).toBeGreaterThanOrEqual(resultG2.sections.length);

    // G3 should include everything G2 includes
    expect(resultG3.sections.some((s) => s.includes('tensions'))).toBe(true);

    // G3-exclusive: audit refs, policy links, historical notes, risk decomposition
    expect(resultG3.sections.some((s) => s.includes('AUDIT-2026'))).toBe(true);
    expect(resultG3.sections.some((s) => s.includes('policy_links'))).toBe(true);
    expect(resultG3.sections.some((s) => s.includes('historical_notes'))).toBe(true);
    expect(resultG3.sections.some((s) => s.includes('risk_decomposition'))).toBe(true);

    // G3 output must still be within its own budget
    expect(resultG3.tokens).toBeLessThanOrEqual(g3.tokenBudget);
  });
});
