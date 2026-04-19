/**
 * L1 integration — server ↔ store, full HTTP request/response cycle.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { startServer } from '../../src/server/startServer.js';
import { inMemoryStore } from '../../src/store/inMemoryStore.js';

const handles: { close: () => Promise<void> }[] = [];

afterAll(async () => {
  for (const h of handles) await h.close();
});

describe('server ↔ store — full HTTP roundtrip', () => {
  it('upload → get over real HTTP socket', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store, promotionRequirePolicy: false });
    handles.push(handle);
    const uploadRes = await fetch(`${handle.url}/v1/snapshots`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'idempotency-key': 'k-1' },
      body: JSON.stringify({ files: { 'SOUL.md': '# soul' } }),
    });
    expect(uploadRes.status).toBe(201);
    const upload = await uploadRes.json() as { id: string };
    const getRes = await fetch(`${handle.url}/v1/snapshots/${upload.id}`);
    expect(getRes.status).toBe(200);
    const snap = await getRes.json() as { id: string };
    expect(snap.id).toBe(upload.id);
  });

  it('healthz returns 200 over HTTP', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    const res = await fetch(`${handle.url}/v1/healthz`);
    expect(res.status).toBe(200);
  });
});
