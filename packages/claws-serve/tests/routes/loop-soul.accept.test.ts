/**
 * L3 acceptance tests for pulse 35 (loop-soul-sync).
 *
 * - S09: Loop sync renders SOUL.md sections correctly
 * - S10: governance locks prevent Loop edits to protected sections
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Server } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GovernanceIR } from '@bic/claws-sdk';
import type { SoulSectionView } from '@bic/claws-sdk/workspace';
import { createApp, type ServerState } from '../../src/server.js';
import { minimalGovernanceIR } from '../fixtures/governance-ir.js';

import { TEST_TRUST_SIGNING_KEY } from '../fixtures/trust-key.js';
const SOUL =
  '# Soul\n\n## Purpose\n\nWrite with care.\n\n## Values\n\n- Integrity\n- Curiosity\n\n## Commitments\n\n- No harm.\n';

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'loop-soul-accept-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('S09 — Loop sync renders SOUL.md sections correctly', () => {
  it('returns every H2 section as a typed card with stable ids in document order', async () => {
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => minimalGovernanceIR(),
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);
    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('no addr');
    const res = await fetch(
      `http://127.0.0.1:${String(addr.port)}/api/oc/SOUL.md?view=loop`,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      file: 'SOUL.md';
      sections: readonly SoulSectionView[];
    };
    expect(body.sections.map((s) => s.id)).toEqual(['purpose', 'values', 'commitments']);
    expect(body.sections.map((s) => s.heading)).toEqual([
      'Purpose',
      'Values',
      'Commitments',
    ]);
    for (const section of body.sections) {
      expect(section.governanceContext.lockSource).toBe('none');
      expect(section.governanceContext.denyRuleCount).toBe(0);
    }
  });
});

describe('S10 — governance locks prevent Loop edits to protected sections', () => {
  it('rejects PATCH on an R5-locked section and leaves the file unchanged', async () => {
    const ir: GovernanceIR = {
      ...minimalGovernanceIR(),
      intents: [
        {
          kind: 'deny',
          id: 'deny:soul-values',
          ruleId: 'R-LOCAL-CRIT',
          level: 5,
          description: 'critical lock',
          target: 'SOUL.values',
          reason: 'R5 pin',
        },
      ],
    };
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => ir,
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);
    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('no addr');
    const base = `http://127.0.0.1:${String(addr.port)}`;

    const payload = JSON.stringify({
      sectionId: 'values',
      content: '\n- Overwritten.\n',
    });
    const patchRes = await fetch(`${base}/api/oc/SOUL.md`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(payload, 'utf-8')),
      },
      body: payload,
    });
    expect(patchRes.status).toBe(403);
    const errorBody = (await patchRes.json()) as { error: { code: string; lockSource: string } };
    expect(errorBody.error.code).toBe('SOUL_SECTION_LOCKED');
    expect(errorBody.error.lockSource).toBe('r5');

    const onDisk = await readFile(join(root, 'SOUL.md'), 'utf-8');
    expect(onDisk).toBe(SOUL);
  });
});
