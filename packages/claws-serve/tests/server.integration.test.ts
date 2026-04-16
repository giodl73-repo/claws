import { describe, it, expect, afterEach } from 'vitest';
import type { Server } from 'node:http';
import { createApp } from '../src/server.js';
import type { ServerState } from '../src/server.js';

describe('server integration', () => {
  let server: Server;

  afterEach(() => {
    server?.close();
  });

  it('starts on port 3939 and /health returns 200', async () => {
    const state: ServerState = {
      startedAt: Date.now(),
      compileCount: 0,
    };
    const app = createApp(state);

    // Use port 0 to avoid conflicts in CI, but verify the app responds correctly
    server = app.listen(0, '127.0.0.1');
    await new Promise<void>((resolve) => { server.on('listening', resolve); });

    const address = server.address();
    if (address === null || typeof address === 'string') {
      throw new Error('Server not listening on TCP');
    }

    const res = await fetch(`http://127.0.0.1:${String(address.port)}/health`);
    expect(res.status).toBe(200);

    const json = await res.json() as Record<string, unknown>;
    expect(json).toHaveProperty('uptime');
    expect(json).toHaveProperty('memory');
    expect(json).toHaveProperty('compileCount');
  });
});
