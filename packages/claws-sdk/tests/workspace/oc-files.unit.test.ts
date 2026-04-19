/**
 * OC file registry — compile-plane lock-step.
 *
 * Shape invariants for `OC_WORKSPACE_FILES` / `OC_PARSED_FILES` live in
 * `@bic/openclaw-workspace/tests/path/oc-files.unit.test.ts` — the canonical
 * registry is now owned by that package. This file retains only the
 * claws-sdk-specific lock-step: every entry in `OC_WORKSPACE_FILES` must
 * correspond to a reader dispatch inside
 * `src/compiler/readers/workspace-reader.ts`.
 *
 * Adding a new compile-plane file without touching workspace-reader.ts
 * (or vice versa) fails here.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { OC_WORKSPACE_FILES } from '@bic/openclaw-workspace/path';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..', '..');

describe('compile plane ↔ OC_WORKSPACE_FILES lock-step', () => {
  const readerSource = readFileSync(
    resolve(pkgRoot, 'src', 'compiler', 'readers', 'workspace-reader.ts'),
    'utf8',
  );

  const READER_FOR: Record<string, RegExp> = {
    'SOUL.md': /soulReader\.read\(/,
    'TOOLS.md': /toolsReader\.read\(/,
    'AGENTS.md': /agentsReader\.read\(/,
    'MEMORY.md': /memoryReader\.read\(/,
    'IDENTITY.md': /identityReader\.read\(/,
    'USER.md': /userReader\.read\(/,
    'HEARTBEAT.md': /heartbeatReader\.read\(/,
    'skills/': /skillsReader\.read\(/,
    'lobster.yaml': /lobsterReader\.read\(/,
  };

  for (const name of OC_WORKSPACE_FILES) {
    it(`${name} → corresponding reader dispatched in workspace-reader.ts`, () => {
      const pattern = READER_FOR[name];
      expect(pattern, `no reader pattern mapped for ${name}`).toBeDefined();
      expect(readerSource).toMatch(pattern!);
    });
  }
});
