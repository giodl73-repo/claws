/**
 * L3 acceptance — scenario S02/S16 verification.
 *
 * S02 (discovery): a CAP partner calls GET /api/oc/ and learns the full
 * chunk topology without prior knowledge of the workspace layout.
 *
 * S16 (partial workspace): the TUI must skip screens whose backing file
 * is missing; missing files surface as `exists: false`, never 404.
 *
 * Enforces the acceptance contract from pulse 64.
 *
 * CAP subsections (Entitlements) live under IDENTITY.md since CP-5 M01.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import { createApp, type ServerState } from '../../src/server.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
interface SchemaFile {
  name: string;
  exists: boolean;
  sections: Array<{ heading: string; chunk?: { tab: string; section: string }; editable: boolean }>;
  hasViolation: boolean;
}

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

function port(server: Server): number {
  const addr = server.address();
  if (addr === null || typeof addr === 'string') throw new Error('no addr');
  return addr.port;
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ws-schema-accept-'));
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('S02/S16 acceptance — workspace schema', () => {
  it('discovery response lets a partner enumerate chunks for present files and skip missing ones', async () => {
    // Partial workspace: SOUL + TOOLS + IDENTITY (with §Entitlements) only;
    // the rest absent.
    await writeFile(join(root, 'SOUL.md'), '## Purpose\n\n- p\n');
    await writeFile(join(root, 'TOOLS.md'), '## bash\n\nShell.\n');
    await writeFile(
      join(root, 'IDENTITY.md'),
      '## Entitlements\n\n### Paid tier\n\n- gpt\n',
    );

    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const compileFn = async (): Promise<GovernanceIR> => minimalGovernanceIR();
    const app = createApp(state, { compileFn, trustSigningKey: TEST_TRUST_SIGNING_KEY, workspaceRoot: root });
    server = await listenApp(app);
    const res = await fetch(`http://127.0.0.1:${String(port(server))}/api/oc/`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { files: SchemaFile[] };

    const byName = new Map(body.files.map((f) => [f.name, f]));

    // S02: present files expose chunk endpoints the partner can call.
    const tools = byName.get('TOOLS.md')!;
    expect(tools.exists).toBe(true);
    expect(tools.sections[0]!.chunk).toEqual({ tab: 'connections', section: 'bash' });
    expect(tools.sections[0]!.editable).toBe(true);

    const identity = byName.get('IDENTITY.md')!;
    expect(identity.exists).toBe(true);
    const ent = identity.sections.find((s) => s.heading === 'Entitlements')!;
    expect(ent.chunk).toEqual({ tab: 'entitlements', section: 'grants' });
    // Entitlements are read-only — partners must not issue PATCH here.
    expect(ent.editable).toBe(false);

    // S16: missing files let the TUI skip screens — exists=false, sections=[],
    // chunk mappings omitted, no 404.
    const heartbeat = byName.get('HEARTBEAT.md')!;
    expect(heartbeat.exists).toBe(false);
    expect(heartbeat.sections).toEqual([]);

    const memory = byName.get('MEMORY.md')!;
    expect(memory.exists).toBe(false);

    const agents = byName.get('AGENTS.md')!;
    expect(agents.exists).toBe(false);
  });
});
