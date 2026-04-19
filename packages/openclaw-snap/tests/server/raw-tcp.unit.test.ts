/**
 * Raw TCP tests for startServer edge branches:
 *   - Duplicate headers (exercises Array.isArray(v) branch in normalizeHeaders)
 *   - Query string with empty key + empty value fragments (parseUrl branches)
 *   - Whitespace-only body (readBody trim branch)
 */

import { describe, it, expect, afterAll } from 'vitest';
import * as net from 'node:net';
import { startServer } from '../../src/server/startServer.js';
import { inMemoryStore } from '../../src/store/inMemoryStore.js';

const handles: { close: () => Promise<void> }[] = [];
afterAll(async () => { for (const h of handles) await h.close(); });

async function rawRequest(port: number, raw: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const sock = net.createConnection({ host: '127.0.0.1', port });
    const chunks: Buffer[] = [];
    sock.on('data', (c) => chunks.push(c));
    sock.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    sock.on('error', reject);
    sock.on('connect', () => {
      sock.write(raw);
    });
  });
}

describe('startServer — raw TCP branches', () => {
  it('duplicate headers are joined (array → comma branch)', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    const raw = [
      'GET /v1/healthz HTTP/1.1',
      `Host: 127.0.0.1:${String(handle.port)}`,
      'X-Multi: one',
      'X-Multi: two',
      'Connection: close',
      '',
      '',
    ].join('\r\n');
    const response = await rawRequest(handle.port, raw);
    expect(response).toContain('200 OK');
  });

  it('query with empty key fragment is tolerated (parseUrl branch)', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    const raw = [
      'GET /v1/snapshots?&limit=3 HTTP/1.1',
      `Host: 127.0.0.1:${String(handle.port)}`,
      'Connection: close',
      '',
      '',
    ].join('\r\n');
    const response = await rawRequest(handle.port, raw);
    expect(response).toContain('200 OK');
  });

  it('whitespace-only body is treated as empty (readBody trim branch)', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    const body = '   \n\t';
    const raw = [
      'POST /v1/snapshots HTTP/1.1',
      `Host: 127.0.0.1:${String(handle.port)}`,
      'Content-Type: application/json',
      'Idempotency-Key: k',
      `Content-Length: ${String(Buffer.byteLength(body, 'utf8'))}`,
      'Connection: close',
      '',
      body,
    ].join('\r\n');
    const response = await rawRequest(handle.port, raw);
    // body treated as undefined → handleUpload rejects with 400 (body not an object)
    expect(response).toContain('400');
  });

  it('chunked upload exercises multi-chunk readBody path', async () => {
    const store = inMemoryStore();
    const handle = await startServer({ port: 0, store });
    handles.push(handle);
    const payload = JSON.stringify({ files: { 'SOUL.md': 'x' } });
    return new Promise<void>((resolve, reject) => {
      const sock = net.createConnection({ host: '127.0.0.1', port: handle.port });
      const chunks: Buffer[] = [];
      sock.on('data', (c) => chunks.push(c));
      sock.on('end', () => {
        const response = Buffer.concat(chunks).toString('utf8');
        try {
          expect(response).toContain('201');
          resolve();
        } catch (e) {
          reject(e as Error);
        }
      });
      sock.on('error', reject);
      sock.on('connect', () => {
        const head = [
          'POST /v1/snapshots HTTP/1.1',
          `Host: 127.0.0.1:${String(handle.port)}`,
          'Content-Type: application/json',
          'Idempotency-Key: k',
          `Content-Length: ${String(Buffer.byteLength(payload, 'utf8'))}`,
          'Connection: close',
          '',
          '',
        ].join('\r\n');
        sock.write(head);
        const half = Math.floor(payload.length / 2);
        sock.write(payload.slice(0, half));
        setTimeout(() => sock.end(payload.slice(half)), 20);
      });
    });
  });
});
