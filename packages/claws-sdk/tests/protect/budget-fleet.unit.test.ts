/**
 * L0: PROTECT budget-fleet — aggregation logic, sorting, empty fleet handling,
 * and the budgetFleet() function via mocked fleet scan / budget reads.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aggregateFleetBudget, budgetFleet } from '../../src/protect/budget-fleet.js';
import type { WorkspaceBudgetEntry } from '../../src/protect/types.js';

// Mock fleet scan and runner
vi.mock('../../src/fleet/scan.js', () => ({
  scanFleet: vi.fn().mockResolvedValue({ workspaces: [], scanTime: 0, config: {} }),
}));

vi.mock('../../src/fleet/runner.js', () => ({
  runParallel: vi.fn().mockImplementation(
    async (items: Array<{ path: string }>, fn: (item: { path: string }) => Promise<unknown>) => {
      const results: unknown[] = [];
      const errors: Array<{ path: string; error: string }> = [];
      for (const item of items) {
        try {
          results.push(await fn(item));
        } catch (err) {
          errors.push({ path: item.path, error: String(err) });
        }
      }
      return { results, errors };
    },
  ),
}));

vi.mock('../../src/protect/budget.js', () => ({
  budget: vi.fn().mockResolvedValue({
    report: { tokenCount: 0, limit: 0, percentage: 0, period: 'monthly' },
    alerts: [],
    enforcement: [],
  }),
}));

const { scanFleet } = await import('../../src/fleet/scan.js');
const { runParallel } = await import('../../src/fleet/runner.js');
const { budget: budgetFn } = await import('../../src/protect/budget.js');

const mockedScanFleet = vi.mocked(scanFleet);
const mockedRunParallel = vi.mocked(runParallel);
const mockedBudget = vi.mocked(budgetFn);

function entry(path: string, tokenCount: number, limit: number, percentage: number, period: 'daily' | 'monthly' = 'monthly', error?: string): WorkspaceBudgetEntry {
  return {
    workspacePath: `/fleet/${path}`,
    workspaceName: path,
    report: { tokenCount, limit, percentage, period },
    ...(error ? { error } : {}),
  };
}

describe('aggregation logic sums per-workspace tokens correctly', () => {
  it('computes correct total spend from multiple workspace reports', () => {
    const entries: WorkspaceBudgetEntry[] = [
      entry('ws-a', 10_000, 50_000, 20),
      entry('ws-b', 25_000, 50_000, 50),
      entry('ws-c', 45_000, 50_000, 90),
    ];

    const result = aggregateFleetBudget(entries);

    // 10000 + 25000 + 45000 = 80000
    expect(result.totalSpend).toBe(80_000);
    expect(result.workspaces).toHaveLength(3);
  });
});

describe('aggregation with empty workspace list returns zero totals', () => {
  it('returns zero-valued fleet report for empty fleet', () => {
    const result = aggregateFleetBudget([]);

    expect(result.totalSpend).toBe(0);
    expect(result.workspaces).toHaveLength(0);
    expect(result.sortedByUsage).toHaveLength(0);
  });
});

describe('sorting by spend% puts highest first', () => {
  it('returns workspaces sorted by usage percentage descending', () => {
    const entries: WorkspaceBudgetEntry[] = [
      entry('ws-a', 10_000, 50_000, 20),
      entry('ws-b', 45_000, 50_000, 90),
      entry('ws-c', 25_000, 50_000, 50),
    ];

    const result = aggregateFleetBudget(entries);

    // Sorted: 90%, 50%, 20%
    expect(result.sortedByUsage).toHaveLength(3);
    expect(result.sortedByUsage[0]!.report.percentage).toBe(90);
    expect(result.sortedByUsage[1]!.report.percentage).toBe(50);
    expect(result.sortedByUsage[2]!.report.percentage).toBe(20);
  });
});

describe('per-workspace breakdown preserves individual reports', () => {
  it('workspaces array contains exact entries passed in', () => {
    const entries: WorkspaceBudgetEntry[] = [
      entry('ws-a', 5_000, 10_000, 50, 'daily'),
      entry('ws-b', 8_000, 10_000, 80, 'daily'),
    ];

    const result = aggregateFleetBudget(entries);

    // workspaces preserves original order and content
    expect(result.workspaces).toHaveLength(2);
    expect(result.workspaces[0]).toEqual(entries[0]);
    expect(result.workspaces[1]).toEqual(entries[1]);

    // totalSpend is correct
    expect(result.totalSpend).toBe(13_000);

    // sortedByUsage has descending order
    expect(result.sortedByUsage[0]!.report.percentage).toBe(80);
    expect(result.sortedByUsage[1]!.report.percentage).toBe(50);
  });
});

describe('error entries are included but excluded from totalSpend', () => {
  it('totalSpend only counts non-error entries', () => {
    const entries: WorkspaceBudgetEntry[] = [
      entry('ws-ok', 10_000, 50_000, 20),
      entry('ws-fail', 0, 0, 0, 'monthly', 'read failed'),
    ];

    const result = aggregateFleetBudget(entries);

    expect(result.workspaces).toHaveLength(2);
    expect(result.totalSpend).toBe(10_000);
    expect(result.workspaces[1]!.error).toBe('read failed');
  });
});

// ── budgetFleet() function tests (mocked I/O) ─────────────────────────

describe('budgetFleet() with mocked fleet scan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedScanFleet.mockResolvedValue({ workspaces: [], scanTime: 0, config: {} } as never);
    mockedBudget.mockResolvedValue({
      report: { tokenCount: 0, limit: 0, percentage: 0, period: 'monthly' as const },
      alerts: [],
      enforcement: [],
    });
  });

  it('returns empty report when no workspaces discovered', async () => {
    const result = await budgetFleet('/fleet-root');

    expect(result.totalSpend).toBe(0);
    expect(result.workspaces).toHaveLength(0);
    expect(result.sortedByUsage).toHaveLength(0);
    expect(mockedScanFleet).toHaveBeenCalledWith('/fleet-root', undefined);
  });

  it('aggregates results from multiple workspaces via callback', async () => {
    mockedScanFleet.mockResolvedValue({
      workspaces: [
        { path: '/fleet-root/ws-a', marker: '.claws' },
        { path: '/fleet-root/ws-b', marker: '.claws' },
      ],
      scanTime: 50,
      config: {},
    } as never);

    // Mock budget() to return different values per workspace path
    mockedBudget.mockImplementation(async (wsPath: string) => {
      if (wsPath === '/fleet-root/ws-a') {
        return {
          report: { tokenCount: 10_000, limit: 50_000, percentage: 20, period: 'monthly' as const },
          alerts: [],
          enforcement: [],
        };
      }
      return {
        report: { tokenCount: 40_000, limit: 50_000, percentage: 80, period: 'monthly' as const },
        alerts: [],
        enforcement: [],
      };
    });

    const result = await budgetFleet('/fleet-root');

    expect(result.totalSpend).toBe(50_000);
    expect(result.workspaces).toHaveLength(2);
    expect(result.sortedByUsage[0]!.report.percentage).toBe(80);
    expect(result.sortedByUsage[1]!.report.percentage).toBe(20);
    // Verify basename extraction
    expect(result.workspaces[0]!.workspaceName).toBe('ws-a');
    expect(result.workspaces[1]!.workspaceName).toBe('ws-b');
  });

  it('includes error entries from failed workspace budget reads', async () => {
    mockedScanFleet.mockResolvedValue({
      workspaces: [
        { path: '/fleet-root/ws-ok', marker: '.claws' },
        { path: '/fleet-root/ws-bad', marker: '.claws' },
      ],
      scanTime: 30,
      config: {},
    } as never);

    // Make budget() throw for ws-bad so runParallel captures the error
    mockedBudget.mockImplementation(async (wsPath: string) => {
      if (wsPath === '/fleet-root/ws-bad') {
        throw new Error('permission denied');
      }
      return {
        report: { tokenCount: 5_000, limit: 50_000, percentage: 10, period: 'monthly' as const },
        alerts: [],
        enforcement: [],
      };
    });

    const result = await budgetFleet('/fleet-root');

    expect(result.workspaces).toHaveLength(2);
    expect(result.totalSpend).toBe(5_000);
    const errorWs = result.workspaces.find((w) => w.error);
    expect(errorWs).toBeDefined();
    expect(errorWs!.error).toContain('permission denied');
    expect(errorWs!.workspaceName).toBe('ws-bad');
    expect(errorWs!.report.tokenCount).toBe(0);
  });

  it('passes scan config overrides to scanFleet', async () => {
    mockedScanFleet.mockResolvedValue({ workspaces: [], scanTime: 0, config: {} } as never);

    await budgetFleet('/fleet-root', { maxDepth: 3 });

    expect(mockedScanFleet).toHaveBeenCalledWith('/fleet-root', { maxDepth: 3 });
  });
});
