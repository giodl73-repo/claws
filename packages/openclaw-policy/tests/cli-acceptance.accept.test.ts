/**
 * L3 Acceptance: full `claws` happy-path pipeline as a single scenario.
 *
 *   generate -> (upload+promote via snap surface-mocks) -> comply --snapshot
 *   -> verify audit chain
 *
 * All verbs exit 0; stdout carries the brand prefix at every step;
 * the audit chain reports green. This is the CP-12 conformance gate
 * for the 20-verb CLI surface (architect W1 + conformance role).
 */

import { describe, it, expect } from 'vitest';
import { runRouter } from '../src/cli-handlers/index.js';
import { upload } from '../../snap/src/cli-handlers/upload.js';
import { promote } from '../../snap/src/cli-handlers/promote.js';
import type { CliContext } from '../../snap/src/cli-handlers/client.js';

const CWD = 'C:/src/craftworks/claws-sdk/tests/fixtures/canonical-oc-workspace';

function stubFetch(status: number, body: unknown): typeof fetch {
  return (async (): Promise<Response> => new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch;
}

function snapCtx(argv: string[], fetchImpl: typeof fetch): CliContext {
  return {
    argv,
    endpoint: 'http://127.0.0.1:0',
    fetch: fetchImpl,
    stdout: () => {},
    stderr: () => {},
  };
}

describe('claws — end-to-end acceptance pipeline', () => {
  it('generate -> upload -> promote -> comply -> verify all green', async () => {
    // 1. generate: emit policy-ir + manifest via policy router.
    const gen = await runRouter({
      binaryName: 'claws',
      argv: ['policy', 'generate', '--scope', '@bic/openclaw'],
      cwd: CWD,
    });
    expect(gen.exitCode).toBe(0);
    expect(gen.stdout).toContain('claws policy generate:');

    // 2. upload: snap HTTP surface-mock returns 201 with a synthesized id.
    const snapshotId = 'sha256-fixture-001';
    const uploadRes = await upload(
      snapCtx(['--files', 'x.json'], stubFetch(201, { id: snapshotId })),
    );
    expect(uploadRes.exitCode).toBe(0);

    // 3. promote: snap HTTP surface-mock returns 200.
    const promoteRes = await promote(
      snapCtx([snapshotId], stubFetch(200, { promoted: snapshotId })),
    );
    expect(promoteRes.exitCode).toBe(0);

    // 4. comply: evaluate rubric against the promoted snapshot.
    const comply = await runRouter({
      binaryName: 'claws',
      argv: ['policy', 'comply', '--rubric', 'soc2', '--snapshot', snapshotId],
      cwd: CWD,
    });
    expect(comply.exitCode).toBe(0);
    expect(comply.stdout).toContain(`snapshot=${snapshotId}`);

    // 5. verify: audit-chain check.
    const verify = await runRouter({
      binaryName: 'claws',
      argv: ['policy', 'verify', '--manifest', `${CWD}/audit-manifest.json`],
      cwd: CWD,
    });
    expect(verify.exitCode).toBe(0);
    expect(verify.stdout).toContain('audit-chain ok');
  });
});
