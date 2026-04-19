/**
 * L3 acceptance test for Pulse 26 (scenario S29 data-sensitivity-escalation).
 *
 * S29 covers CONFIDENTIAL/RESTRICTED knowledge source governance — the full
 * scenario also exercises PATCH (write-time G-DATA validation) which
 * belongs in a later pulse. This acceptance test verifies the READ-side
 * prerequisites on which write validation relies:
 *
 *  F01 — sensitivity label surfaced on every knowledge source so the CAP
 *        UI can show the label to the user (no silent INTERNAL fallback).
 *  F03 — per-source labels preserved when multiple sources coexist at
 *        different sensitivity levels.
 *  F07 — governance lock persists on every GET (not just at enable time),
 *        because CAP partners re-fetch on every navigation and must see
 *        the same governance state as the last read.
 *
 * Knowledge sources live under IDENTITY.md §Knowledge Sources since
 * CP-5 M01.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import type { Chunk, MemoryData } from '@bic/claws-sdk/workspace';
import { createApp, type ServerState } from '../../src/server.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function get(server: Server, path: string): Promise<{ status: number; body: string }> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}${path}`);
  return { status: res.status, body: await res.text() };
}

async function primeCompile(server: Server): Promise<void> {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  const res = await fetch(`http://127.0.0.1:${String(addr.port)}/compile`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  if (res.status !== 200) throw new Error(`compile failed: ${String(res.status)}`);
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'chunks-mge-acc-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('S29 acceptance — memory chunk data-sensitivity governance surface', () => {
  it('preserves per-source data labels and governance locks across repeated GETs (F01, F03, F07)', async () => {
    await writeFile(join(root, 'SOUL.md'), '# Soul\nPreamble.\n');
    await writeFile(
      join(root, 'IDENTITY.md'),
      [
        '## Knowledge Sources',
        '',
        '### Public Handbook',
        '',
        '- public url',
        '',
        '### Internal Runbooks',
        '',
        '- runbook entries',
        '',
        '### Confidential HR SharePoint',
        '',
        '- personnel records',
        '',
        '### Restricted Exec Financials',
        '',
        '- restricted quarterly data',
        '',
      ].join('\n'),
    );

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root, noWs: true });
    server = await listenApp(app);
    await primeCompile(server);

    // First GET — verify per-source labels and locks (F01, F03).
    const first = await get(server, '/api/chunks/memory');
    expect(first.status).toBe(200);
    const firstData = (JSON.parse(first.body) as Chunk<'memory'>).data as MemoryData;
    expect(firstData.knowledgeSources).toHaveLength(4);

    const labels = firstData.knowledgeSources.map((s) => s.dataLabel);
    expect(labels).toEqual(['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED']);

    const lockSources = firstData.knowledgeSources.map((s) => s.lock.source);
    expect(lockSources).toEqual(['none', 'none', 'governance', 'governance']);

    // Second GET — governance state must persist verbatim (F07).
    const second = await get(server, '/api/chunks/memory');
    expect(second.status).toBe(200);
    const secondData = (JSON.parse(second.body) as Chunk<'memory'>).data as MemoryData;
    expect(secondData.knowledgeSources.map((s) => s.dataLabel)).toEqual(labels);
    expect(secondData.knowledgeSources.map((s) => s.lock.source)).toEqual(lockSources);
  });
});
