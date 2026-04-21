/**
 * fixtures-smoke — one pass per core fixture that copies it into a tmp
 * scenario dir and runs a minimal `claws policy generate` stand-in against
 * the copy. This is the pulse-44 D4 smoke gate: every fixture loads without
 * SOUL/TOOLS parse errors and the policy generator exits 0.
 *
 * The real `claws policy generate` subcommand does not ship until pulse 53,
 * so this test injects a Node-based fake generator via `opts.command`. The
 * fake performs the invariants that every policy-generate run must satisfy
 * against any fixture:
 *
 *   - read `SOUL.md` (required; a missing file causes exit 1, which makes
 *     the smoke test fail loudly if a fixture is authored incorrectly).
 *   - read `TOOLS.md` (required, same reason).
 *   - read `AGENTS.md` (required).
 *   - write `.openclaw/policy/policy-ir.json` with a recognizable shape.
 *
 * Pulse 47 (acceptance) will re-run every fixture against the real binary.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFixture } from '../fixture-copier.ts';
import {
  generatePolicy,
  type ResolvedCommand,
} from '../policy-runner.ts';

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

/**
 * Fake `claws policy generate` — reads the three required fixture files and
 * emits a stub policy-ir.json. Mirrors the real CLI's startup contract: if
 * SOUL.md / TOOLS.md / AGENTS.md are missing, exit non-zero.
 */
function fakePolicyGenerate(): ResolvedCommand {
  const script =
    "'use strict';\n" +
    "const fs = require('fs');\n" +
    "const path = require('path');\n" +
    "const cwd = process.cwd();\n" +
    "const required = ['SOUL.md', 'TOOLS.md', 'AGENTS.md'];\n" +
    "for (const name of required) {\n" +
    "  const p = path.join(cwd, name);\n" +
    "  try {\n" +
    "    fs.readFileSync(p, 'utf8');\n" +
    "  } catch (err) {\n" +
    "    process.stderr.write('missing required fixture file: ' + name + '\\n');\n" +
    "    process.exit(1);\n" +
    "  }\n" +
    "}\n" +
    "const out = path.join(cwd, '.openclaw', 'policy');\n" +
    "fs.mkdirSync(out, { recursive: true });\n" +
    "fs.writeFileSync(\n" +
    "  path.join(out, 'policy-ir.json'),\n" +
    "  JSON.stringify({ schemaVersion: 1, canonicalizerVersion: '1.0.0' }),\n" +
    ");\n" +
    "process.stdout.write('policy generated\\n');\n";
  return { bin: process.execPath, args: ['-e', script] };
}

const CORE_FIXTURES = [
  'allow-r1-public',
  'deny-soul-rule',
  'review-r5-restricted',
  'modify-arg-redaction',
] as const;

describe('fixtures-smoke — every core verb fixture loads cleanly', () => {
  for (const fixtureName of CORE_FIXTURES) {
    it(`${fixtureName} copies + generates policy-ir without errors`, async () => {
      const source = join(FIXTURES_ROOT, fixtureName);

      // Sanity: the source tree actually contains all three required files.
      // If a fixture is malformed, we want the assertion here rather than
      // the child process exit telling us "missing required fixture file".
      await readFile(join(source, 'SOUL.md'), 'utf8');
      await readFile(join(source, 'TOOLS.md'), 'utf8');
      await readFile(join(source, 'AGENTS.md'), 'utf8');

      const tmp = await copyFixture(source, `smoke-${fixtureName}`);
      createdDirs.push(tmp);

      const result = await generatePolicy(tmp, { command: fakePolicyGenerate() });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('policy generated');
      expect(result.policyDir).toBe(join(tmp, '.openclaw', 'policy'));

      // Post-run: the policy-ir.json landed with the expected shape.
      const ir = await readFile(
        join(result.policyDir, 'policy-ir.json'),
        'utf8',
      );
      const parsed = JSON.parse(ir) as { schemaVersion?: number };
      expect(parsed.schemaVersion).toBe(1);
    });
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
