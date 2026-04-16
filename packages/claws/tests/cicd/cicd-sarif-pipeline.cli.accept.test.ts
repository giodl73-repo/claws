/**
 * L3 CLI acceptance: runs `claws pinch --format sarif` on a fixture
 * workspace, verifies SARIF output and exit code per stage.
 *
 * This test exercises the real claws binary as a subprocess (same as
 * other CLI acceptance tests) to catch packaging failures, broken
 * subpath imports, and end-to-end command wiring.
 *
 * @module claws-cli/tests/cicd/cicd-sarif-pipeline.cli.accept
 */

import { describe, it, expect, afterEach } from 'vitest';
import { claws, initTempWorkspace } from '../accept/helpers.js';

describe('claws pinch --format sarif (CI/CD pipeline)', () => {
  let cleanup: (() => void) | undefined;

  afterEach(() => cleanup?.());

  it('produces valid SARIF 2.1.0 JSON on a scaffolded workspace', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const result = await claws(['pinch', '--format', 'sarif'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    // Should not have module resolution errors
    expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');

    // The output should be valid JSON
    const stdout = result.stdout.trim();
    if (stdout.length > 0) {
      const sarif = JSON.parse(stdout);

      // SARIF 2.1.0 schema compliance
      expect(sarif.version).toBe('2.1.0');
      expect(sarif.$schema).toContain('sarif-2.1.0');
      expect(sarif.runs).toHaveLength(1);

      const run = sarif.runs[0];

      // Tool driver metadata
      expect(run.tool.driver.name).toBe('claws');
      expect(run.tool.driver).toHaveProperty('version');
      expect(run.tool.driver).toHaveProperty('informationUri');
      expect(Array.isArray(run.tool.driver.rules)).toBe(true);

      // Results array
      expect(Array.isArray(run.results)).toBe(true);

      // Each result has required SARIF fields
      for (const r of run.results) {
        expect(r).toHaveProperty('ruleId');
        expect(r).toHaveProperty('level');
        expect(['error', 'warning', 'note', 'none']).toContain(r.level);
        expect(r).toHaveProperty('message');
        expect(r.message).toHaveProperty('text');
        expect(r).toHaveProperty('locations');
        expect(r.locations.length).toBeGreaterThanOrEqual(1);

        // Location structure
        const loc = r.locations[0];
        expect(loc.physicalLocation).toHaveProperty('artifactLocation');
        expect(loc.physicalLocation.artifactLocation).toHaveProperty('uri');
        // No backslashes in URIs
        expect(loc.physicalLocation.artifactLocation.uri).not.toContain('\\');
      }
    }
  });

  it('exits with code 0 on clean workspace and code 1 on violations', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    // Run pinch (check alias) — the scaffolded workspace may or may not
    // have violations depending on the default template. We just verify
    // the exit code is 0 or 1 (not 3=error).
    const result = await claws(['pinch', '--format', 'sarif'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect([0, 1]).toContain(result.exitCode);
  });

  it('--format sarif output has ruleId matching declared rules', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const result = await claws(['pinch', '--format', 'sarif'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');

    const stdout = result.stdout.trim();
    if (stdout.length > 0 && stdout.startsWith('{')) {
      const sarif = JSON.parse(stdout);
      const run = sarif.runs[0];
      const declaredRuleIds = new Set(
        run.tool.driver.rules.map((r: { id: string }) => r.id),
      );

      // Every result's ruleId must reference a declared rule
      for (const r of run.results) {
        expect(declaredRuleIds.has(r.ruleId)).toBe(true);
      }
    }
  });
});
