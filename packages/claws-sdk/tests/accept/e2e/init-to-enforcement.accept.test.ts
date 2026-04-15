/**
 * L3: Init-to-enforcement acceptance test — formal CP-1 gate contract.
 *
 * Same pipeline as the L2 e2e test (full workspace variant) but with
 * formal acceptance assertions that validate:
 * 1. claws.json schema after manual setup
 * 2. .claws/ sidecar directory structure (all 13 subdirectories)
 * 3. Violation count and severity distribution
 * 4. Generated artifact presence and well-formedness
 * 5. GatewaySim enforcement for all 5 risk tiers
 *
 * This is the checkpoint gate for CP-1 (Foundation).
 *
 * @module claws-sdk/tests/accept/e2e/init-to-enforcement
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
} from 'node:fs';
import { tmpdir } from 'node:os';

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
import {
  CLAWS_SIDECAR_LAYOUT,
  CLAWS_SIDECAR_VERSION,
  CLAWS_GITIGNORE_DIRS,
} from '../../../src/types/sidecar.js';
import { scaffoldSidecar as initSidecar } from '../../../src/init/sidecar-scaffold.js';
import { CLAWS_CONFIG_FILE } from '../../../src/types/sidecar.js';
import { loadConfig } from '../../../src/config/loader.js';
import { ClawsConfigSchema } from '../../../src/config/types.js';
import { COMPILER_VERSION, SCHEMA_VERSION } from '../../../src/compile/version.js';
import type { GovernanceIR } from '../../../src/ir/governance-ir.js';

// ── Fixtures ──────────────────────────────────────────────────────────

const FIXTURES = resolve(__dirname, '../../fixtures');
const REFERENCE_WORKSPACE = resolve(FIXTURES, 'oc-reference-workspace');

// ── Default claws.json for T2 workspace ───────────────────────────────

const DEFAULT_CLAWS_CONFIG = {
  trustTier: 2,
  suppressions: [] as string[],
  policySet: 'default',
  auditLevel: 'full',
  failMode: {
    R1: 'open',
    R2: 'open',
    R3: 'gated',
    R4: 'gated',
    R5: 'closed',
  },
};

// ── GatewaySim ────────────────────────────────────────────────────────

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

  getRiskLevel(toolName: string): number | undefined {
    return this.riskMap.get(toolName);
  }

  getAllRiskLevels(): ReadonlyMap<string, number> {
    return this.riskMap;
  }
}

// ── Pipeline helper ───────────────────────────────────────────────────

async function runPipeline(workspaceDir: string): Promise<{
  ir: GovernanceIR;
  pluginSource: string;
  packageJson: string;
  hookFiles: ReadonlyMap<string, string>;
  warnings: readonly string[];
  violationCount: number;
  riskMap: ReadonlyArray<{ toolName: string; riskLevel: number; failMode: string }>;
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
    warnings: emitResult.warnings,
    violationCount: analysis.violations.length,
    riskMap: [...emitResult.riskMap],
  };
}

// ── Cleanup tracking ──────────────────────────────────────────────────

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
  tempDirs.length = 0;
});

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'claws-accept-init-'));
  tempDirs.push(dir);
  return dir;
}

// ── Acceptance Test ───────────────────────────────────────────────────

describe('accept: init-to-enforcement (CP-1 gate)', () => {
  it('full pipeline: manual config → check → build → enforce for all 5 risk tiers', async () => {
    // ── Phase 1: Workspace setup ──────────────────────────────────────

    const tempDir = createTempDir();

    // Copy all OC source files (excluding claws config and expected outputs)
    const sourceFiles = [
      'SOUL.md', 'TOOLS.md', 'AGENTS.md', 'IDENTITY.md',
      'USER.md', 'MEMORY.md', 'HEARTBEAT.md',
      'openclaw.json', 'lobster.yaml',
    ];
    for (const file of sourceFiles) {
      const src = resolve(REFERENCE_WORKSPACE, file);
      if (existsSync(src)) {
        cpSync(src, join(tempDir, file));
      }
    }
    const skillsDir = resolve(REFERENCE_WORKSPACE, 'skills');
    if (existsSync(skillsDir)) {
      cpSync(skillsDir, join(tempDir, 'skills'), { recursive: true });
    }

    // Manually create claws.json + .claws/ sidecar
    writeFileSync(
      join(tempDir, 'claws.json'),
      JSON.stringify(DEFAULT_CLAWS_CONFIG, null, 2),
    );
    await initSidecar(tempDir);

    // ── Acceptance: claws.json matches expected schema ────────────────

    const rawConfig = JSON.parse(readFileSync(join(tempDir, 'claws.json'), 'utf-8'));
    const parseResult = ClawsConfigSchema.safeParse(rawConfig);
    expect(parseResult.success).toBe(true);

    const config = parseResult.data!;
    expect(config.trustTier).toBe(2);
    expect(config.suppressions).toEqual([]);
    expect(config.policySet).toBe('default');
    expect(config.auditLevel).toBe('full');
    expect(config.failMode.R1).toBe('open');
    expect(config.failMode.R2).toBe('open');
    expect(config.failMode.R3).toBe('gated');
    expect(config.failMode.R4).toBe('gated');
    expect(config.failMode.R5).toBe('closed');

    // Verify loadConfig agrees
    const loadResult = await loadConfig(tempDir);
    expect(loadResult.found).toBe(true);
    expect(loadResult.config.trustTier).toBe(2);

    // ── Acceptance: .claws/ sidecar has expected structure ─────────────

    // All 13 subdirectories must exist
    const allDirs = Object.values(CLAWS_SIDECAR_LAYOUT);
    expect(allDirs).toHaveLength(13);
    for (const dir of allDirs) {
      const fullPath = join(tempDir, dir);
      expect(existsSync(fullPath), `${dir} should exist`).toBe(true);
    }

    // .gitignore must exist inside .claws/
    const gitignorePath = join(tempDir, '.claws', '.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);
    const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
    // Must contain entries for sensitive directories
    for (const sensitive of CLAWS_GITIGNORE_DIRS) {
      const relative = sensitive.replace(/^\.claws\//, '');
      expect(gitignoreContent).toContain(`${relative}/`);
    }

    // ── Phase 2: Check pipeline ───────────────────────────────────────

    const pipeline = await runPipeline(tempDir);

    // ── Acceptance: violation count and severity distribution ──────────

    // The reference workspace has intentional violations (7 in expected-violations.json)
    expect(pipeline.violationCount).toBeGreaterThan(0);

    // Verify all violations have proper structure
    for (const v of pipeline.ir.analysis.violations) {
      expect(v.ruleId).toBeTruthy();
      expect(v.level).toBeGreaterThanOrEqual(1);
      expect(v.level).toBeLessThanOrEqual(5);
      expect(v.message.length).toBeGreaterThan(0);
      expect(v.target.length).toBeGreaterThan(0);
      expect(v.diagnosticCode).toMatch(/^CLAWS-/);
      expect(Array.isArray(v.fixSuggestions)).toBe(true);
      expect(Array.isArray(v.toolFuzzyMatches)).toBe(true);
    }

    // At least some violations should be high severity (level 3+)
    const highSeverity = pipeline.ir.analysis.violations.filter(v => v.level >= 3);
    expect(highSeverity.length).toBeGreaterThan(0);

    // ── Phase 3: Build pipeline ───────────────────────────────────────

    // ── Acceptance: all generated artifacts present and well-formed ────

    // Plugin source (index.ts equivalent)
    expect(pipeline.pluginSource.length).toBeGreaterThan(100);
    expect(pipeline.pluginSource).toContain('RISK_MAP');
    expect(pipeline.pluginSource).toContain('ReadonlyMap<string, number>');
    expect(pipeline.pluginSource).toContain('before_tool_call');
    expect(pipeline.pluginSource).toContain('claws-governance');
    expect(pipeline.pluginSource).toContain(`v${COMPILER_VERSION}`);

    // No forbidden imports in generated source
    const forbidden = verifyNoForbiddenImports(pipeline.pluginSource);
    expect(forbidden).toEqual([]);

    // Catch clause verification
    const catchViolations = verifyCatchClauses(pipeline.pluginSource);
    expect(catchViolations).toEqual([]);

    // Package.json (manifest.json equivalent)
    const pkg = JSON.parse(pipeline.packageJson);
    expect(pkg.name).toBe('@openclaw/governance-plugin');
    expect(pkg.version).toBe(COMPILER_VERSION);
    expect(pkg.type).toBe('module');
    expect(pkg.main).toBe('index.ts');

    // Hook handler files
    expect(pipeline.hookFiles.size).toBe(3);
    expect(pipeline.hookFiles.has('handlers/before-tool-call.ts')).toBe(true);
    expect(pipeline.hookFiles.has('handlers/a2a-firewall.ts')).toBe(true);
    expect(pipeline.hookFiles.has('handlers/elicitation-gate.ts')).toBe(true);

    // Each hook file must have no forbidden imports
    for (const [name, content] of pipeline.hookFiles) {
      const hookForbidden = verifyNoForbiddenImports(content);
      expect(hookForbidden, `${name} should have no forbidden imports`).toEqual([]);
    }

    // ── Acceptance: GovernanceIR structure ─────────────────────────────

    expect(pipeline.ir.compiler.compilerVersion).toBe(COMPILER_VERSION);
    expect(pipeline.ir.compiler.schemaVersion).toBe(SCHEMA_VERSION);
    expect(pipeline.ir.compiler.compiledAt).toBeTruthy();

    // Capabilities should reflect workspace contents
    expect(pipeline.ir.capabilities.tools.length).toBeGreaterThan(0);

    // Conflict report structure
    expect(pipeline.ir.conflicts).toBeDefined();
    expect(Array.isArray(pipeline.ir.conflicts.oboConflicts)).toBe(true);
    expect(Array.isArray(pipeline.ir.conflicts.multiConstraintConflicts)).toBe(true);
    expect(typeof pipeline.ir.conflicts.totalConflicts).toBe('number');

    // ── Phase 4: Enforcement ──────────────────────────────────────────

    const sim = new GatewaySim(pipeline.pluginSource);
    expect(sim.toolCount).toBeGreaterThan(0);

    // ── Acceptance: GatewaySim enforcement for all 5 risk tiers ───────

    // R1 tools: should be allowed (fail-open)
    const r1Result = sim.evaluateToolCall('web-search');
    expect(r1Result.allowed).toBe(true);
    expect(r1Result.failMode).toBe('open');
    expect(r1Result.riskLevel).toBeLessThanOrEqual(2);

    // R2 tools: should be allowed (fail-open)
    const r2Result = sim.evaluateToolCall('file-read');
    expect(r2Result.allowed).toBe(true);
    expect(r2Result.failMode).toBe('open');
    expect(r2Result.riskLevel).toBeLessThanOrEqual(2);

    // R3 tools: should be gated (require approval)
    const r3Result = sim.evaluateToolCall('file-write');
    expect(r3Result.allowed).toBe(false);
    expect(r3Result.failMode).toBe('gated');
    expect(r3Result.riskLevel).toBe(3);

    // R4 tools: should be gated (require approval)
    const r4Result = sim.evaluateToolCall('db-query');
    expect(r4Result.allowed).toBe(false);
    expect(r4Result.failMode).toBe('gated');
    expect(r4Result.riskLevel).toBeGreaterThanOrEqual(3);

    // R5 tools: should be blocked (fail-closed)
    const r5Tools = ['send-email', 'send-slack', 'shell-exec', 'deploy-trigger'];
    for (const tool of r5Tools) {
      const result = sim.evaluateToolCall(tool);
      expect(result.allowed, `${tool} should be blocked`).toBe(false);
      expect(result.failMode, `${tool} should be fail-closed`).toBe('closed');
      expect(result.riskLevel, `${tool} should be R5`).toBeGreaterThanOrEqual(5);
    }

    // Unknown tools default to R5 fail-closed
    const unknownResult = sim.evaluateToolCall('never-seen-before');
    expect(unknownResult.allowed).toBe(false);
    expect(unknownResult.riskLevel).toBe(5);
    expect(unknownResult.failMode).toBe('closed');

    // Audit log should capture all tool calls
    // We made: web-search, file-read, file-write, db-query, 4 R5 tools, 1 unknown = 9
    expect(sim.audit.length).toBe(9);
    for (const entry of sim.audit) {
      expect(entry.event).toBe('tool-call');
      expect(entry.toolName).toBeTruthy();
      expect(typeof entry.riskLevel).toBe('number');
      expect(entry.timestamp).toBeTruthy();
    }
  }, 60_000);
});
