/**
 * policy-runner-generate — spawn the real `claws policy generate` binary
 * and assert the structured result / error shape.
 *
 * Pulse 47.7 dropped the pulse-36 `opts.command` override seam now that
 * pulses 47.1-47.5 wired the real handler and pulse 47.6 proved it
 * end-to-end. Every test here runs the shipping `packages/claws/bin/claws.js`
 * — no injected fakes. If a future test needs to simulate an outcome the
 * real binary doesn't produce, add the outcome to the binary (or its
 * fixtures), do NOT restore an override seam.
 *
 * These tests depend on a fresh dist build. Run `npm run build` at the
 * repo root before the suite; the pulse-47.6 accept suite does this in
 * `beforeAll`.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { cp, mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generatePolicy,
  PolicyGenerateError,
} from '../policy-runner.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = join(HERE, '..', '..', 'fixtures');

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop()!;
    // Windows can hold a directory open briefly after killing the child
    // that had it as cwd — retry a few times before giving up.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await rm(dir, { recursive: true, force: true });
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }
});

async function copyFixture(fixtureName: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), `pulse47-runner-${fixtureName}-`));
  createdDirs.push(dir);
  await cp(join(FIXTURES_ROOT, fixtureName), dir, { recursive: true });
  return dir;
}

describe('generatePolicy — real claws policy generate spawn', () => {
  it(
    'produces the .openclaw/policy/ artifact tree against a real fixture',
    async () => {
      const fixture = await copyFixture('allow-r1-public');
      const result = await generatePolicy(fixture);

      expect(result.exitCode).toBe(0);
      expect(result.policyDir).toBe(join(fixture, '.openclaw', 'policy'));
      // The real generator prints `files=<n>` on success and emits the
      // three artifacts — matches the pulse-47.6 accept-suite contract.
      expect(result.stdout).toMatch(/files=\d+/);

      const st = await stat(result.policyDir);
      expect(st.isDirectory()).toBe(true);
      const ir = await readFile(
        join(result.policyDir, 'policy-ir.json'),
        'utf8',
      );
      expect(JSON.parse(ir).policyId).toMatch(/^sha256-/);
    },
    60_000,
  );

  it(
    'forwards --scope into the real binary argv',
    async () => {
      const fixture = await copyFixture('allow-r1-public');
      const result = await generatePolicy(fixture, { scope: '@openclaw' });

      expect(result.exitCode).toBe(0);
      // The real generate handler echoes `scope=<value>` on success.
      expect(result.stdout).toMatch(/scope=@openclaw/);
    },
    60_000,
  );

  it(
    'defaults to the @bic/openclaw scope when no --scope is passed',
    async () => {
      const fixture = await copyFixture('allow-r1-public');
      const result = await generatePolicy(fixture);

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/scope=@bic\/openclaw/);
    },
    60_000,
  );
});

describe('generatePolicy — timeout + error shape', () => {
  it(
    'kills the child and rejects with a timeout error when the timeout fires first',
    async () => {
      const fixture = await copyFixture('allow-r1-public');
      // 5ms is far shorter than node startup + policy generate — the
      // timeout path fires before any real work completes.
      await expect(
        generatePolicy(fixture, { timeoutMs: 5 }),
      ).rejects.toMatchObject({
        name: 'PolicyGenerateError',
        exitCode: 124,
      });
    },
    60_000,
  );

  it(
    'surfaces tmpFixtureDir on the structured error (timeout path)',
    async () => {
      const fixture = await copyFixture('allow-r1-public');

      try {
        await generatePolicy(fixture, { timeoutMs: 5 });
        throw new Error('expected PolicyGenerateError');
      } catch (err) {
        expect(err).toBeInstanceOf(PolicyGenerateError);
        const pge = err as PolicyGenerateError;
        expect(pge.tmpFixtureDir).toBe(fixture);
        expect(pge.exitCode).toBe(124);
      }
    },
    60_000,
  );
});
