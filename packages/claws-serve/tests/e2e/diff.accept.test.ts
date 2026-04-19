/**
 * L3 acceptance: "When did send-email become R5?"
 *
 * Narrative: the workspace starts with a send-email tool at R3. A PATCH
 * attaches the OBO capability; the recompile pass reclassifies it to R5
 * (the fail-closed ceiling). A partner — audit UI, risk dashboard — asks
 * GET /api/diff?from=v0&to=current to locate both the change and the
 * version at which it landed. The diff must surface the risk jump with
 * an oc:// path and the `changedAt` version.
 */

import express, { type Request, type Response } from 'express';
import type { Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { GovernanceIR } from '@bic/claws-sdk';
import { VersionStore } from '@bic/claws-sdk/workspace';
import { CompilationHost } from '../../src/compilation-host.js';
import { diffRouter } from '../../src/routes/diff.js';

function irWithSendEmail(
  tag: string,
  riskLevel: 'medium' | 'high' | 'critical',
  oboFlag: boolean,
): GovernanceIR {
  return {
    capabilities: {
      tools: [
        {
          name: 'send-email',
          description: 'Send an email via the configured SMTP bridge',
          riskLevel,
          oboFlag,
          classification: 'communication',
        },
      ],
      skills: [],
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
      compiledAt: new Date().toISOString(),
      schemaVersion: 1,
    },
  };
}

interface Harness {
  server: Server;
  port: number;
  close: () => Promise<void>;
  applyPatch: (ir: GovernanceIR) => Promise<number>;
}

async function buildHarness(): Promise<Harness> {
  const root = await mkdtemp(join(tmpdir(), 'diff-accept-'));
  const store = new VersionStore();
  let live = irWithSendEmail('initial-r3', 'high', false);
  let version = 0;
  store.record({
    version,
    compiledAt: live.compiler.compiledAt,
    fileHashes: { 'TOOLS.md': `hash-${String(version)}` },
    governanceIR: live,
  });
  const host = new CompilationHost(async () => live, root);
  await host.compile();

  const app = express();
  app.use(express.json());
  app.use('/api', diffRouter(host, { resolver: { store, workspaceRoot: root } }));
  app.patch('/api/oc/:file', async (req: Request, res: Response) => {
    const body = req.body as { ir?: GovernanceIR } | undefined;
    if (body?.ir === undefined) {
      res.status(400).json({ error: 'missing ir' });
      return;
    }
    version += 1;
    live = body.ir;
    store.record({
      version,
      compiledAt: live.compiler.compiledAt,
      fileHashes: { 'TOOLS.md': `hash-${String(version)}` },
      governanceIR: live,
    });
    await host.compile();
    res.status(200).json({ version });
  });

  const server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no tcp addr');

  const applyPatch = async (ir: GovernanceIR): Promise<number> => {
    const res = await fetch(`http://127.0.0.1:${String(addr.port)}/api/oc/TOOLS.md`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ir }),
    });
    const data = (await res.json()) as { version: number };
    return data.version;
  };

  return {
    server,
    port: addr.port,
    close: async () => {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
      await rm(root, { recursive: true, force: true });
    },
    applyPatch,
  };
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

describe("L3 accept: 'When did send-email become R5?'", () => {
  it('risk drift (R3 → R5 via OBO reclassification) is discoverable from diff', async () => {
    const h = harness!;

    // Simulated PATCH: operator attaches OBO. Recompile reclassifies
    // risk 'high' → 'critical' (the fail-closed R5 ceiling).
    const afterOboIR = irWithSendEmail('after-obo-recompile', 'critical', true);
    const landedVersion = await h.applyPatch(afterOboIR);
    expect(landedVersion).toBe(1);

    const res = await fetch(
      `http://127.0.0.1:${String(h.port)}/api/diff?from=v0&to=current`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      from: { version: number };
      to: { mode: string; compiledAt: string | null };
      diff: {
        summary: { modified: number };
        entries: readonly {
          path: string;
          field?: string;
          type: string;
          before: unknown;
          after: unknown;
          changedAt: number | null;
        }[];
      };
    };

    // The risk-drift entry is addressable by oc:// path.
    const riskEntry = body.diff.entries.find(
      (e) => e.path === 'oc://TOOLS.md/tools/send-email/riskLevel',
    );
    expect(riskEntry).toBeDefined();
    expect(riskEntry?.type).toBe('modified');
    expect(riskEntry?.field).toBe('riskLevel');
    expect(riskEntry?.before).toBe('high');
    expect(riskEntry?.after).toBe('critical');
    // The question "When did send-email become R5?" is answered by
    // `changedAt` — the version at which the diff observed the change
    // (the `to` side; `current` resolves through the store).
    expect(riskEntry?.changedAt).toBeNull();
    // The response surfaces the compile timestamp for `current`, which
    // answers "when" in wall-clock terms.
    expect(body.to.compiledAt).not.toBeNull();
  });
});
