/**
 * Vitest global setup — runs once before any project or worker starts.
 *
 * Enforces a fresh dist build so every tier (unit/integration/e2e/accept)
 * sees the same artifacts. Previously `cli-roundtrip.accept.test.ts`
 * performed the build inside a `beforeAll`, but vitest runs projects in
 * parallel: while the accept project rebuilt dist, integration tests
 * concurrently spawning `node packages/claws/bin/claws.js` would hit an
 * ERR_MODULE_NOT_FOUND for `dist/cli.js` during tsup's `clean: true`
 * window. Moving the build to globalSetup eliminates the race — all
 * projects start after dist is materialised.
 */
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..', '..');

export async function setup(): Promise<void> {
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    shell: true,
    stdio: 'pipe',
  });
  if (result.status !== 0) {
    throw new Error(
      `npm run build failed (exit ${String(result.status)}):\n${result.stdout}\n${result.stderr}`,
    );
  }
}

export async function teardown(): Promise<void> {
  // No-op; dist is left in place for developer inspection.
}
