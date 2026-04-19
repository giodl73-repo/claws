/**
 * L0 smoke tests for the CP-2 compile pipeline fixtures.
 *
 * Guards the on-disk shape of the 9-file fixture workspace and the
 * fault-injection broken-governance fixture. Tests here do not invoke
 * the compiler — they only assert the fixtures are complete and still
 * have the shape the e2e/acceptance tests depend on.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const FIXTURES = resolve(__dirname, 'fixtures');
const WORKSPACE = resolve(FIXTURES, 'workspace');
const BROKEN = resolve(FIXTURES, 'broken-governance');

const EXPECTED_FILES = [
  'SOUL.md',
  'TOOLS.md',
  'AGENTS.md',
  'MEMORY.md',
  'IDENTITY.md',
  'USER.md',
  'HEARTBEAT.md',
  'skills/example/SKILL.md',
  'lobster.yaml',
] as const;

describe('compile pipeline e2e fixtures (smoke)', () => {
  it('workspace fixture contains all 9 expected files', () => {
    for (const rel of EXPECTED_FILES) {
      expect(existsSync(resolve(WORKSPACE, rel)), `missing fixture file: ${rel}`).toBe(true);
    }
  });

  it('broken-governance fixture has a lobster.yaml that triggers R5 fail-closed', () => {
    expect(existsSync(BROKEN)).toBe(true);
    const lobsterContent = readFileSync(resolve(BROKEN, 'lobster.yaml'), 'utf-8');
    // The fault we inject: lobster.yaml never declares a top-level `name:` key.
    // The lobster reader raises LOBSTER-MISSING-NAME at severity=error, which
    // modelToIR promotes into ir.diagnostics, which enforceR5 then treats as a
    // critical violation (see enforce/r5.ts checkWorkspaceDiagnostics).
    const topLevelName = /^name:\s*\S/m.test(lobsterContent);
    expect(topLevelName).toBe(false);
  });
});
