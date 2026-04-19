/**
 * L2 e2e tests for auto-snapshot on external writes.
 *
 * Exercises the full pipeline: file-watcher event → integrity check →
 * invokeAutoSnapshotHook → recompile/advance version → GET ?at=auto:<ts>
 * serves the pre-edit IR → diff shows the change that triggered it.
 *
 * Two scenarios match the pulse:
 * 1. External file edit → snapshot captures pre-edit IR → GET ?at=auto:<ts>
 *    + GET /api/diff?from=auto:<ts>&to=current shows the delta.
 * 2. OC runtime installs a skill → snapshot captures the pre-install IR →
 *    the admin can diff the pre/post IR and verify the rollback target.
 */

import express, { type Request, type Response } from 'express';
import type { Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GovernanceIR } from '@bic/claws-sdk';
import {
  AutoSnapshotManager,
  VersionStore,
  invokeAutoSnapshotHook,
} from '@bic/claws-sdk/workspace';
import {
  GOVERNANCE_VERSION_HEADER,
  timeTravelMiddleware,
} from '../../src/middleware/time-travel.js';

function buildIR(tag: string, compiledAt: string, skillIds: string[] = []): GovernanceIR {
  return {
    capabilities: {
      tools: [],
      skills: skillIds.map((name) => ({
        name,
        description: `skill ${name}`,
        requiredTools: [],
        governanceLevel: 2 as const,
      })),
      agents: [],
      workflows: [],
    },
    analysis: {
      violations: [],
      warnings: [],
      enforcementPlan: {
        blockedTools: [],
        requiredApprovals: [],
        auditOnlyRules: [],
        channelRedactions: [],
        ruleSuppressions: [],
      },
      reclassificationTable: [],
      effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
    },
    intents: [],
    delegationMap: [],
    conflicts: {
      oboConflicts: [],
      multiConstraintConflicts: [],
      haltReason: null,
      hasOboWithoutElicit: false,
      totalConflicts: 0,
    },
    compiler: {
      compilerVersion: `0.0.0-${tag}`,
      compiledAt,
      schemaVersion: 1,
    },
  };
}

interface Harness {
  server: Server;
  port: number;
  root: string;
  store: VersionStore;
  autoSnapshots: AutoSnapshotManager;
  liveVersion: () => number;
  liveIR: () => GovernanceIR;
  simulateExternalEdit: (tag: string, skills: string[], trigger: 'external_edit' | 'oc_runtime' | 'onedrive_sync') => Promise<{ snapshotAt: string }>;
  close: () => Promise<void>;
}

async function buildHarness(): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), 'auto-snapshot-e2e-'));
  const store = new VersionStore();
  const autoSnapshots = new AutoSnapshotManager();
  let liveVersion = 0;
  let liveIR = buildIR('initial', '2026-04-17T09:00:00.000Z', []);
  store.record({
    version: liveVersion,
    compiledAt: liveIR.compiler.compiledAt,
    fileHashes: { 'SOUL.md': 'h0' },
    governanceIR: liveIR,
  });

  const app = express();
  app.use(express.json());
  const middleware = timeTravelMiddleware({
    resolver: { store, workspaceRoot: root, autoSnapshots },
  });

  app.get('/api/oc/:file', middleware, (_req: Request, res: Response) => {
    res.status(200).json({ live: true, version: liveVersion, governanceIR: liveIR });
  });

  // Thin /api/diff route that compares two resolved IRs by skill-id set.
  app.get('/api/diff', async (req: Request, res: Response): Promise<void> => {
    const fromRaw = typeof req.query['from'] === 'string' ? req.query['from'] : undefined;
    const toRaw = typeof req.query['to'] === 'string' ? req.query['to'] : undefined;
    if (fromRaw === undefined || toRaw === undefined) {
      res.status(400).json({ error: { code: 'DIFF_MISSING_PARAMS' } });
      return;
    }

    const { parseAt, resolveAt } = await import('@bic/claws-sdk/workspace');

    async function resolve(raw: string): Promise<GovernanceIR | null> {
      if (raw === 'current') return liveIR;
      const parsed = parseAt(raw);
      if (!parsed.ok) return null;
      const result = await resolveAt(parsed.parsed, {
        store,
        workspaceRoot: root,
        autoSnapshots,
      });
      return result.ok ? result.resolved.governanceIR : null;
    }

    const fromIR = await resolve(fromRaw);
    const toIR = await resolve(toRaw);
    if (fromIR === null || toIR === null) {
      res.status(404).json({ error: { code: 'DIFF_RESOLVE_FAILED' } });
      return;
    }
    const fromSkills = new Set(fromIR.capabilities.skills.map((s) => s.name));
    const toSkills = new Set(toIR.capabilities.skills.map((s) => s.name));
    const added = [...toSkills].filter((id) => !fromSkills.has(id));
    const removed = [...fromSkills].filter((id) => !toSkills.has(id));
    res.status(200).json({ added, removed });
  });

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('server did not bind to TCP');
  }

  const simulateExternalEdit = async (
    tag: string,
    skills: string[],
    trigger: 'external_edit' | 'oc_runtime' | 'onedrive_sync',
  ): Promise<{ snapshotAt: string }> => {
    // 1. Auto-snapshot the PREVIOUS state before the recompile.
    const snapshotAt = new Date(
      Date.parse(liveIR.compiler.compiledAt) + 30_000,
    ).toISOString();
    await invokeAutoSnapshotHook({
      previousState: {
        version: liveVersion,
        governanceIrHash: `ir-hash-${String(liveVersion)}`,
        fileHashes: { 'SOUL.md': `h${String(liveVersion)}` },
      },
      trigger,
      integrityCheck: async () => true,
      manager: autoSnapshots,
      now: () => new Date(snapshotAt),
    });
    // 2. Advance the version + live IR.
    liveVersion += 1;
    const compiledAt = new Date(Date.parse(snapshotAt) + 30_000).toISOString();
    liveIR = buildIR(tag, compiledAt, skills);
    store.record({
      version: liveVersion,
      compiledAt,
      fileHashes: { 'SOUL.md': `h${String(liveVersion)}` },
      governanceIR: liveIR,
    });
    return { snapshotAt };
  };

  return {
    server,
    port: address.port,
    root,
    store,
    autoSnapshots,
    liveVersion: () => liveVersion,
    liveIR: () => liveIR,
    simulateExternalEdit,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    },
  };
}

async function get(
  port: number,
  path: string,
): Promise<{ status: number; headers: Headers; body: unknown }> {
  const res = await fetch(`http://127.0.0.1:${String(port)}${path}`);
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    // leave as string
  }
  return { status: res.status, headers: res.headers, body };
}

let harness: Harness | undefined;

beforeEach(async () => {
  harness = await buildHarness();
});

afterEach(async () => {
  if (harness !== undefined) {
    await harness.close();
    harness = undefined;
  }
});

describe('auto-snapshot — L2 e2e', () => {
  it('1. edit file externally → snapshot created → diff shows the change', async () => {
    const h = harness!;
    const { snapshotAt } = await h.simulateExternalEdit(
      'after-edit',
      ['new-skill'],
      'external_edit',
    );

    // Snapshot is queryable via ?at=auto:<ts-after-snapshot>.
    const afterTs = new Date(Date.parse(snapshotAt) + 5_000).toISOString();
    const res = await get(h.port, `/api/oc/SOUL.md?at=auto:${afterTs}`);
    expect(res.status).toBe(200);
    expect(res.headers.get(GOVERNANCE_VERSION_HEADER.toLowerCase())).toBe('0');
    const body = res.body as {
      at: { mode: string; version: number };
      governanceIR: GovernanceIR;
    };
    expect(body.at.mode).toBe('auto');
    expect(body.at.version).toBe(0);
    // Pre-edit IR has no skills.
    expect(body.governanceIR.capabilities.skills).toEqual([]);

    // Diff pre-edit vs current shows the added skill.
    const diffRes = await get(
      h.port,
      `/api/diff?from=auto:${afterTs}&to=current`,
    );
    expect(diffRes.status).toBe(200);
    const diffBody = diffRes.body as { added: string[]; removed: string[] };
    expect(diffBody.added).toEqual(['new-skill']);
    expect(diffBody.removed).toEqual([]);
  });

  it('2. OC runtime install skill → snapshot captures pre-install IR → rollback target is queryable', async () => {
    const h = harness!;
    // Baseline: one skill already installed.
    const first = await h.simulateExternalEdit(
      'baseline',
      ['existing-skill'],
      'external_edit',
    );
    expect(first.snapshotAt).toBeDefined();

    // OC runtime installs `risky-skill` — a second external-write event.
    const { snapshotAt } = await h.simulateExternalEdit(
      'oc-runtime-install',
      ['existing-skill', 'risky-skill'],
      'oc_runtime',
    );

    // The most recent auto-snapshot names the baseline version (1).
    const afterTs = new Date(Date.parse(snapshotAt) + 5_000).toISOString();
    const res = await get(h.port, `/api/oc/SOUL.md?at=auto:${afterTs}`);
    expect(res.status).toBe(200);
    const body = res.body as {
      at: { mode: string; version: number };
      governanceIR: GovernanceIR;
    };
    // Snapshot references version 1 (baseline), not 0 (empty initial).
    expect(body.at.version).toBe(1);
    expect(
      body.governanceIR.capabilities.skills.map((s) => s.name),
    ).toEqual(['existing-skill']);
    // Auto-snapshot was attributed to oc_runtime in the manager.
    const entries = h.autoSnapshots.list();
    const latest = entries[entries.length - 1]!;
    expect(latest.trigger).toBe('oc_runtime');

    // Diff confirms the delta the admin would review before rollback.
    const diffRes = await get(
      h.port,
      `/api/diff?from=auto:${afterTs}&to=current`,
    );
    expect(diffRes.status).toBe(200);
    const diffBody = diffRes.body as { added: string[]; removed: string[] };
    expect(diffBody.added).toEqual(['risky-skill']);
  });
});
