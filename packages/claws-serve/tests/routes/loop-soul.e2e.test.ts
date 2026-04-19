/**
 * L2 e2e test for the full /api/oc/SOUL.md Loop sync round-trip (pulse 35).
 *
 * Exercises PATCH → validate → write → compile → GET:
 *   1. Start with a SOUL.md containing two sections
 *   2. PATCH one section via the Loop endpoint (unlocked)
 *   3. GET with ?view=loop returns the freshly-written bytes with
 *      governance context matching the post-patch IR
 *   4. The raw file on disk reassembles losslessly for the untouched
 *      section
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
  '# Soul\n\n## Purpose\n\nWrite clearly.\n\n## Values\n\n- Integrity\n- Kindness\n';

async function listenApp(app: ReturnType<typeof createApp>): Promise<Server> {
  return new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
}

let root: string;
let server: Server | undefined;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'loop-soul-e2e-'));
  await writeFile(join(root, 'SOUL.md'), SOUL, 'utf-8');
});

afterEach(async () => {
  server?.close();
  server = undefined;
  await rm(root, { recursive: true, force: true });
});

describe('loop-soul — L2 e2e', () => {
  it('PATCH → validate → write → compile → GET round-trip preserves untouched section bytes', async () => {
    // The compile function evolves between invocations so we can observe
    // whether the PATCH genuinely triggered a recompile: the first call
    // returns an empty intent set; subsequent calls return a deny for
    // `SOUL.purpose` so GET after PATCH surfaces the new governance
    // context without a server restart.
    let compileCall = 0;
    const ir0: GovernanceIR = { ...minimalGovernanceIR(), intents: [] };
    const ir1: GovernanceIR = {
      ...minimalGovernanceIR(),
      intents: [
        {
          kind: 'deny',
          id: 'deny:soul-purpose',
          ruleId: 'G-SOUL-01',
          level: 3,
          description: 'post-patch pin',
          target: 'SOUL.purpose',
          reason: 'post-patch',
        },
      ],
    };
    const state: ServerState = { startedAt: Date.now(), compileCount: 0 };
    const app = createApp(state, {
      compileFn: async () => {
        compileCall += 1;
        return compileCall === 1 ? ir0 : ir1;
      },
      trustSigningKey: TEST_TRUST_SIGNING_KEY,
      workspaceRoot: root,
    });
    server = await listenApp(app);
    const addr = server.address();
    if (addr === null || typeof addr === 'string') throw new Error('no addr');
    const base = `http://127.0.0.1:${String(addr.port)}`;

    // 1) PATCH the unlocked `values` section.
    const patchPayload = JSON.stringify({
      sectionId: 'values',
      content: '\n- Integrity\n- Courage\n',
    });
    const patchRes = await fetch(`${base}/api/oc/SOUL.md`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(Buffer.byteLength(patchPayload, 'utf-8')),
      },
      body: patchPayload,
    });
    expect(patchRes.status).toBe(200);

    // 2) Disk reflects the write; the untouched `purpose` section retains
    //    its original bytes byte-for-byte.
    const onDisk = await readFile(join(root, 'SOUL.md'), 'utf-8');
    expect(onDisk).toBe(
      '# Soul\n\n## Purpose\n\nWrite clearly.\n\n## Values\n\n- Integrity\n- Courage\n',
    );

    // 3) GET picks up the post-patch governance context — the recompile
    //    between PATCH and GET surfaces the new deny on `purpose`.
    const getRes = await fetch(`${base}/api/oc/SOUL.md?view=loop`);
    expect(getRes.status).toBe(200);
    const body = (await getRes.json()) as {
      file: 'SOUL.md';
      sections: readonly SoulSectionView[];
    };
    const values = body.sections.find((s) => s.id === 'values')!;
    expect(values.content).toBe('\n- Integrity\n- Courage\n');
    const purpose = body.sections.find((s) => s.id === 'purpose')!;
    expect(purpose.governanceContext.denyRuleCount).toBeGreaterThan(0);
    expect(purpose.governanceContext.compilerInjected).toBe(true);
  });
});
