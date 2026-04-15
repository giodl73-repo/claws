/**
 * L0: Fleet report formatter branch coverage.
 *
 * Covers:
 * - colorDrift default case (unknown status)
 * - colorKill default case (unknown status)
 * - colorClassification default case (unknown classification)
 * - csvEscape with special characters
 */

import { describe, it, expect } from 'vitest';
import { formatReport, formatCsv, formatTable } from '../../src/fleet/report-format.js';
import type { FleetReport } from '../../src/fleet/report.js';

function makeReport(overrides: Partial<FleetReport> = {}): FleetReport {
  return {
    timestamp: '2026-04-13T00:00:00Z',
    fleetRoot: '/fleet',
    summary: {
      totalWorkspaces: 1,
      governed: 1,
      ungoverned: 0,
      misconfigured: 0,
      driftClean: 1,
      driftDrifted: 0,
      driftSuppressed: 0,
      driftNoBaseline: 0,
      driftUnknown: 0,
      killed: 0,
    },
    workspaces: [
      {
        path: '/fleet/ws1',
        classification: 'GOVERNED',
        driftStatus: 'clean',
        killStatus: 'active',
        lastBroadcast: null,
        trustTier: 2,
        policyCount: 1,
      },
    ],
    complianceMatrix: {
      frameworks: [],
      rows: [],
    },
    ...overrides,
  };
}

describe('formatReport', () => {
  it('formats as CSV', () => {
    const csv = formatReport(makeReport(), 'csv');
    expect(csv).toContain('Section,Key,Value');
    expect(csv).toContain('/fleet/ws1');
  });

  it('formats as JSON', () => {
    const json = formatReport(makeReport(), 'json');
    const parsed = JSON.parse(json);
    expect(parsed.fleetRoot).toBe('/fleet');
  });

  it('formats as table', () => {
    const table = formatReport(makeReport(), 'table');
    expect(table).toContain('Fleet Compliance Report');
  });
});

describe('formatCsv edge cases', () => {
  it('escapes CSV values with commas', () => {
    const report = makeReport({
      workspaces: [
        {
          path: '/fleet/path,with,commas',
          classification: 'GOVERNED',
          driftStatus: 'clean',
          killStatus: 'active',
          lastBroadcast: '2026-04-13',
          trustTier: 2,
          policyCount: 1,
        },
      ],
    });
    const csv = formatCsv(report);
    // Path with commas should be quoted
    expect(csv).toContain('"/fleet/path,with,commas"');
  });

  it('handles workspace with null trustTier and unknown statuses', () => {
    const report = makeReport({
      workspaces: [
        {
          path: '/fleet/ws2',
          classification: 'UNGOVERNED',
          driftStatus: 'unknown' as any,
          killStatus: 'unknown',
          lastBroadcast: null,
          trustTier: null,
          policyCount: 0,
        },
      ],
    });
    const csv = formatCsv(report);
    expect(csv).toContain('/fleet/ws2');
  });

  it('handles compliance matrix with frameworks', () => {
    const report = makeReport({
      workspaces: [
        {
          path: '/fleet/ws1',
          classification: 'GOVERNED',
          driftStatus: 'drifted',
          killStatus: 'killed',
          lastBroadcast: null,
          trustTier: 3,
          policyCount: 2,
        },
      ],
      complianceMatrix: {
        frameworks: ['soc2', 'hipaa'],
        rows: [
          {
            workspace: '/fleet/ws1',
            classification: 'GOVERNED',
            trustTier: 3,
            cells: [
              { framework: 'soc2', status: 'pass' },
              { framework: 'hipaa', status: 'fail' },
            ],
          },
        ],
      },
    });
    const csv = formatCsv(report);
    expect(csv).toContain('soc2');
    expect(csv).toContain('hipaa');
  });
});

describe('formatTable edge cases', () => {
  it('renders unknown drift status', () => {
    const report = makeReport({
      workspaces: [
        {
          path: '/fleet/ws1',
          classification: 'GOVERNED',
          driftStatus: 'whatnow' as any,
          killStatus: 'whatnow' as any,
          lastBroadcast: null,
          trustTier: null,
          policyCount: 0,
        },
      ],
    });
    const table = formatTable(report);
    expect(table).toContain('unknown');
  });

  it('renders MISCONFIGURED classification', () => {
    const report = makeReport({
      summary: {
        totalWorkspaces: 1, governed: 0, ungoverned: 0, misconfigured: 1,
        driftClean: 0, driftDrifted: 0, driftSuppressed: 0, driftNoBaseline: 0,
        driftUnknown: 1, killed: 1,
      },
      workspaces: [
        {
          path: '/fleet/ws1',
          classification: 'MISCONFIGURED',
          driftStatus: 'suppressed',
          killStatus: 'killed',
          lastBroadcast: null,
          trustTier: 1,
          policyCount: 0,
        },
      ],
    });
    const table = formatTable(report);
    expect(table).toContain('MISCONFIGURED');
    expect(table).toContain('Killed');
  });

  it('renders unknown classification as-is', () => {
    const report = makeReport({
      workspaces: [
        {
          path: '/fleet/ws1',
          classification: 'CUSTOM_CLASSIFICATION',
          driftStatus: 'no-baseline',
          killStatus: 'active',
          lastBroadcast: null,
          trustTier: 2,
          policyCount: 0,
        },
      ],
    });
    const table = formatTable(report);
    expect(table).toContain('CUSTOM_CLASSIFICATION');
  });

  it('renders compliance matrix frameworks', () => {
    const report = makeReport({
      complianceMatrix: {
        frameworks: ['soc2'],
        rows: [
          {
            workspace: '/fleet/ws1',
            classification: 'GOVERNED',
            trustTier: 2,
            cells: [{ framework: 'soc2', status: 'pass' }],
          },
        ],
      },
    });
    const table = formatTable(report);
    expect(table).toContain('Compliance Matrix');
    expect(table).toContain('soc2');
  });

  it('handles missing cell in compliance matrix', () => {
    const report = makeReport({
      complianceMatrix: {
        frameworks: ['soc2', 'hipaa'],
        rows: [
          {
            workspace: '/fleet/ws1',
            classification: 'GOVERNED',
            trustTier: 2,
            cells: [{ framework: 'soc2', status: 'pass' }],
            // hipaa cell is missing
          },
        ],
      },
    });
    const table = formatTable(report);
    // Should show --- for missing cell
    expect(table).toContain('---');
  });
});
