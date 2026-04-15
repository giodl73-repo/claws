/**
 * L3 acceptance test for fleet compliance report — S06.
 *
 * Validates fleet compliance reporting:
 * - Compliance matrix covers workspace x framework
 * - Ungoverned workspaces excluded from compliance
 * - All 3 formats (CSV/JSON/table) consistent
 * - Governed workspace with all checks passing shows PASS
 *
 * @module claws-sdk/tests/accept/e2e/fleet-compliance-report.accept
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { generateFleetReport } from '#src/fleet/report.js';
import { buildComplianceMatrix, countByStatus, getComplianceStatus, overallComplianceRate } from '#src/fleet/compliance-matrix.js';
import { formatReport } from '#src/fleet/report-format.js';
import type { WorkspaceInfo, ScanResult, ScanStats } from '#src/fleet/types.js';
import type { DriftResult } from '#src/fleet/drift-types.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'compliance-report-accept-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/**
 * Helper: create a governed workspace with specific frameworks.
 */
function createGovernedWorkspace(
  name: string,
  frameworks: string[],
  trustTier = 3,
): string {
  const wsDir = join(tempDir, name);
  mkdirSync(join(wsDir, '.claws', 'policies'), { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');
  writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({
    trustTier,
    failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
  }));
  // Each framework gets a policy file
  for (const fw of frameworks) {
    writeFileSync(
      join(wsDir, '.claws', 'policies', `${fw}.yaml`),
      `name: ${fw}\nversion: 1\nrules:\n  - check: compliance`,
    );
  }
  return wsDir;
}

/**
 * Helper: create an ungoverned workspace (no .claws directory).
 */
function createUngovernedWorkspace(name: string): string {
  const wsDir = join(tempDir, name);
  mkdirSync(wsDir, { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');
  return wsDir;
}

describe('fleet compliance report contract (S06)', () => {
  it('compliance matrix, ungoverned exclusion, format consistency, governed pass', async () => {
    // ── Setup: 9 governed workspaces + 1 ungoverned ───────────────────

    const ws1 = createGovernedWorkspace('ws-alpha', ['soc2']);
    const ws2 = createGovernedWorkspace('ws-beta', ['soc2']);
    const ws3 = createGovernedWorkspace('ws-gamma', ['soc2', 'hipaa']);
    const ws4 = createGovernedWorkspace('ws-delta', ['soc2']);
    const ws5 = createGovernedWorkspace('ws-epsilon', ['soc2', 'eu-ai-act']);
    const ws6 = createGovernedWorkspace('ws-zeta', ['soc2']);
    const ws7 = createGovernedWorkspace('ws-eta', ['soc2', 'hipaa']);
    const ws8 = createGovernedWorkspace('ws-theta', ['hipaa']);
    const ws9 = createGovernedWorkspace('ws-iota', ['eu-ai-act']);
    const ws10 = createUngovernedWorkspace('ws-sandbox');

    const governedPaths = [ws1, ws2, ws3, ws4, ws5, ws6, ws7, ws8, ws9];

    const workspaces: WorkspaceInfo[] = [
      ...governedPaths.map((p) => ({
        path: p,
        markers: ['CLAUDE.md'] as readonly string[],
        classification: 'GOVERNED' as const,
        rationale: 'Valid governance',
      })),
      {
        path: ws10,
        markers: ['CLAUDE.md'],
        classification: 'UNGOVERNED' as const,
        rationale: 'No .claws directory',
      },
    ];

    const frameworks = ['soc2', 'hipaa', 'eu-ai-act'];

    // ── 1. Compliance matrix covers workspace x framework ─────────────

    // Build compliance matrix with no drift (all pass)
    const driftResults = new Map<string, DriftResult>();
    const matrix = await buildComplianceMatrix(workspaces, driftResults, frameworks);

    // Matrix has all frameworks as columns
    expect(matrix.frameworks).toEqual(frameworks);
    // Matrix has all 10 workspaces as rows
    expect(matrix.rows.length).toBe(10);

    // Each governed workspace with a framework policy shows 'pass'
    expect(getComplianceStatus(matrix, ws1, 'soc2')).toBe('pass');
    expect(getComplianceStatus(matrix, ws3, 'hipaa')).toBe('pass');
    expect(getComplianceStatus(matrix, ws5, 'eu-ai-act')).toBe('pass');

    // Workspaces without a framework show 'missing'
    expect(getComplianceStatus(matrix, ws1, 'hipaa')).toBe('missing');
    expect(getComplianceStatus(matrix, ws1, 'eu-ai-act')).toBe('missing');
    expect(getComplianceStatus(matrix, ws8, 'soc2')).toBe('missing');

    // ── 2. Ungoverned workspace excluded from compliance ──────────────

    // Ungoverned workspace shows 'missing' for all frameworks
    expect(getComplianceStatus(matrix, ws10, 'soc2')).toBe('missing');
    expect(getComplianceStatus(matrix, ws10, 'hipaa')).toBe('missing');
    expect(getComplianceStatus(matrix, ws10, 'eu-ai-act')).toBe('missing');

    // Ungoverned workspace row has classification UNGOVERNED
    const ungovRow = matrix.rows.find((r) => r.workspace === ws10);
    expect(ungovRow).toBeDefined();
    expect(ungovRow!.classification).toBe('UNGOVERNED');
    expect(ungovRow!.trustTier).toBeNull();

    // Counts exclude ungoverned: SOC2 has 7 pass, 0 fail, 3 missing
    const soc2Counts = countByStatus(matrix, 'soc2');
    expect(soc2Counts.pass).toBe(7); // ws1-ws7 have soc2
    expect(soc2Counts.fail).toBe(0);
    expect(soc2Counts.missing).toBe(3); // ws8, ws9, ws10

    const hipaaCounts = countByStatus(matrix, 'hipaa');
    expect(hipaaCounts.pass).toBe(3); // ws3, ws7, ws8
    expect(hipaaCounts.fail).toBe(0);
    expect(hipaaCounts.missing).toBe(7);

    const euAiActCounts = countByStatus(matrix, 'eu-ai-act');
    expect(euAiActCounts.pass).toBe(2); // ws5, ws9
    expect(euAiActCounts.fail).toBe(0);
    expect(euAiActCounts.missing).toBe(8);

    // ── 3. Governed workspace with all checks passing shows PASS ──────

    // Overall compliance rate should be 100% (all applicable cells pass)
    expect(overallComplianceRate(matrix)).toBe(100);

    // Now simulate drift on one workspace to create a failure
    const driftedResults = new Map<string, DriftResult>();
    driftedResults.set(ws4, {
      workspacePath: ws4,
      expectedHash: 'aaa',
      actualHash: 'bbb',
      driftDetected: true,
      severity: 'HIGH',
      suppressed: false,
      suppressionReason: null,
      status: 'drifted',
    });

    const matrixWithDrift = await buildComplianceMatrix(
      workspaces,
      driftedResults,
      frameworks,
    );

    // ws4 has soc2 and it's drifted — should show 'fail'
    expect(getComplianceStatus(matrixWithDrift, ws4, 'soc2')).toBe('fail');
    // ws4 doesn't have hipaa, still missing
    expect(getComplianceStatus(matrixWithDrift, ws4, 'hipaa')).toBe('missing');
    // Other workspaces unaffected
    expect(getComplianceStatus(matrixWithDrift, ws1, 'soc2')).toBe('pass');

    // Compliance rate with 1 fail out of 12 applicable: 11/12 = 92%
    expect(overallComplianceRate(matrixWithDrift)).toBe(92);

    // ── 4. All 3 formats (CSV/JSON/table) consistent ─────────────────

    // Generate a full fleet report (with empty baseline so all get no-baseline drift)
    const scanResult: ScanResult = {
      workspaces,
      stats: {
        total: 10,
        governed: 9,
        ungoverned: 1,
        misconfigured: 0,
        directoriesScanned: 10,
        durationMs: 50,
      },
      errors: [],
    };

    const report = await generateFleetReport(scanResult, tempDir, {
      frameworks,
    });

    // Report has all workspace details
    expect(report.workspaces.length).toBe(10);
    expect(report.summary.totalWorkspaces).toBe(10);
    expect(report.summary.governed).toBe(9);
    expect(report.summary.ungoverned).toBe(1);

    // Compliance matrix in report
    expect(report.complianceMatrix.frameworks).toEqual(frameworks);
    expect(report.complianceMatrix.rows.length).toBe(10);

    // CSV format
    const csv = formatReport(report, 'csv');
    expect(csv).toContain('Section,Key,Value');
    expect(csv).toContain('Summary,Total Workspaces,10');
    expect(csv).toContain('Summary,Governed,9');
    expect(csv).toContain('Summary,Ungoverned,1');
    expect(csv).toContain('soc2');
    expect(csv).toContain('hipaa');
    expect(csv).toContain('eu-ai-act');

    // JSON format
    const json = formatReport(report, 'json');
    const parsed = JSON.parse(json);
    expect(parsed.summary.totalWorkspaces).toBe(10);
    expect(parsed.summary.governed).toBe(9);
    expect(parsed.summary.ungoverned).toBe(1);
    expect(parsed.complianceMatrix.frameworks).toEqual(frameworks);
    expect(parsed.complianceMatrix.rows.length).toBe(10);

    // Table format (ANSI terminal)
    const table = formatReport(report, 'table');
    expect(table).toContain('Fleet Compliance Report');
    expect(table).toContain('Compliance Matrix');
    // Table references key workspaces
    expect(table).toContain('ws-alpha');
    expect(table).toContain('ws-sandbox');
  });
});
