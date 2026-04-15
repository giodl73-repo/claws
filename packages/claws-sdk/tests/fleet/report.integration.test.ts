/**
 * L1 integration tests for fleet report — multi-workspace report generation.
 *
 * 2 tests:
 * 1. Report on 3 fixture workspaces produces expected compliance matrix
 * 2. All 3 format outputs (csv/json/table) contain consistent data
 *
 * @module claws-sdk/tests/fleet/report.integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scanFleet } from '#src/fleet/scan.js';
import { generateFleetReport } from '#src/fleet/report.js';
import { formatCsv, formatJson, formatTable } from '#src/fleet/report-format.js';
import type { FleetReport } from '#src/fleet/report.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'report-integ-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

/** Create a governed workspace with specified policies. */
function createGoverned(name: string, policies: string[] = ['default'], trustTier = 3): string {
  const wsDir = join(tempDir, name);
  mkdirSync(join(wsDir, '.claws', 'policies'), { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');
  writeFileSync(join(wsDir, 'claws.json'), JSON.stringify({
    trustTier,
    failMode: { R1: 'open', R2: 'open', R3: 'gated', R4: 'gated', R5: 'closed' },
    fleet: { allowBypass: false },
  }));
  for (const p of policies) {
    writeFileSync(join(wsDir, '.claws', 'policies', `${p}.yaml`), `name: ${p}\nversion: 1`);
  }
  return wsDir;
}

/** Create an ungoverned workspace. */
function createUngoverned(name: string): string {
  const wsDir = join(tempDir, name);
  mkdirSync(wsDir, { recursive: true });
  writeFileSync(join(wsDir, '.cursorrules'), 'some rules');
  return wsDir;
}

/** Create a misconfigured workspace. */
function createMisconfigured(name: string): string {
  const wsDir = join(tempDir, name);
  mkdirSync(join(wsDir, '.claws'), { recursive: true });
  writeFileSync(join(wsDir, 'CLAUDE.md'), '# Workspace');
  writeFileSync(join(wsDir, 'claws.json'), '{ invalid json }');
  return wsDir;
}

describe('fleet report integration', () => {
  it('report on 3 workspaces produces expected compliance matrix with correct classifications', async () => {
    // Create fixtures: governed with soc2+hipaa, governed with soc2 only, ungoverned
    const gov1 = createGoverned('gov-full', ['soc2', 'hipaa'], 3);
    const gov2 = createGoverned('gov-partial', ['soc2'], 2);
    const ungov = createUngoverned('ungov-1');

    // Scan
    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    expect(scanResult.workspaces.length).toBeGreaterThanOrEqual(3);

    // Generate report
    const report = await generateFleetReport(scanResult, tempDir);

    // Verify summary counts
    expect(report.summary.totalWorkspaces).toBeGreaterThanOrEqual(3);
    expect(report.summary.governed).toBeGreaterThanOrEqual(2);
    expect(report.summary.ungoverned).toBeGreaterThanOrEqual(1);

    // Verify workspace details
    const gov1Detail = report.workspaces.find((w) => w.path === gov1);
    expect(gov1Detail).toBeDefined();
    expect(gov1Detail!.classification).toBe('GOVERNED');
    expect(gov1Detail!.trustTier).toBe(3);
    expect(gov1Detail!.policyCount).toBe(2);

    const gov2Detail = report.workspaces.find((w) => w.path === gov2);
    expect(gov2Detail).toBeDefined();
    expect(gov2Detail!.classification).toBe('GOVERNED');
    expect(gov2Detail!.trustTier).toBe(2);
    expect(gov2Detail!.policyCount).toBe(1);

    const ungovDetail = report.workspaces.find((w) => w.path === ungov);
    expect(ungovDetail).toBeDefined();
    expect(ungovDetail!.classification).toBe('UNGOVERNED');

    // Verify compliance matrix
    const { complianceMatrix } = report;
    expect(complianceMatrix.frameworks).toContain('soc2');

    // gov1 has soc2 → should be pass or no-baseline (no drift baseline)
    const gov1Row = complianceMatrix.rows.find((r) => r.workspace === gov1);
    expect(gov1Row).toBeDefined();
    const gov1Soc2 = gov1Row!.cells.find((c) => c.framework === 'soc2');
    expect(gov1Soc2).toBeDefined();
    // Without a baseline, drift status is no-baseline, so pass (no unsuppressed drift)
    expect(gov1Soc2!.status).toBe('pass');

    // ungov has no policies → all missing
    const ungovRow = complianceMatrix.rows.find((r) => r.workspace === ungov);
    expect(ungovRow).toBeDefined();
    for (const cell of ungovRow!.cells) {
      expect(cell.status).toBe('missing');
    }
  });

  it('all 3 format outputs contain consistent data', async () => {
    const gov = createGoverned('format-gov', ['soc2', 'iso27001'], 3);
    const ungov = createUngoverned('format-ungov');
    const misconf = createMisconfigured('format-misconf');

    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    const report = await generateFleetReport(scanResult, tempDir);

    // Generate all 3 formats
    const csv = formatCsv(report);
    const json = formatJson(report);
    const table = formatTable(report);

    // Parse JSON and verify structure
    const parsed: FleetReport = JSON.parse(json);
    expect(parsed.summary.totalWorkspaces).toBe(report.summary.totalWorkspaces);
    expect(parsed.workspaces.length).toBe(report.workspaces.length);

    // CSV contains the same workspace count
    const csvLines = csv.split('\n').filter((l) => l.length > 0);
    // After summary section (9 data lines + 1 header + 1 blank) + 1 detail header = total data rows
    const dataRows = csvLines.filter((l) => !l.startsWith('Section,') && !l.startsWith('Workspace,') && !l.startsWith('Summary,'));
    expect(dataRows.length).toBe(report.workspaces.length);

    // All formats mention the governed workspace path
    // JSON escapes backslashes, so check parsed workspaces instead
    expect(csv).toContain(gov);
    expect(parsed.workspaces.some((w) => w.path === gov)).toBe(true);
    expect(table).toContain(gov);

    // All formats mention the ungoverned workspace
    expect(csv).toContain(ungov);
    expect(parsed.workspaces.some((w) => w.path === ungov)).toBe(true);
    expect(table).toContain(ungov);

    // Summary numbers are consistent
    expect(csv).toContain(`Summary,Governed,${report.summary.governed}`);
    expect(parsed.summary.governed).toBe(report.summary.governed);
    expect(table).toContain(`${report.summary.totalWorkspaces}`);
  });
});
