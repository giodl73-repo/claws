/**
 * Issue replay — load each fixture from the EVIDENCE table and assert the
 * lint engine catches the failure pattern with the expected codes.
 *
 * Fixture per issue: `tests/lint/fixtures/issues/{N}-{slug}.jsonc`
 *
 * @see plan claws-workspace-lint H4 — real-config validation harness
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { parseJsonc } from '../../src/ast/jsonc/parse.js';
import { lint } from '../../src/lint/index.js';
import type { LintCode } from '../../src/lint/types.js';
import { openclawTestSchema } from './fixtures/openclaw-test-schema.js';

const here = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(here, 'fixtures/issues');

interface ReplayCase {
  readonly issue: number;
  readonly fixture: string;
  /** Codes that MUST appear in the lint output for this issue. */
  readonly expectsCodes: readonly LintCode[];
  /** Codes that MUST NOT appear. */
  readonly forbidsCodes?: readonly LintCode[];
  /** Optional extra assertion for inspecting specific findings. */
  readonly notes?: string;
}

const replays: readonly ReplayCase[] = [
  {
    issue: 14998,
    fixture: '14998-schema-key.jsonc',
    expectsCodes: [],
    forbidsCodes: ['OC_CFG_UNKNOWN_FIELD'],
    notes: '$schema is a legitimate editor convention; lint must not flag it as unknown',
  },
  {
    issue: 20478,
    fixture: '20478-plugin-id-collision.jsonc',
    expectsCodes: ['OC_CFG_PLUGIN_ID_COLLISION'],
  },
  {
    issue: 22272,
    fixture: '22272-unrecognized-keys.jsonc',
    expectsCodes: ['OC_CFG_UNKNOWN_FIELD'],
    notes: 'typos like "homserver"/"acessToken" should fire UNKNOWN_FIELD with did-you-mean',
  },
  {
    issue: 31251,
    fixture: '31251-clobbered-dmpolicy.jsonc',
    expectsCodes: ['OC_CFG_MISSING_REQUIRED_FIELD'],
    notes: 'post-clobber state shows missing required dmPolicy under gateway',
  },
  {
    issue: 48415,
    fixture: '48415-trailing-comma-mix.jsonc',
    expectsCodes: ['OC_CFG_TRAILING_COMMA_INCONSISTENT'],
  },
  {
    issue: 59070,
    fixture: '59070-defaultId-typo.jsonc',
    expectsCodes: ['OC_CFG_UNKNOWN_FIELD'],
    notes: 'root-level defaultId is a typo; did-you-mean should suggest defaultAgent',
  },
  {
    issue: 60334,
    fixture: '60334-legacy-root-keys.jsonc',
    expectsCodes: ['OC_CFG_LEGACY_FIELD'],
  },
  {
    issue: 61683,
    fixture: '61683-missing-required.jsonc',
    expectsCodes: ['OC_CFG_MISSING_REQUIRED_FIELD'],
  },
  {
    issue: 62281,
    fixture: '62281-redacted-corruption.jsonc',
    expectsCodes: ['OC_CFG_REDACTED_PLACEHOLDER'],
  },
  {
    issue: 62438,
    fixture: '62438-secret-ref-clean.jsonc',
    expectsCodes: [],
    forbidsCodes: ['OC_CFG_SECRET_REF_AMBIGUOUS'],
    notes: '${VAR} cleanly braced — must not produce false positive',
  },
  {
    issue: 65565,
    fixture: '65565-default-agent-typo.jsonc',
    expectsCodes: ['OC_CFG_UNKNOWN_FIELD'],
  },
  {
    issue: 72872,
    fixture: '72872-agentRuntime-legacy.jsonc',
    expectsCodes: ['OC_CFG_LEGACY_FIELD'],
    notes: 'agentRuntime → runtimeVersion auto-migration suggestion',
  },
];

describe('issue replay — real-config patterns', () => {
  for (const replay of replays) {
    it(`#${replay.issue} (${replay.fixture})${replay.notes ? ' — ' + replay.notes : ''}`, () => {
      const source = readFileSync(resolve(fixturesDir, replay.fixture), 'utf8');
      const doc = parseJsonc(source);
      const findings = lint(doc, { schema: openclawTestSchema });
      const codes = new Set(findings.map((f) => f.code));
      for (const expected of replay.expectsCodes) {
        expect(codes.has(expected), `expected ${expected} for issue #${replay.issue} but got: ${[...codes].join(', ')}`).toBe(true);
      }
      for (const forbidden of replay.forbidsCodes ?? []) {
        expect(codes.has(forbidden), `forbidden ${forbidden} present for issue #${replay.issue}`).toBe(false);
      }
      // Every finding has a populated ocUri.
      for (const f of findings) {
        expect(f.ocUri.startsWith('oc://config')).toBe(true);
      }
    });
  }
});
