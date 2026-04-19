/**
 * L2 e2e tests for GET /api/diff.
 *
 * 1. Two PATCH-like operations land in the version-store → diff shows
 *    both changes with oc:// paths and correct summary counts.
 * 2. `claws snap save` writes a pre-upgrade snapshot → diff between the
 *    snapshot and the live state after an upgrade shows the risk
 *    reclassification with version metadata.
 */

import express, { type Request, type Response } from 'express';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GovernanceIR } from '@bic/claws-sdk';
import { VersionStore } from '@bic/claws-sdk/workspace';
import { save as saveSnapshot } from '@bic/claws-sdk/snapshot';
import { CompilationHost } from '../../src/compilation-host.js';
import { diffRouter } from '../../src/routes/diff.js';

function buildIR(tag: string, tools: GovernanceIR['capabilities']['tools']): GovernanceIR {
  return {
    capabilities: { tools, skills: [], agents: [], workflows: [] },
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
      compiledAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };
}

interface Harness {
  server: Server;
  port: number;
  root: string;
  store: VersionStore;
  host: CompilationHost;
  currentIR: () => GovernanceIR;
  setCurrent: (ir: GovernanceIR) => void;
  patch: (file: string, newIR: GovernanceIR) => Promise<number>;
  close: () => Promise<void>;
}

async function buildHarness(): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), 'diff-e2e-'));
  const store = new VersionStore();

  let liveIR = buildIR('initial', [
    {
      name: 'send-email',
      description: 'send email',
      riskLevel: 'medium',
      oboFlag: false,
      classification: 'communication',
    },
  ]);
  let liveVersion = 0;
  store.record({
    version: liveVersion,
    compiledAt: liveIR.compiler.compiledAt,
    fileHashes: { 'TOOLS.md': `hash-${String(liveVersion)}` },
    governanceIR: liveIR,
  });

  const host = new CompilationHost(async () => liveIR, root);
  // Warm the host's cache so `current` resolves immediately.
  await host.compile();

  const app = express();
  app.use(express.json());
  app.use(
    '/api',
    diffRouter(host, {
      resolver: { store, workspaceRoot: root },
    }),
  );

  // Simulated PATCH — advances the version, records a new IR, warms the
  // cache. Mirrors the pulse-70 e2e harness so both tests have the same
  // shape and behaviour.
  app.patch('/api/oc/:file', async (req: Request, res: Response) => {
    const body = req.body as { ir?: GovernanceIR } | undefined;
    if (body?.ir === undefined) {
      res.status(400).json({ error: 'missing ir' });
      return;
    }
    liveVersion += 1;
    liveIR = body.ir;
    const fileName = req.params['file'] ?? 'TOOLS.md';
    store.record({
      version: liveVersion,
      compiledAt: liveIR.compiler.compiledAt,
      fileHashes: { [fileName]: `hash-${String(liveVersion)}` },
      governanceIR: liveIR,
    });
    await host.compile();
    res.status(200).json({ version: liveVersion });
  });

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address();
  if (addr === null || typeof addr === 'string') {
    throw new Error('server did not bind');
  }

  const patch = async (file: string, newIR: GovernanceIR): Promise<number> => {
    const res = await fetch(`http://127.0.0.1:${String(addr.port)}/api/oc/${file}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ir: newIR }),
    });
    const data = (await res.json()) as { version: number };
    return data.version;
  };

  return {
    server,
    port: addr.port,
    root,
    store,
    host,
    currentIR: () => liveIR,
    setCurrent: (ir) => {
      liveIR = ir;
    },
    patch,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    },
  };
}

async function diffRequest(
  port: number,
  from: string,
  to: string,
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(
    `http://127.0.0.1:${String(port)}/api/diff?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  return { status: res.status, body: (await res.json()) as unknown };
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

describe('GET /api/diff — L2 e2e', () => {
  it('1. two PATCHes → diff between v0 and v2 shows both changes', async () => {
    const h = harness!;

    const v1IR = buildIR('after-add', [
      {
        name: 'send-email',
        description: 'send email',
        riskLevel: 'medium',
        oboFlag: false,
        classification: 'communication',
      },
      {
        name: 'write-file',
        description: 'write to disk',
        riskLevel: 'high',
        oboFlag: false,
        classification: 'filesystem',
      },
    ]);
    const v2IR = buildIR('after-risk-bump', [
      {
        name: 'send-email',
        description: 'send email',
        riskLevel: 'critical',
        oboFlag: true,
        classification: 'communication',
      },
      {
        name: 'write-file',
        description: 'write to disk',
        riskLevel: 'high',
        oboFlag: false,
        classification: 'filesystem',
      },
    ]);
    const v1 = await h.patch('TOOLS.md', v1IR);
    expect(v1).toBe(1);
    const v2 = await h.patch('TOOLS.md', v2IR);
    expect(v2).toBe(2);

    const res = await diffRequest(h.port, 'v0', 'v2');
    expect(res.status).toBe(200);
    const body = res.body as {
      diff: {
        summary: { added: number; modified: number; removed: number; total: number };
        entries: readonly { path: string; type: string; changedAt: number | null }[];
      };
    };
    // v0 → v2: write-file added, send-email riskLevel modified, send-email oboFlag modified.
    expect(body.diff.summary.added).toBe(1);
    expect(body.diff.summary.modified).toBe(2);
    expect(body.diff.summary.total).toBe(3);
    const paths = body.diff.entries.map((e) => e.path);
    expect(paths).toContain('oc://TOOLS.md/tools/write-file');
    expect(paths).toContain('oc://TOOLS.md/tools/send-email/riskLevel');
    expect(paths).toContain('oc://TOOLS.md/tools/send-email/oboFlag');
    // changedAt reflects the `to` side, which is v2.
    for (const e of body.diff.entries) {
      expect(e.changedAt).toBe(2);
    }
  });

  it('2. diff between a pre-upgrade snapshot and current after an upgrade', async () => {
    const h = harness!;

    // Seed a workspace layout the snapshot `save` routine expects.
    await writeFile(join(h.root, 'claws.json'), '{"clawsVersion":"0.0.0"}', 'utf-8');
    await mkdir(join(h.root, '.claws', 'compiled'), { recursive: true });
    const preUpgradeIR = buildIR('pre-upgrade', [
      {
        name: 'send-email',
        description: 'send email',
        riskLevel: 'medium',
        oboFlag: false,
        classification: 'communication',
      },
    ]);
    await writeFile(
      join(h.root, '.claws', 'compiled', 'governance-ir.json'),
      JSON.stringify(preUpgradeIR),
      'utf-8',
    );
    const saved = await saveSnapshot(h.root, 'pre-upgrade');
    expect(saved.fileCount).toBeGreaterThan(0);
    // Sanity-check the snapshot IR is where the resolver expects it.
    const snapIRRaw = await readFile(
      join(
        h.root,
        '.claws',
        'snapshots',
        'pre-upgrade',
        'files',
        '.claws',
        'compiled',
        'governance-ir.json',
      ),
      'utf-8',
    );
    expect(JSON.parse(snapIRRaw)).toEqual(preUpgradeIR);

    // Simulate the upgrade: PATCH adds OBO and recompile bumps risk to critical.
    const postUpgradeIR = buildIR('post-upgrade', [
      {
        name: 'send-email',
        description: 'send email',
        riskLevel: 'critical',
        oboFlag: true,
        classification: 'communication',
      },
    ]);
    await h.patch('TOOLS.md', postUpgradeIR);

    const res = await diffRequest(h.port, 'snap:pre-upgrade', 'current');
    expect(res.status).toBe(200);
    const body = res.body as {
      from: { mode: string; version: number | null };
      to: { mode: string; version: number | null };
      diff: {
        summary: { modified: number; total: number };
        entries: readonly { path: string; type: string; before: unknown; after: unknown }[];
      };
    };
    expect(body.from.mode).toBe('snapshot');
    expect(body.from.version).toBeNull();
    expect(body.to.mode).toBe('current');
    // send-email/riskLevel + send-email/oboFlag — both modified.
    const modifiedPaths = body.diff.entries
      .filter((e) => e.type === 'modified')
      .map((e) => e.path);
    expect(modifiedPaths).toContain('oc://TOOLS.md/tools/send-email/riskLevel');
    expect(modifiedPaths).toContain('oc://TOOLS.md/tools/send-email/oboFlag');
    const riskEntry = body.diff.entries.find(
      (e) => e.path === 'oc://TOOLS.md/tools/send-email/riskLevel',
    );
    expect(riskEntry?.before).toBe('medium');
    expect(riskEntry?.after).toBe('critical');
  });
});
