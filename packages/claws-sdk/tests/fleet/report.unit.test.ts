/**
 * L0 unit tests for fleet report — compliance matrix, CSV format,
 * JSON format, table format.
 *
 * @module claws-sdk/tests/fleet/report.unit
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { buildComplianceMatrix, generateFleetReport } from '#src/fleet/report.js';
import { establishBaseline } from '#src/fleet/baseline.js';
import { scanFleet } from '#src/fleet/scan.js';
import {
  countByStatus,
  getComplianceStatus,
  getFailingWorkspaces,
  overallComplianceRate,
} from '#src/fleet/compliance-matrix.js';
import { formatCsv, formatJson, formatTable, formatReport } from '#src/fleet/report-format.js';
import type { FleetReport, ComplianceMatrix, WorkspaceDetail, FleetReportSummary } from '#src/fleet/report.js';
import type { DriftResult } from '#src/fleet/drift-types.js';
import type { WorkspaceInfo } from '#src/fleet/types.js';

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'report-unit-'));
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

/** Build a minimal FleetReport for testing formatters. */
function buildTestReport(overrides?: Partial<FleetReport>): FleetReport {
  const summary: FleetReportSummary = {
    totalWorkspaces: 3,
    governed: 2,
    ungoverned: 1,
    misconfigured: 0,
    driftClean: 1,
    driftDrifted: 1,
    driftSuppressed: 0,
    driftNoBaseline: 0,
    driftUnknown: 1,
    killed: 0,
  };

  const workspaces: WorkspaceDetail[] = [
    {
      path: '/fleet/ws1',
      classification: 'GOVERNED',
      driftStatus: 'clean',
      killStatus: 'active',
      lastBroadcast: '2026-04-01T00:00:00.000Z',
      trustTier: 3,
      policyCount: 2,
    },
    {
      path: '/fleet/ws2',
      classification: 'GOVERNED',
      driftStatus: 'drifted',
      killStatus: 'active',
      lastBroadcast: null,
      trustTier: 2,
      policyCount: 1,
    },
    {
      path: '/fleet/ungov',
      classification: 'UNGOVERNED',
      driftStatus: 'unknown',
      killStatus: 'unknown',
      lastBroadcast: null,
      trustTier: null,
      policyCount: 0,
    },
  ];

  const complianceMatrix: ComplianceMatrix = {
    frameworks: ['soc2', 'iso27001'],
    rows: [
      {
        workspace: '/fleet/ws1',
        classification: 'GOVERNED',
        trustTier: 3,
        cells: [
          { framework: 'soc2', status: 'pass' },
          { framework: 'iso27001', status: 'pass' },
        ],
      },
      {
        workspace: '/fleet/ws2',
        classification: 'GOVERNED',
        trustTier: 2,
        cells: [
          { framework: 'soc2', status: 'fail' },
          { framework: 'iso27001', status: 'missing' },
        ],
      },
      {
        workspace: '/fleet/ungov',
        classification: 'UNGOVERNED',
        trustTier: null,
        cells: [
          { framework: 'soc2', status: 'missing' },
          { framework: 'iso27001', status: 'missing' },
        ],
      },
    ],
  };

  return {
    timestamp: '2026-04-13T12:00:00.000Z',
    fleetRoot: '/fleet',
    summary,
    workspaces,
    complianceMatrix,
    ...overrides,
  };
}

// ─── 1. Compliance matrix computation ────────────────────────────────

describe('buildComplianceMatrix', () => {
  it('produces correct workspace x framework grid', async () => {
    const ws1 = createGoverned('ws1', ['soc2', 'hipaa']);
    const ws2 = createGoverned('ws2', ['soc2']);

    const workspaces: WorkspaceInfo[] = [
      { path: ws1, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
      { path: ws2, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
    ];

    const driftMap = new Map<string, DriftResult>();
    // ws1 is clean, ws2 has drift
    driftMap.set(ws2, {
      workspacePath: ws2,
      expectedHash: 'abc',
      actualHash: 'def',
      driftDetected: true,
      severity: 'LOW',
      suppressed: false,
      suppressionReason: null,
      status: 'drifted',
    });

    const matrix = await buildComplianceMatrix(workspaces, driftMap, ['soc2', 'hipaa']);

    expect(matrix.frameworks).toEqual(['soc2', 'hipaa']);
    expect(matrix.rows).toHaveLength(2);

    // ws1: soc2=pass, hipaa=pass (no drift)
    const row1 = matrix.rows[0]!;
    expect(row1.workspace).toBe(ws1);
    expect(row1.cells.find((c) => c.framework === 'soc2')?.status).toBe('pass');
    expect(row1.cells.find((c) => c.framework === 'hipaa')?.status).toBe('pass');

    // ws2: soc2=fail (drifted), hipaa=missing (no hipaa policy)
    const row2 = matrix.rows[1]!;
    expect(row2.workspace).toBe(ws2);
    expect(row2.cells.find((c) => c.framework === 'soc2')?.status).toBe('fail');
    expect(row2.cells.find((c) => c.framework === 'hipaa')?.status).toBe('missing');
  });

  it('marks ungoverned workspaces as missing for all frameworks', async () => {
    const ungov = join(tempDir, 'ungoverned');
    mkdirSync(ungov, { recursive: true });

    const workspaces: WorkspaceInfo[] = [
      { path: ungov, markers: ['.cursorrules'], classification: 'UNGOVERNED', rationale: 'No .claws/' },
    ];

    const matrix = await buildComplianceMatrix(workspaces, new Map(), ['soc2']);
    expect(matrix.rows[0]!.cells[0]!.status).toBe('missing');
  });

  it('treats suppressed drift as pass', async () => {
    const ws = createGoverned('suppressed', ['soc2']);

    const workspaces: WorkspaceInfo[] = [
      { path: ws, markers: ['CLAUDE.md'], classification: 'GOVERNED', rationale: 'Valid' },
    ];

    const driftMap = new Map<string, DriftResult>();
    driftMap.set(ws, {
      workspacePath: ws,
      expectedHash: 'abc',
      actualHash: 'def',
      driftDetected: true,
      severity: 'LOW',
      suppressed: true,
      suppressionReason: 'approved',
      status: 'suppressed',
    });

    const matrix = await buildComplianceMatrix(workspaces, driftMap, ['soc2']);
    expect(matrix.rows[0]!.cells[0]!.status).toBe('pass');
  });
});

// ─── 2. CSV format ────────────────────────────────────────────────────

describe('formatCsv', () => {
  it('produces valid CSV with correct headers and rows', () => {
    const report = buildTestReport();
    const csv = formatCsv(report);

    // Check summary section
    expect(csv).toContain('Section,Key,Value');
    expect(csv).toContain('Summary,Total Workspaces,3');
    expect(csv).toContain('Summary,Governed,2');
    expect(csv).toContain('Summary,Ungoverned,1');

    // Check workspace detail headers
    expect(csv).toContain('Workspace,Classification,Trust Tier,Drift Status,Kill Status,Last Broadcast,Policies,soc2,iso27001');

    // Check workspace rows
    expect(csv).toContain('/fleet/ws1,GOVERNED,3,clean,active,2026-04-01T00:00:00.000Z,2,pass,pass');
    expect(csv).toContain('/fleet/ws2,GOVERNED,2,drifted,active,,1,fail,missing');
    expect(csv).toContain('/fleet/ungov,UNGOVERNED,,unknown,unknown,,0,missing,missing');

    // Ends with newline
    expect(csv.endsWith('\n')).toBe(true);
  });

  it('escapes paths with commas in CSV', () => {
    const report = buildTestReport({
      workspaces: [{
        path: '/fleet/ws,special',
        classification: 'GOVERNED',
        driftStatus: 'clean',
        killStatus: 'active',
        lastBroadcast: null,
        trustTier: 3,
        policyCount: 1,
      }],
      complianceMatrix: {
        frameworks: [],
        rows: [{
          workspace: '/fleet/ws,special',
          classification: 'GOVERNED',
          trustTier: 3,
          cells: [],
        }],
      },
    });

    const csv = formatCsv(report);
    expect(csv).toContain('"/fleet/ws,special"');
  });
});

// ─── 3. JSON format ───────────────────────────────────────────────────

describe('formatJson', () => {
  it('produces valid JSON matching FleetReport schema', () => {
    const report = buildTestReport();
    const jsonStr = formatJson(report);

    // Must be valid JSON
    const parsed = JSON.parse(jsonStr);

    // Top-level structure
    expect(parsed.timestamp).toBe('2026-04-13T12:00:00.000Z');
    expect(parsed.fleetRoot).toBe('/fleet');
    expect(parsed.summary).toBeDefined();
    expect(parsed.workspaces).toBeDefined();
    expect(parsed.complianceMatrix).toBeDefined();

    // Summary
    expect(parsed.summary.totalWorkspaces).toBe(3);
    expect(parsed.summary.governed).toBe(2);
    expect(parsed.summary.ungoverned).toBe(1);

    // Workspaces
    expect(parsed.workspaces).toHaveLength(3);
    expect(parsed.workspaces[0].path).toBe('/fleet/ws1');
    expect(parsed.workspaces[0].classification).toBe('GOVERNED');

    // Compliance matrix
    expect(parsed.complianceMatrix.frameworks).toEqual(['soc2', 'iso27001']);
    expect(parsed.complianceMatrix.rows).toHaveLength(3);

    // Ends with newline
    expect(jsonStr.endsWith('\n')).toBe(true);
  });
});

// ─── 4. Table format ──────────────────────────────────────────────────

describe('formatTable', () => {
  it('produces aligned terminal table with ANSI color coding', () => {
    const report = buildTestReport();
    const table = formatTable(report);

    // Has title section
    expect(table).toContain('Fleet Compliance Report');
    expect(table).toContain('Generated:');

    // Has summary section
    expect(table).toContain('Summary');
    expect(table).toContain('Total workspaces:');

    // Has workspace detail section
    expect(table).toContain('Workspaces');
    expect(table).toContain('/fleet/ws1');
    expect(table).toContain('/fleet/ws2');
    expect(table).toContain('/fleet/ungov');

    // Has compliance matrix section
    expect(table).toContain('Compliance Matrix');
    expect(table).toContain('soc2');
    expect(table).toContain('iso27001');

    // Contains ANSI color codes
    expect(table).toContain('\x1b[32m'); // green
    expect(table).toContain('\x1b[31m'); // red
    expect(table).toContain('\x1b[0m');  // reset
  });

  it('skips compliance matrix section when no frameworks', () => {
    const report = buildTestReport({
      complianceMatrix: { frameworks: [], rows: [] },
    });
    const table = formatTable(report);
    expect(table).not.toContain('Compliance Matrix');
  });
});

// ─── 4b. Table format edge cases ──────────────────────────────────────

describe('formatTable edge cases', () => {
  it('shows killed status when killed > 0', () => {
    const report = buildTestReport({
      summary: {
        totalWorkspaces: 2,
        governed: 1,
        ungoverned: 0,
        misconfigured: 0,
        driftClean: 0,
        driftDrifted: 0,
        driftSuppressed: 0,
        driftNoBaseline: 0,
        driftUnknown: 1,
        killed: 1,
      },
      workspaces: [
        {
          path: '/fleet/ws-killed',
          classification: 'GOVERNED',
          driftStatus: 'suppressed',
          killStatus: 'killed',
          lastBroadcast: null,
          trustTier: 3,
          policyCount: 1,
        },
        {
          path: '/fleet/ws-custom',
          classification: 'CUSTOM' as any,
          driftStatus: 'unknown',
          killStatus: 'unknown',
          lastBroadcast: null,
          trustTier: null,
          policyCount: 0,
        },
      ],
      complianceMatrix: { frameworks: [], rows: [] },
    });

    const table = formatTable(report);

    // Should show killed line in summary
    expect(table).toContain('Killed:');

    // Should show suppressed drift color
    expect(table).toContain('suppressed');

    // Should show killed kill status
    expect(table).toContain('killed');

    // Should handle unknown classification (default branch)
    expect(table).toContain('CUSTOM');
  });
});

// ─── 5. formatReport dispatch ─────────────────────────────────────────

describe('formatReport', () => {
  it('dispatches to csv formatter', () => {
    const report = buildTestReport();
    const output = formatReport(report, 'csv');
    expect(output).toContain('Section,Key,Value');
  });

  it('dispatches to json formatter', () => {
    const report = buildTestReport();
    const output = formatReport(report, 'json');
    const parsed = JSON.parse(output);
    expect(parsed.timestamp).toBeDefined();
  });

  it('dispatches to table formatter', () => {
    const report = buildTestReport();
    const output = formatReport(report, 'table');
    expect(output).toContain('Fleet Compliance Report');
  });
});

// ─── 6. Compliance matrix query helpers ───────────────────────────────

describe('compliance matrix query helpers', () => {
  const matrix: ComplianceMatrix = {
    frameworks: ['soc2', 'hipaa'],
    rows: [
      {
        workspace: '/ws1',
        classification: 'GOVERNED',
        trustTier: 3,
        cells: [
          { framework: 'soc2', status: 'pass' },
          { framework: 'hipaa', status: 'fail' },
        ],
      },
      {
        workspace: '/ws2',
        classification: 'GOVERNED',
        trustTier: 2,
        cells: [
          { framework: 'soc2', status: 'pass' },
          { framework: 'hipaa', status: 'missing' },
        ],
      },
    ],
  };

  it('countByStatus counts pass/fail/missing correctly', () => {
    const soc2 = countByStatus(matrix, 'soc2');
    expect(soc2).toEqual({ pass: 2, fail: 0, missing: 0 });

    const hipaa = countByStatus(matrix, 'hipaa');
    expect(hipaa).toEqual({ pass: 0, fail: 1, missing: 1 });
  });

  it('getComplianceStatus returns correct status', () => {
    expect(getComplianceStatus(matrix, '/ws1', 'soc2')).toBe('pass');
    expect(getComplianceStatus(matrix, '/ws1', 'hipaa')).toBe('fail');
    expect(getComplianceStatus(matrix, '/ws2', 'hipaa')).toBe('missing');
    expect(getComplianceStatus(matrix, '/unknown', 'soc2')).toBe('missing');
    expect(getComplianceStatus(matrix, '/ws1', 'unknown')).toBe('missing');
  });

  it('getFailingWorkspaces returns only failing workspaces', () => {
    expect(getFailingWorkspaces(matrix, 'soc2')).toEqual([]);
    expect(getFailingWorkspaces(matrix, 'hipaa')).toEqual(['/ws1']);
  });

  it('overallComplianceRate computes correctly', () => {
    // 3 applicable cells (soc2:pass, soc2:pass, hipaa:fail), 2 passing
    const rate = overallComplianceRate(matrix);
    expect(rate).toBe(67); // 2/3 = 66.67 → 67
  });

  it('overallComplianceRate returns 100 when no applicable cells', () => {
    const emptyMatrix: ComplianceMatrix = {
      frameworks: ['soc2'],
      rows: [{
        workspace: '/ws',
        classification: 'UNGOVERNED',
        trustTier: null,
        cells: [{ framework: 'soc2', status: 'missing' }],
      }],
    };
    expect(overallComplianceRate(emptyMatrix)).toBe(100);
  });

  it('countByStatus returns all missing for unknown framework', () => {
    const counts = countByStatus(matrix, 'unknown');
    expect(counts).toEqual({ pass: 0, fail: 0, missing: 2 });
  });
});

// ─── 7. generateFleetReport branches ─────────────────────────────────

describe('generateFleetReport', () => {
  it('detects killed workspace via KILL sentinel', async () => {
    const ws = createGoverned('ws-killed', ['soc2']);
    // Write .claws/KILL sentinel to mark as killed (matches kill.ts format)
    writeFileSync(join(ws, '.claws', 'KILL'), JSON.stringify({
      timestamp: '2026-04-01T00:00:00.000Z',
      reason: 'security incident',
      actor: 'test-user',
      killPath: 'sentinel',
    }));

    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    const report = await generateFleetReport(scanResult, tempDir);

    const killedDetail = report.workspaces.find((w) => w.path === ws);
    expect(killedDetail).toBeDefined();
    expect(killedDetail!.killStatus).toBe('killed');
    expect(report.summary.killed).toBe(1);
  });

  it('reads broadcast manifest timestamp', async () => {
    const ws = createGoverned('ws-broadcast', ['soc2']);
    // Write a broadcast manifest
    mkdirSync(join(ws, '.claws', 'fleet'), { recursive: true });
    writeFileSync(join(ws, '.claws', 'fleet', 'broadcast-manifest.json'), JSON.stringify({
      timestamp: '2026-03-15T10:30:00.000Z',
      policyFile: 'soc2.yaml',
      reason: 'test',
      targeted: 1,
      succeeded: 1,
      skippedCount: 0,
      failed: 0,
      results: [],
    }));

    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    const report = await generateFleetReport(scanResult, tempDir);

    const wsDetail = report.workspaces.find((w) => w.path === ws);
    expect(wsDetail).toBeDefined();
    expect(wsDetail!.lastBroadcast).toBe('2026-03-15T10:30:00.000Z');
  });

  it('uses explicit baseline when provided', async () => {
    const ws = createGoverned('ws-baseline', ['soc2']);

    // Establish a baseline
    await establishBaseline(ws, 'prod', tempDir);

    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    const report = await generateFleetReport(scanResult, tempDir, {
      baseline: 'prod',
    });

    // With a matching baseline, governed workspace should be clean
    const wsDetail = report.workspaces.find((w) => w.path === ws);
    expect(wsDetail).toBeDefined();
    expect(wsDetail!.driftStatus).toBe('clean');
    expect(report.summary.driftClean).toBe(1);
  });

  it('auto-detects first available baseline when none specified', async () => {
    const ws = createGoverned('ws-auto-base', ['soc2']);

    // Establish a baseline (will be auto-selected)
    await establishBaseline(ws, 'auto', tempDir);

    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    const report = await generateFleetReport(scanResult, tempDir);

    const wsDetail = report.workspaces.find((w) => w.path === ws);
    expect(wsDetail).toBeDefined();
    // Should use the auto baseline, resulting in clean
    expect(wsDetail!.driftStatus).toBe('clean');
  });

  it('uses explicit frameworks when provided', async () => {
    const ws = createGoverned('ws-fw', ['soc2', 'hipaa']);

    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    const report = await generateFleetReport(scanResult, tempDir, {
      frameworks: ['custom-framework'],
    });

    // Should only have the explicitly provided framework
    expect(report.complianceMatrix.frameworks).toEqual(['custom-framework']);
    // Workspace doesn't have custom-framework, so it's missing
    const row = report.complianceMatrix.rows.find((r) => r.workspace === ws);
    expect(row).toBeDefined();
    expect(row!.cells[0]!.status).toBe('missing');
  });

  it('reads trustTier as null when value is not a number', async () => {
    const ws = createGoverned('ws-bad-tier', ['soc2']);
    writeFileSync(join(ws, 'claws.json'), JSON.stringify({ trustTier: 'invalid' }));

    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    const report = await generateFleetReport(scanResult, tempDir);

    const wsDetail = report.workspaces.find((w) => w.path === ws);
    expect(wsDetail).toBeDefined();
    expect(wsDetail!.trustTier).toBeNull();
  });

  it('handles zero governed workspaces without drift detection', async () => {
    const ungov = join(tempDir, 'ungoverned');
    mkdirSync(ungov, { recursive: true });
    writeFileSync(join(ungov, '.cursorrules'), '# rules');

    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    const report = await generateFleetReport(scanResult, tempDir);

    expect(report.summary.governed).toBe(0);
    expect(report.summary.driftClean).toBe(0);
  });

  it('reads broadcast manifest without timestamp field', async () => {
    const ws = createGoverned('ws-no-ts', ['soc2']);
    mkdirSync(join(ws, '.claws', 'fleet'), { recursive: true });
    writeFileSync(join(ws, '.claws', 'fleet', 'broadcast-manifest.json'), JSON.stringify({
      policyFile: 'soc2.yaml',
      reason: 'test',
    }));

    const scanResult = await scanFleet(tempDir, { maxDepth: 2 });
    const report = await generateFleetReport(scanResult, tempDir);

    const wsDetail = report.workspaces.find((w) => w.path === ws);
    expect(wsDetail).toBeDefined();
    // Should return null when timestamp is missing
    expect(wsDetail!.lastBroadcast).toBeNull();
  });
});
