/**
 * L2 e2e test for fleet report — scan → generate report → format in all 3 formats.
 *
 * Full pipeline: create 3 fixture workspaces, scan fleet, generate report,
 * output in CSV/JSON/table, verify CSV headers + rows, JSON validates
 * FleetReport schema, all formats contain consistent data.
 *
 * @module claws-sdk/tests/fleet/report.e2e
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scanFleet } from '#src/fleet/scan.js';
import { generateFleetReport } from '#src/fleet/report.js';
import { formatCsv, formatJson, formatTable } from '#src/fleet/report-format.js';
import type { FleetReport } from '#src/fleet/report.js';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures', 'fleet');

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'report-e2e-'));
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('fleet report e2e', () => {
  it('scan 3 fixtures → generate report in csv/json/table → verify consistency', async () => {
    // 1. Set up fleet: copy fixture workspaces
    cpSync(join(FIXTURES_DIR, 'governed-workspace'), join(tempDir, 'governed'), { recursive: true });
    cpSync(join(FIXTURES_DIR, 'ungoverned-workspace'), join(tempDir, 'ungoverned'), { recursive: true });
    cpSync(join(FIXTURES_DIR, 'misconfigured-workspace'), join(tempDir, 'misconfigured'), { recursive: true });

    // 2. Scan the fleet
    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    expect(scanResult.workspaces.length).toBeGreaterThanOrEqual(3);

    // Verify fixture classifications
    const governed = scanResult.workspaces.find((ws) => ws.path.includes('governed') && !ws.path.includes('ungoverned'));
    const ungoverned = scanResult.workspaces.find((ws) => ws.path.includes('ungoverned'));
    const misconfigured = scanResult.workspaces.find((ws) => ws.path.includes('misconfigured'));

    expect(governed).toBeDefined();
    expect(governed!.classification).toBe('GOVERNED');
    expect(ungoverned).toBeDefined();
    expect(ungoverned!.classification).toBe('UNGOVERNED');
    expect(misconfigured).toBeDefined();
    expect(misconfigured!.classification).toBe('MISCONFIGURED');

    // 3. Generate fleet report
    const report = await generateFleetReport(scanResult, tempDir);

    // 4. Verify report structure
    expect(report.timestamp).toBeDefined();
    expect(report.fleetRoot).toBe(tempDir);
    expect(report.summary.totalWorkspaces).toBeGreaterThanOrEqual(3);
    expect(report.summary.governed).toBeGreaterThanOrEqual(1);
    expect(report.summary.ungoverned).toBeGreaterThanOrEqual(1);
    expect(report.summary.misconfigured).toBeGreaterThanOrEqual(1);

    // Governed workspace should have details
    const govDetail = report.workspaces.find((w) => w.path.includes('governed') && !w.path.includes('ungoverned'));
    expect(govDetail).toBeDefined();
    expect(govDetail!.classification).toBe('GOVERNED');
    expect(govDetail!.policyCount).toBeGreaterThanOrEqual(1);
    expect(govDetail!.killStatus).toBe('active');

    // 5. Generate all 3 formats
    const csv = formatCsv(report);
    const json = formatJson(report);
    const table = formatTable(report);

    // ── CSV verification ──────────────────────────────────────────────

    // CSV has correct headers
    expect(csv).toContain('Section,Key,Value');
    expect(csv).toContain('Workspace,Classification,Trust Tier,Drift Status,Kill Status,Last Broadcast,Policies');

    // CSV has summary rows
    expect(csv).toContain('Summary,Total Workspaces,');
    expect(csv).toContain('Summary,Governed,');
    expect(csv).toContain('Summary,Ungoverned,');
    expect(csv).toContain('Summary,Misconfigured,');

    // CSV has workspace rows for all 3
    const csvLines = csv.split('\n');
    const dataLines = csvLines.filter((l) =>
      l.length > 0 &&
      !l.startsWith('Section,') &&
      !l.startsWith('Summary,') &&
      !l.startsWith('Workspace,'),
    );
    expect(dataLines.length).toBe(report.workspaces.length);

    // ── JSON verification ─────────────────────────────────────────────

    // JSON is valid and matches FleetReport schema
    const parsed: FleetReport = JSON.parse(json);
    expect(parsed.timestamp).toBe(report.timestamp);
    expect(parsed.fleetRoot).toBe(report.fleetRoot);
    expect(parsed.summary.totalWorkspaces).toBe(report.summary.totalWorkspaces);
    expect(parsed.summary.governed).toBe(report.summary.governed);
    expect(parsed.summary.ungoverned).toBe(report.summary.ungoverned);
    expect(parsed.summary.misconfigured).toBe(report.summary.misconfigured);
    expect(parsed.workspaces).toHaveLength(report.workspaces.length);
    expect(parsed.complianceMatrix).toBeDefined();
    expect(parsed.complianceMatrix.frameworks).toBeDefined();
    expect(parsed.complianceMatrix.rows).toBeDefined();

    // ── Table verification ────────────────────────────────────────────

    // Table has sections
    expect(table).toContain('Fleet Compliance Report');
    expect(table).toContain('Summary');
    expect(table).toContain('Workspaces');

    // Table contains ANSI color codes
    expect(table).toContain('\x1b[');

    // ── Cross-format consistency ──────────────────────────────────────

    // All formats contain the governed workspace path
    // JSON escapes backslashes on Windows, so check parsed workspaces instead
    expect(csv).toContain(governed!.path);
    expect(parsed.workspaces.some((w) => w.path === governed!.path)).toBe(true);
    expect(table).toContain(governed!.path);

    // All formats agree on total workspace count
    expect(parsed.summary.totalWorkspaces).toBe(report.summary.totalWorkspaces);
    expect(csv).toContain(`Summary,Total Workspaces,${report.summary.totalWorkspaces}`);
  });
});
