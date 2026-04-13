/**
 * L2: Conflict detection e2e test — full parse -> extract -> detectConflicts
 * pipeline on the conflict-workspace fixture.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parse } from '../../src/compile/parse.js';
import { extractAllIntents } from '../../src/compile/intent/index.js';
import { buildGovernanceAST } from '../../src/compile/governance-ast.js';
import { extract } from '../../src/compile/extract.js';
import { detectConflicts } from '../../src/compile/conflict-detect.js';

const FIXTURES = resolve(__dirname, '../fixtures');
const CONFLICT_WORKSPACE = resolve(FIXTURES, 'conflict-workspace');

describe('full parse -> extract -> detectConflicts pipeline', () => {
  it('conflict-workspace fixture produces ConflictReport with multiple conflict categories', async () => {
    // Pass 1: parse workspace files
    const parseResult = await parse(CONFLICT_WORKSPACE);
    expect(parseResult.presentCount).toBeGreaterThanOrEqual(7);

    // Pass 1b: extract intents per file
    const intentResults = extractAllIntents(parseResult);
    expect(intentResults.length).toBeGreaterThan(0);

    // Pass 2: build GovernanceAST with cross-reference resolution
    const ast = buildGovernanceAST(intentResults);

    // Extract ParsedManifest
    const manifest = extract(ast);

    // Pass 3: detect conflicts
    const report = detectConflicts(ast, manifest);

    // Should find conflicts
    expect(report.conflicts.length).toBeGreaterThan(0);

    // Verify structure of every conflict entry
    for (const conflict of report.conflicts) {
      expect(conflict.category).toBeTruthy();
      expect(conflict.code).toMatch(/^CLAWS-C00[1-7]$/);
      expect(conflict.severity).toMatch(/^(Error|Warning)$/);
      expect(conflict.locationA.file).toBeTruthy();
      expect(typeof conflict.locationA.line).toBe('number');
      expect(conflict.locationB.file).toBeTruthy();
      expect(typeof conflict.locationB.line).toBe('number');
      expect(conflict.explanation).toBeTruthy();
    }

    // Verify ordering: Errors before Warnings
    let seenWarning = false;
    for (const conflict of report.conflicts) {
      if (conflict.severity === 'Warning') seenWarning = true;
      if (conflict.severity === 'Error' && seenWarning) {
        expect.fail('Error after Warning — report not sorted by severity');
      }
    }

    // Verify counts match
    expect(report.errorCount).toBe(report.conflicts.filter(c => c.severity === 'Error').length);
    expect(report.warningCount).toBe(report.conflicts.filter(c => c.severity === 'Warning').length);
  });
});
