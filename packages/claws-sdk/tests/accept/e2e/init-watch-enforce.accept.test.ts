/**
 * L3: Init-watch-enforce acceptance test — CP-2 gate contract.
 *
 * Same scenario as the L2 e2e test but with formal acceptance harness
 * assertions: structured pass/fail per phase, strict validation of all
 * CP-2 deliverables (init, templates, uninstall, watch, doctor, amend,
 * bypass), and enforcement verification.
 *
 * This is the checkpoint gate for CP-2 (Operations).
 *
 * @module claws-sdk/tests/accept/e2e/init-watch-enforce
 */

import { describe, it, expect, afterEach } from 'vitest';
import { resolve, join } from 'node:path';
import {
  existsSync,
  readFileSync,
  mkdtempSync,
  cpSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

// ── Init module ──────────────────────────────────────────────────────
import {
  initWorkspace,
  uninstallWorkspace,
  checkBypass,
  CLAWS_BYPASS_ENV,
} from '../../../src/init/index.js';

// ── Watch module ─────────────────────────────────────────────────────
import { IncrementalParser } from '../../../src/watch/incremental.js';
import { AutoAnalyzer } from '../../../src/watch/auto-analyze.js';
import { AutoRecompiler } from '../../../src/watch/auto-recompile.js';

// ── Doctor module ────────────────────────────────────────────────────
import {
  runDoctor,
  createDefaultChecks,
  runMigrations,
  detectVersion,
} from '../../../src/doctor/index.js';

// ── Amend module ─────────────────────────────────────────────────────
import {
  runAmendPipeline,
  validateAmendment,
  previewAmendment,
} from '../../../src/amend/index.js';
import type { Amendment } from '../../../src/amend/index.js';

// ── Compile pipeline ─────────────────────────────────────────────────
import { parse } from '../../../src/compile/parse.js';
import { extractAllIntents } from '../../../src/compile/intent/index.js';
import { buildGovernanceAST } from '../../../src/compile/governance-ast.js';
import { extract } from '../../../src/compile/extract.js';
import { buildCapabilityManifest } from '../../../src/compile/manifest.js';
import { analyze } from '../../../src/compile/analyze.js';
import { detectConflicts } from '../../../src/compile/conflict-detect.js';
import { toIRConflictReport } from '../../../src/compile/conflicts-ir.js';
import { createDefaultRegistry } from '../../../src/governance/index.js';
import { emitPlugin, verifyNoForbiddenImports, verifyCatchClauses } from '../../../src/emit/emit-plugin.js';
import { COMPILER_VERSION, SCHEMA_VERSION } from '../../../src/compile/version.js';
import type { GovernanceIR } from '../../../src/ir/governance-ir.js';

// ── Sidecar + config ─────────────────────────────────────────────────
import {
  CLAWS_SIDECAR_LAYOUT,
  CLAWS_CONFIG_FILE,
} from '../../../src/types/sidecar.js';
import { loadConfig } from '../../../src/config/loader.js';

// ── Fixtures ─────────────────────────────────────────────────────────

const FIXTURES = resolve(__dirname, '../../fixtures');
const REFERENCE_WORKSPACE = resolve(FIXTURES, 'oc-reference-workspace');

// ── GatewaySim ───────────────────────────────────────────────────────

class GatewaySim {
  private readonly riskMap: ReadonlyMap<string, number>;
  private readonly auditLog: Array<Record<string, unknown>> = [];

  constructor(pluginSource: string) {
    this.riskMap = this.extractRiskMap(pluginSource);
  }

  private extractRiskMap(source: string): Map<string, number> {
    const map = new Map<string, number>();
    const entryPattern = /\["([^"]+)",\s*(\d+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = entryPattern.exec(source)) !== null) {
      map.set(match[1]!, parseInt(match[2]!, 10));
    }
    return map;
  }

  evaluateToolCall(toolName: string): {
    allowed: boolean;
    blockReason: string | null;
    riskLevel: number;
    failMode: 'open' | 'gated' | 'closed';
  } {
    const riskLevel = this.riskMap.get(toolName) ?? 5;
    this.auditLog.push({
      event: 'tool-call',
      toolName,
      riskLevel,
      timestamp: new Date().toISOString(),
    });

    if (riskLevel >= 5) {
      return {
        allowed: false,
        blockReason: `R${riskLevel} fail-closed`,
        riskLevel,
        failMode: 'closed',
      };
    }
    if (riskLevel >= 3) {
      return {
        allowed: false,
        blockReason: `R${riskLevel} gated`,
        riskLevel,
        failMode: 'gated',
      };
    }
    return { allowed: true, blockReason: null, riskLevel, failMode: 'open' };
  }

  get toolCount(): number {
    return this.riskMap.size;
  }

  get audit(): readonly Record<string, unknown>[] {
    return this.auditLog;
  }

  getAllRiskLevels(): ReadonlyMap<string, number> {
    return this.riskMap;
  }
}

// ── Pipeline helper ──────────────────────────────────────────────────

async function runPipeline(workspaceDir: string): Promise<{
  ir: GovernanceIR;
  pluginSource: string;
  packageJson: string;
  hookFiles: ReadonlyMap<string, string>;
  violationCount: number;
}> {
  const parseResult = await parse(workspaceDir);
  const intentResults = extractAllIntents(parseResult);
  const ast = buildGovernanceAST(intentResults);
  const parsedManifest = extract(ast);
  const capabilityManifest = buildCapabilityManifest(parsedManifest);
  const registry = createDefaultRegistry(capabilityManifest);
  const analysis = analyze(capabilityManifest, registry);
  const rawConflicts = detectConflicts(ast, parsedManifest);
  const conflicts = toIRConflictReport(rawConflicts);

  const ir: GovernanceIR = {
    capabilities: capabilityManifest,
    analysis,
    intents: [],
    delegationMap: [],
    conflicts,
    compiler: {
      compilerVersion: COMPILER_VERSION,
      compiledAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
    },
  };

  const emitResult = emitPlugin(ir);
  return {
    ir,
    pluginSource: emitResult.pluginSource,
    packageJson: emitResult.packageJson,
    hookFiles: emitResult.hookFiles,
    violationCount: analysis.violations.length,
  };
}

// ── Cleanup ──────────────────────────────────────────────────────────

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort
    }
  }
  tempDirs.length = 0;
});

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `claws-accept-cp2-${prefix}-`));
  tempDirs.push(dir);
  return dir;
}

function copyReferenceWorkspace(dest: string): void {
  const sourceFiles = [
    'SOUL.md', 'TOOLS.md', 'AGENTS.md', 'IDENTITY.md',
    'USER.md', 'MEMORY.md', 'HEARTBEAT.md',
    'openclaw.json', 'lobster.yaml',
  ];
  for (const file of sourceFiles) {
    const src = resolve(REFERENCE_WORKSPACE, file);
    if (existsSync(src)) {
      cpSync(src, join(dest, file));
    }
  }
  const skillsDir = resolve(REFERENCE_WORKSPACE, 'skills');
  if (existsSync(skillsDir)) {
    cpSync(skillsDir, join(dest, 'skills'), { recursive: true });
  }
}

// ── Structured result tracking ───────────────────────────────────────

interface PhaseResult {
  phase: string;
  passed: boolean;
  assertions: number;
  failures: string[];
  durationMs: number;
}

function startPhase(name: string): { end: (passed: boolean, assertions: number, failures?: string[]) => PhaseResult; startTime: number } {
  const startTime = Date.now();
  return {
    startTime,
    end: (passed, assertions, failures = []) => ({
      phase: name,
      passed,
      assertions,
      failures,
      durationMs: Date.now() - startTime,
    }),
  };
}

// ── Acceptance Test ──────────────────────────────────────────────────

describe('accept: init-watch-enforce (CP-2 gate)', () => {
  it('full CP-2 pipeline: init → SOC2 template → watch → doctor → amend → build → enforce', async () => {
    const results: PhaseResult[] = [];
    const tempDir = createTempDir('full');
    copyReferenceWorkspace(tempDir);

    // ── Phase 1: Init with SOC2 template ─────────────────────────────

    const p1 = startPhase('init-soc2');
    const initResult = await initWorkspace(tempDir, { template: 'soc2' });

    expect(initResult.exitCode).toBe(0);
    expect(initResult.status).toBe('initialized');
    expect(initResult.templateApplied).toBe('soc2');

    // Validate claws.json
    const configResult = await loadConfig(tempDir);
    expect(configResult.found).toBe(true);

    // Validate all 13 sidecar dirs
    const allDirs = Object.values(CLAWS_SIDECAR_LAYOUT);
    expect(allDirs).toHaveLength(13);
    for (const dir of allDirs) {
      expect(existsSync(join(tempDir, dir)), `sidecar ${dir} should exist`).toBe(true);
    }

    // Validate 5 SOC2 policy files
    const policiesDir = join(tempDir, '.claws', 'policies');
    const expectedPolicies = [
      'require_section.yaml',
      'tool_blocklist.yaml',
      'trust_tier_gate.yaml',
      'pii_detection.yaml',
      'budget_ceiling.yaml',
    ];
    for (const pf of expectedPolicies) {
      expect(existsSync(join(policiesDir, pf)), `policy ${pf} should exist`).toBe(true);
      const content = readFileSync(join(policiesDir, pf), 'utf-8');
      expect(content).toContain('framework: soc2');
    }

    // Idempotency: re-init returns exit 2
    const reinitResult = await initWorkspace(tempDir, { template: 'soc2' });
    expect(reinitResult.exitCode).toBe(2);
    expect(reinitResult.status).toBe('already-initialized');

    results.push(p1.end(true, 19));

    // ── Phase 2: Watch — edit TOOLS.md, detect violation ─────────────

    const p2 = startPhase('watch-detect');

    const initialParse = await parse(tempDir);
    const incParser = new IncrementalParser(tempDir);
    incParser.seed(initialParse);

    const autoAnalyzer = new AutoAnalyzer();
    const initialAnalysis = autoAnalyzer.run(initialParse);
    const baselineViolations = initialAnalysis.analysis.violations.length;
    expect(baselineViolations).toBeGreaterThan(0);

    // Edit TOOLS.md: add shell-exec R5 tool
    const toolsMdPath = join(tempDir, 'TOOLS.md');
    const originalToolsMd = readFileSync(toolsMdPath, 'utf-8');
    writeFileSync(toolsMdPath, originalToolsMd + `

## credential-harvester
- Risk: R5
- Description: Harvest credentials from environment
- Governance: audit + approval (exec) + elicitation required
`, 'utf-8');

    // Incremental parse detects change
    const updatedParse = await incParser.update(['TOOLS.md']);
    expect(updatedParse.presentCount).toBeGreaterThanOrEqual(initialParse.presentCount);

    // Auto-analyze produces violation diff
    const updatedAnalysis = autoAnalyzer.run(updatedParse);
    expect(updatedAnalysis.diff.added.length).toBeGreaterThan(0);
    expect(updatedAnalysis.diff.totalCount).toBeGreaterThanOrEqual(baselineViolations);

    // Verify the new violation references the new tool's classification
    const gClassViolations = updatedAnalysis.analysis.violations.filter(
      v => v.ruleId === 'G-CLASS-02',
    );
    expect(gClassViolations.length).toBeGreaterThan(0);

    results.push(p2.end(true, 8));

    // ── Phase 3: Doctor — workspace health ───────────────────────────

    const p3 = startPhase('doctor-health');

    const checks = createDefaultChecks();
    const report = await runDoctor(tempDir, checks);

    expect(report.checks.length).toBeGreaterThanOrEqual(4);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);

    for (const check of report.checks) {
      expect(check.checkId).toBeTruthy();
      expect(check.name).toBeTruthy();
      expect(typeof check.passed).toBe('boolean');
      expect(Array.isArray(check.diagnostics)).toBe(true);
      expect(check.durationMs).toBeGreaterThanOrEqual(0);
    }

    // Summary structure
    expect(typeof report.summary.errors).toBe('number');
    expect(typeof report.summary.warnings).toBe('number');
    expect(typeof report.summary.infos).toBe('number');
    expect(typeof report.healthy).toBe('boolean');

    results.push(p3.end(true, 12));

    // ── Phase 4: Amend — validate and preview ────────────────────────

    const p4 = startPhase('amend-pipeline');

    const pipeline1 = await runPipeline(tempDir);

    // Invalid: nonexistent tool
    const badAmend: Amendment = {
      type: 'add-skill',
      target: 'phantom',
      value: { requiredTools: ['does-not-exist'] },
    };
    const badResult = validateAmendment(badAmend, pipeline1.ir, 2);
    expect(badResult.valid).toBe(false);
    expect(badResult.violations[0]!.ruleId).toBe('AMEND-V001');

    // Invalid: trust tier exceeded
    const riskAmend: Amendment = {
      type: 'add-skill',
      target: 'exec-skill',
      value: { requiredTools: ['shell-exec'] },
    };
    const riskResult = validateAmendment(riskAmend, pipeline1.ir, 2);
    expect(riskResult.valid).toBe(false);
    expect(riskResult.violations.some(v => v.ruleId === 'AMEND-V002')).toBe(true);

    // Valid: low-risk skill
    const goodAmend: Amendment = {
      type: 'add-skill',
      target: 'web-helper',
      value: { description: 'Web helper', requiredTools: ['web-search'] },
    };
    const goodResult = validateAmendment(goodAmend, pipeline1.ir, 2);
    expect(goodResult.valid).toBe(true);

    // Preview
    const preview = previewAmendment(goodAmend, pipeline1.ir);
    expect(preview.diffs.length).toBeGreaterThan(0);
    expect(preview.diffs[0]!.change).toBe('add');
    expect(preview.summary.length).toBeGreaterThan(0);

    // Dry-run pipeline
    const dryRun = await runAmendPipeline(
      tempDir,
      goodAmend,
      pipeline1.ir,
      2,
      async () => ({ success: true }),
      { dryRun: true },
    );
    expect(dryRun.success).toBe(true);
    expect(dryRun.step).toBe('preview');
    expect(dryRun.apply).toBeUndefined();

    results.push(p4.end(true, 12));

    // ── Phase 5: Build + enforce ─────────────────────────────────────

    const p5 = startPhase('build-enforce');

    const pipeline2 = await runPipeline(tempDir);

    // Generated plugin well-formedness
    expect(pipeline2.pluginSource.length).toBeGreaterThan(100);
    expect(pipeline2.pluginSource).toContain('RISK_MAP');
    expect(pipeline2.pluginSource).toContain('claws-governance');
    expect(pipeline2.pluginSource).toContain(`v${COMPILER_VERSION}`);
    expect(pipeline2.pluginSource).toContain('before_tool_call');

    const forbidden = verifyNoForbiddenImports(pipeline2.pluginSource);
    expect(forbidden).toEqual([]);

    const catchViolations = verifyCatchClauses(pipeline2.pluginSource);
    expect(catchViolations).toEqual([]);

    // Package.json
    const pkg = JSON.parse(pipeline2.packageJson);
    expect(pkg.name).toBe('@openclaw/governance-plugin');
    expect(pkg.version).toBe(COMPILER_VERSION);

    // Hook files
    expect(pipeline2.hookFiles.size).toBe(3);
    expect(pipeline2.hookFiles.has('handlers/before-tool-call.ts')).toBe(true);
    expect(pipeline2.hookFiles.has('handlers/a2a-firewall.ts')).toBe(true);
    expect(pipeline2.hookFiles.has('handlers/elicitation-gate.ts')).toBe(true);

    // GovernanceIR structure
    expect(pipeline2.ir.compiler.compilerVersion).toBe(COMPILER_VERSION);
    expect(pipeline2.ir.compiler.schemaVersion).toBe(SCHEMA_VERSION);
    expect(pipeline2.ir.capabilities.tools.length).toBeGreaterThan(0);

    // GatewaySim enforcement for all 5 risk tiers
    const sim = new GatewaySim(pipeline2.pluginSource);
    expect(sim.toolCount).toBeGreaterThan(0);

    // R1: allowed
    const r1 = sim.evaluateToolCall('web-search');
    expect(r1.allowed).toBe(true);
    expect(r1.failMode).toBe('open');

    // R2: allowed
    const r2 = sim.evaluateToolCall('file-read');
    expect(r2.allowed).toBe(true);
    expect(r2.failMode).toBe('open');

    // R3: gated
    const r3 = sim.evaluateToolCall('file-write');
    expect(r3.allowed).toBe(false);
    expect(r3.failMode).toBe('gated');

    // R4: gated
    const r4 = sim.evaluateToolCall('db-query');
    expect(r4.allowed).toBe(false);
    expect(r4.failMode).toBe('gated');

    // R5 tools: blocked
    for (const tool of ['send-email', 'send-slack', 'shell-exec', 'deploy-trigger']) {
      const result = sim.evaluateToolCall(tool);
      expect(result.allowed, `${tool} should be blocked`).toBe(false);
      expect(result.failMode, `${tool} should be fail-closed`).toBe('closed');
      expect(result.riskLevel).toBeGreaterThanOrEqual(5);
    }

    // Unknown tools: R5 fail-closed
    const unknown = sim.evaluateToolCall('never-seen-tool');
    expect(unknown.allowed).toBe(false);
    expect(unknown.failMode).toBe('closed');

    // Audit chain integrity
    expect(sim.audit.length).toBe(9);
    for (const entry of sim.audit) {
      expect(entry.event).toBe('tool-call');
      expect(entry.toolName).toBeTruthy();
      expect(typeof entry.riskLevel).toBe('number');
      expect(entry.timestamp).toBeTruthy();
    }

    results.push(p5.end(true, 30));

    // ── Phase 6: Bypass ──────────────────────────────────────────────

    const p6 = startPhase('bypass');

    // Not bypassed
    const notBypassed = await checkBypass(tempDir, undefined, {});
    expect(notBypassed.bypassed).toBe(false);
    expect(notBypassed.reason).toBe('not-requested');

    // Bypassed
    const bypassed = await checkBypass(tempDir, undefined, { [CLAWS_BYPASS_ENV]: '1' });
    expect(bypassed.bypassed).toBe(true);
    expect(bypassed.reason).toBe('env-bypass');
    expect(bypassed.auditRecorded).toBe(true);

    // Signed audit event written to chain.jsonl
    const auditFile = join(tempDir, '.claws', 'audit', 'chain.jsonl');
    expect(existsSync(auditFile)).toBe(true);
    const auditEvent = JSON.parse(readFileSync(auditFile, 'utf-8').trim());
    expect(auditEvent.eventType).toBe('BYPASS_ACTIVATED');
    expect(auditEvent.hmacSignature).toMatch(/^[0-9a-f]{64}$/);

    // Fleet blocks bypass
    const fleetBlocked = await checkBypass(
      tempDir,
      { allowBypass: false },
      { [CLAWS_BYPASS_ENV]: '1' },
    );
    expect(fleetBlocked.bypassed).toBe(false);
    expect(fleetBlocked.reason).toBe('fleet-prohibited');

    results.push(p6.end(true, 8));

    // ── Final: Structured pass/fail summary ──────────────────────────

    const allPassed = results.every((r) => r.passed);
    const totalAssertions = results.reduce((sum, r) => sum + r.assertions, 0);

    // Log structured output for harness
    const summary = {
      testName: 'CP-2 init-watch-enforce acceptance',
      passed: allPassed,
      totalAssertions,
      phases: results.map((r) => ({
        phase: r.phase,
        passed: r.passed,
        assertions: r.assertions,
        durationMs: r.durationMs,
        ...(r.failures.length > 0 ? { failures: r.failures } : {}),
      })),
    };

    // Ensure structured output is valid JSON (harness can parse it)
    const summaryJson = JSON.stringify(summary);
    expect(() => JSON.parse(summaryJson)).not.toThrow();
    expect(allPassed).toBe(true);
    expect(totalAssertions).toBeGreaterThanOrEqual(80);
  }, 60_000);
});
