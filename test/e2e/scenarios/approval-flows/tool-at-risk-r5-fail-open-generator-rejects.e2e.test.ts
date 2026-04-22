/**
 * SC-07 generator-rejects-r5-fail-open — compile-time barrier.
 *
 * Proposal §1.6 makes `riskTier: R5` and `failOpen: true` mutually
 * exclusive. This scenario spawns `claws policy generate` against an
 * intentionally-invalid fixture and asserts the compile-time reject:
 *
 *   - exit code ≠ 0 (APPROVAL-T-049)
 *   - stderr cites `TOOLS.md:12:5` (APPROVAL-T-050)
 *   - stderr contains `R5 + failOpen` (APPROVAL-T-051)
 *   - stderr names `send-email-failopen` (APPROVAL-T-052)
 *   - `--diagnostics-json` emits structured JSON on stdout (APPROVAL-T-053,55)
 *   - no `policy-ir.json` emitted on failure (APPROVAL-T-054)
 *
 * The runner is intentionally CLI-spawn — this scenario targets the
 * generator executable boundary, not the runtime decision harness used by
 * the rest of CP-6. The compile-time defence complements SC-03/SC-04's
 * runtime TTL-floor guards.
 */

import { mkdtempSync, rmSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, afterEach } from 'vitest';

import { runRouter } from '../../../../packages/openclaw-policy/src/cli-handlers/index.js';

const FIXTURE_ROOT = join(__dirname, '..', '..', 'fixtures', 'r5-fail-open-declared');

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length > 0) {
    const d = tempDirs.pop()!;
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // best-effort; presuite-hygiene reaps leftovers
    }
  }
});

function stageFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'sc07-r5-failopen-'));
  tempDirs.push(dir);
  for (const entry of readdirSync(FIXTURE_ROOT)) {
    copyFileSync(join(FIXTURE_ROOT, entry), join(dir, entry));
  }
  return dir;
}

describe('SC-07 tool-at-risk: R5 + failOpen — generator rejects', () => {
  it('exits non-zero and cites TOOLS.md:12:5 with tool name and reason', async () => {
    const cwd = stageFixture();
    const result = await runRouter({
      binaryName: 'claws',
      argv: ['policy', 'generate'],
      cwd,
    });

    // APPROVAL-T-049: exit code strictly non-zero
    expect(result.exitCode).not.toBe(0);

    // APPROVAL-T-052: stderr names the offending tool
    expect(result.stderr).toContain('send-email-failopen');

    // APPROVAL-T-050: stderr cites TOOLS.md:12:5
    expect(result.stderr).toContain('TOOLS.md:12:5');

    // APPROVAL-T-051: stderr contains R5 + failOpen
    expect(result.stderr).toContain('R5 + failOpen');

    // APPROVAL-T-054: no policy-ir.json emitted on failure
    const artifactPath = join(cwd, '.openclaw', 'policy', 'policy-ir.json');
    expect(existsSync(artifactPath)).toBe(false);
  });

  it('--diagnostics-json emits structured JSON with invalidReason', async () => {
    const cwd = stageFixture();
    const result = await runRouter({
      binaryName: 'claws',
      argv: ['policy', 'generate', '--diagnostics-json'],
      cwd,
    });

    expect(result.exitCode).not.toBe(0);

    // APPROVAL-T-055: structured JSON on stdout
    const parsed = JSON.parse(result.stdout) as {
      diagnostics: Array<{
        kind: string;
        toolName: string;
        sourcePath: string;
        line: number;
        column: number;
        invalidReason: string;
      }>;
    };
    expect(parsed.diagnostics).toHaveLength(1);
    const [diag] = parsed.diagnostics;
    expect(diag).toBeDefined();
    // APPROVAL-T-053: invalidReason matches CL-07 enum
    expect(diag!.invalidReason).toBe('r5-fail-open-declared');
    expect(diag!.toolName).toBe('send-email-failopen');
    expect(diag!.line).toBe(12);
    expect(diag!.column).toBe(5);
    expect(diag!.sourcePath).toContain('TOOLS.md');
  });
});
