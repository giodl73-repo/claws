/**
 * L3 acceptance test for S01 — /api/chunks/connections with multi-server
 * TOOLS.md and R5 enforcement.
 *
 * Walks the full scenario:
 *   1. A workspace declaring tools across 4 MCP servers.
 *   2. One critical tool (delete_site) that must always be R5-locked.
 *   3. GET /api/chunks/connections returns a chunk per server with
 *      per-tool risk, obo, approvalRequired, approvalSource, lock, and
 *      per-server summary math matching CL-10 spec example.
 *
 * The assertions mirror the CL-10 §"Chunk Format" ConnectionsData
 * example so a partner rendering this payload sees the same shape the
 * spec guarantees.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Chunk, ConnectionsData } from '@bic/claws-sdk/workspace';
import { createApp, type ServerState } from '../../src/server.js';
import {
  governanceIRMultiServer,
  MULTI_SERVER_TOOLS_MD,
} from '../fixtures/governance-ir-multi-server.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL = '# Soul\n\nEnterprise assistant.\n\n## Purpose\n\n- enforce governance\n';
const IDENTITY = '# Identity\n\n## Organization\n\n- Organization: BIC\n- Team: Platform\n';

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function get(
  server: Server,
  path: string,
): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunks-conn-accept-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
  await writeFile(join(root, 'IDENTITY.md'), IDENTITY, 'utf-8');
  await writeFile(join(root, 'TOOLS.md'), MULTI_SERVER_TOOLS_MD, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('S01 — multi-server connections with R5 enforcement', () => {
  it('returns correctly grouped connections chunks matching CL-10 spec', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => governanceIRMultiServer(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);

    const res = await get(server, '/api/chunks/connections');
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body) as { chunks: Chunk<'connections'>[] };

    // Grouping: one chunk per IR server, names present and stable.
    const byServer = new Map(body.chunks.map((c) => [c.data.server, c]));
    expect([...byServer.keys()].sort()).toEqual([
      'local',
      'outlook',
      'sharepoint',
      'teams',
    ]);

    // Shape: every chunk carries the CL-10 ConnectionsData fields.
    for (const chunk of body.chunks) {
      expect(chunk.tab).toBe('connections');
      expect(typeof chunk.section).toBe('string');
      const data = chunk.data as ConnectionsData;
      expect(typeof data.server).toBe('string');
      expect(typeof data.name).toBe('string');
      expect(Array.isArray(data.tools)).toBe(true);
      expect(typeof data.summary.total).toBe('number');
      expect(typeof data.summary.enabled).toBe('number');
      expect(typeof data.summary.gated).toBe('number');
      expect(typeof data.summary.r5Count).toBe('number');
      expect(chunk.writeBack).toEqual({
        method: 'PATCH',
        url: `/api/chunks/connections/${encodeURIComponent(data.server)}`,
      });
      // Every tool entry includes CL-10 governance fields.
      for (const tool of data.tools) {
        expect(typeof tool.tool).toBe('string');
        expect(typeof tool.enabled).toBe('boolean');
        expect(typeof tool.risk.level).toBe('number');
        expect(typeof tool.risk.capability).toBe('string');
        expect(typeof tool.obo).toBe('boolean');
        expect(typeof tool.approvalRequired).toBe('boolean');
        expect(['compiled', 'fleet-override', 'admin']).toContain(tool.approvalSource);
        expect(['r5', 'fleet', 'governance', 'violation', 'unclassified', 'none'])
          .toContain(tool.lock.source);
        // Summary consistency: R5 tools must always be lock.source=r5.
        if (tool.risk.level === 5) {
          expect(tool.lock.source).toBe('r5');
          expect(tool.approvalRequired).toBe(true);
        }
      }
      // Per-server summary math matches the tool array.
      expect(data.summary.total).toBe(data.tools.length);
      expect(data.summary.enabled).toBe(data.tools.filter((t) => t.enabled).length);
      expect(data.summary.gated).toBe(
        data.tools.filter((t) => t.approvalRequired).length,
      );
      expect(data.summary.r5Count).toBe(
        data.tools.filter((t) => t.risk.level === 5).length,
      );
    }

    // R5 enforcement spot check — sharepoint contains delete_site.
    const sharepoint = byServer.get('sharepoint')!.data as ConnectionsData;
    const deleteSite = sharepoint.tools.find((t) => t.tool === 'delete_site')!;
    expect(deleteSite.risk.level).toBe(5);
    expect(deleteSite.lock.source).toBe('r5');
    expect(sharepoint.summary.r5Count).toBe(1);
  });
});
