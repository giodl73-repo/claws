/**
 * fixtures-smoke — one pass per core fixture that copies it into a tmp
 * scenario dir and runs `claws policy generate` against the copy. This is
 * the pulse-44 D4 smoke gate: every fixture loads without SOUL/TOOLS parse
 * errors and the real policy generator exits 0.
 *
 * Pulse 47.7: dropped the pulse-36 `opts.command` fake. Pulses 47.1-47.5
 * wired the real handler and pulse 47.6 proved it works end-to-end across
 * every CP-5 fixture, so this smoke gate now also exercises the real
 * binary rather than a Node-based stub.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFile, rm, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFixture } from '../fixture-copier.ts';
import { generatePolicy } from '../policy-runner.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_ROOT = join(HERE, '..', '..', 'fixtures');

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop()!;
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

const CORE_FIXTURES = [
  'allow-r1-public',
  'deny-soul-rule',
  'review-r5-restricted',
  'modify-arg-redaction',
] as const;

describe('fixtures-smoke — every core verb fixture loads cleanly', () => {
  for (const fixtureName of CORE_FIXTURES) {
    it(
      `${fixtureName} copies + runs claws policy generate without errors`,
      async () => {
        const source = join(FIXTURES_ROOT, fixtureName);
        const tmp = await copyFixture(source, `smoke-${fixtureName}`);
        createdDirs.push(tmp);

        const result = await generatePolicy(tmp);
        expect(result.exitCode).toBe(0);
        expect(result.policyDir).toBe(join(tmp, '.openclaw', 'policy'));

        // Post-run: the real generator created the policy output tree.
        const st = await stat(result.policyDir);
        expect(st.isDirectory()).toBe(true);
      },
      60_000,
    );
  }
});

describe('fixtures-smoke — canonicalizer-multi-consumer policy-IR', () => {
  it('loads as well-formed JSON matching SC-08 expectations', async () => {
    const path = join(
      FIXTURES_ROOT,
      'canonicalizer-multi-consumer',
      'policy-ir.json',
    );
    const bytes = await readFile(path, 'utf8');
    const parsed = JSON.parse(bytes) as {
      schemaVersion: unknown;
      canonicalizerVersion: unknown;
      tools: unknown;
      trustSet: unknown;
      rules: unknown;
    };
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.canonicalizerVersion).toBe('1.0.0');
    expect(Array.isArray(parsed.tools)).toBe(true);
    expect(parsed.trustSet).toBeDefined();
    expect(parsed.rules).toBeDefined();
  });
});
