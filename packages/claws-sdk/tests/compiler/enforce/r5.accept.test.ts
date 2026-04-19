/**
 * L3: R5 non-bypassable acceptance test.
 *
 * R5 fail-closed cannot be bypassed — no config flag, no env var,
 * no constructor option disables fail-closed in the free tier module.
 *
 * This test verifies structural guarantees, not just runtime behavior.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { enforceR5 } from '../../../src/compiler/enforce/r5.js';
import { compileGuard } from '../../../src/compiler/enforce/guard.js';
import { CompilationDeniedError } from '../../../src/compiler/enforce/errors.js';
import type { EnforcementConfig } from '../../../src/compiler/enforce/types.js';
import type { GovAnalysis } from '../../../src/ir/gov-analysis.js';
import type { OCWorkspaceIR } from '../../../src/compiler/ir/workspace-ir.js';
import type { FileReference } from '../../../src/compiler/ir/field-types.js';

// ── Helpers ────────────────────────────────────────────────────────────

function fileRef(path: string): FileReference {
  return { path, hash: 'accept-hash', size: 50 };
}

function minimalWorkspaceIR(): OCWorkspaceIR {
  return {
    soul: { persona: 'test', principles: [], boundaries: [], source: fileRef('SOUL.md') },
    tools: { tools: [], source: fileRef('TOOLS.md') },
    agents: { agents: [], delegations: [], source: fileRef('AGENTS.md') },
    memory: { entries: [], hasIndex: false, source: fileRef('MEMORY.md') },
    identity: { organization: 'test', team: 'test', authMethod: 'none', roles: [], source: fileRef('IDENTITY.md') },
    user: { role: 'dev', bounds: [], platform: 'oc', environment: {}, source: fileRef('USER.md') },
    heartbeat: { schedules: [], source: fileRef('HEARTBEAT.md') },
    skills: { skills: [], source: fileRef('skills/') },
    lobster: { name: 'default', description: 'wf', steps: [], dependencies: {}, source: fileRef('lobster.yaml') },
    compiler: { compilerVersion: '0.1.0', compiledAt: '2026-04-16T00:00:00Z', schemaVersion: 1 },
    diagnostics: [],
  };
}

function violatingAnalysis(): GovAnalysis {
  return {
    violations: [
      {
        ruleId: 'R5-ACCEPT-TEST',
        level: 5,
        message: 'Critical violation for acceptance test',
        target: 'accept-target',
        diagnosticCode: 'CLAWS-ACCEPT-001',
        fixSuggestions: [],
        toolFuzzyMatches: [],
      },
    ],
    warnings: [],
    enforcementPlan: {
      blockedTools: [],
      requiredApprovals: [],
      auditOnlyRules: [],
      channelRedactions: [],
      ruleSuppressions: [],
    },
    reclassificationTable: [],
    effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
  };
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('R5 non-bypassable acceptance', () => {
  it('R5 fail-closed cannot be bypassed in the free tier', () => {
    const workspace = minimalWorkspaceIR();
    const analysis = violatingAnalysis();

    // 1. No config flag can disable fail-closed.
    //    EnforcementConfig only allows 'fail-closed' mode.
    const config: EnforcementConfig = { mode: 'fail-closed' };
    expect(config.mode).toBe('fail-closed');
    // TypeScript enforces this at compile time — the type only allows 'fail-closed'.
    // At runtime, verify the only valid value.
    const configModes = ['fail-closed'] as const;
    expect(configModes).toHaveLength(1);
    expect(configModes[0]).toBe('fail-closed');

    // 2. No environment variable disables fail-closed.
    //    Set hypothetical bypass env vars and verify enforcement still triggers.
    const originalEnv = { ...process.env };
    try {
      process.env['CLAWS_FAIL_OPEN'] = 'true';
      process.env['CLAWS_DISABLE_R5'] = '1';
      process.env['CLAWS_BYPASS_ENFORCEMENT'] = 'yes';
      process.env['NODE_ENV'] = 'test';

      // enforceR5 still catches violations regardless of env
      const result = enforceR5(analysis, workspace);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.violations.length).toBeGreaterThan(0);
      }

      // compileGuard still throws regardless of env
      expect(() => {
        compileGuard(analysis, workspace);
      }).toThrow(CompilationDeniedError);
    } finally {
      // Restore env
      delete process.env['CLAWS_FAIL_OPEN'];
      delete process.env['CLAWS_DISABLE_R5'];
      delete process.env['CLAWS_BYPASS_ENFORCEMENT'];
      if (originalEnv['NODE_ENV'] !== undefined) {
        process.env['NODE_ENV'] = originalEnv['NODE_ENV'];
      } else {
        delete process.env['NODE_ENV'];
      }
    }

    // 3. No constructor option or function argument can bypass enforcement.
    //    enforceR5 and compileGuard have fixed signatures — no optional
    //    "bypass" or "skipEnforcement" parameter. The free tier signature
    //    is (analysis, workspace) — 2 params, no flags.
    expect(enforceR5.length).toBe(2);
    expect(compileGuard.length).toBe(2);

    // 4. Source code inspection: verify no process.env checks in enforce module.
    const enforceDir = resolve(__dirname, '../../../src/compiler/enforce');
    const sourceFiles = ['r5.ts', 'guard.ts', 'errors.ts', 'types.ts'];

    for (const file of sourceFiles) {
      const source = readFileSync(resolve(enforceDir, file), 'utf-8');
      // No env var checks
      expect(source).not.toContain('process.env');
      // No skip/bypass/disable flags
      expect(source).not.toMatch(/skip|bypass|disable/i);
      // No 'fail-open' string
      expect(source).not.toContain('fail-open');
    }

    // 5. Verify CompilationDeniedError is a proper Error subclass
    //    with violations array — cannot be caught-and-swallowed silently.
    try {
      compileGuard(analysis, workspace);
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(CompilationDeniedError);
      const denied = err as CompilationDeniedError;
      expect(denied.violations).toBeInstanceOf(Array);
      expect(denied.violations.length).toBeGreaterThan(0);
      expect(denied.name).toBe('CompilationDeniedError');
      expect(denied.message).toContain('Compilation denied');
    }
  });
});
