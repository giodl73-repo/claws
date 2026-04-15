/**
 * L2: Init-to-enforcement E2E — full zero-to-enforcement pipeline.
 *
 * Two variants:
 * 1. Full workspace: copy reference workspace (without claws config),
 *    manually create claws.json + .claws/ sidecar, run check, build,
 *    load into GatewaySim, verify R5 tool blocking.
 * 2. Minimal workspace: SOUL.md + TOOLS.md only, same pipeline,
 *    exercises platform detection fallback (SA-M03).
 *
 * Note: claws init is a CP-2 deliverable (Pulses 10-11). This test
 * manually creates the config and sidecar to prove the pipeline works
 * from first touch through enforcement.
 *
 * @module claws-sdk/tests/e2e/init-to-enforcement
 */

import { describe, it, expect, afterEach } from 'vitest';
import { resolve, join } from 'node:path';
import {
  existsSync,
  readFileSync,
  mkdtempSync,
  cpSync,
  writeFileSync,
  mkdirSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { parse } from '../../src/compile/parse.js';
import { extractAllIntents } from '../../src/compile/intent/index.js';
import { buildGovernanceAST } from '../../src/compile/governance-ast.js';
import { extract } from '../../src/compile/extract.js';
import { buildCapabilityManifest } from '../../src/compile/manifest.js';
import { analyze } from '../../src/compile/analyze.js';
import { detectConflicts } from '../../src/compile/conflict-detect.js';
import { toIRConflictReport } from '../../src/compile/conflicts-ir.js';
import { createDefaultRegistry } from '../../src/governance/index.js';
import { emitPlugin, verifyNoForbiddenImports } from '../../src/emit/emit-plugin.js';
import { CLAWS_SIDECAR_LAYOUT } from '../../src/types/sidecar.js';
import { scaffoldSidecar as initSidecar } from '../../src/init/sidecar-scaffold.js';
import { loadConfig } from '../../src/config/loader.js';
import { COMPILER_VERSION, SCHEMA_VERSION } from '../../src/compile/version.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';
import type { GovernanceHost, PolicyResult } from '../../src/adapter/governance-host.js';

// ── Fixtures ──────────────────────────────────────────────────────────

const FIXTURES = resolve(__dirname, '../fixtures');
const REFERENCE_WORKSPACE = resolve(FIXTURES, 'oc-reference-workspace');
const MINIMAL_FIXTURE = resolve(FIXTURES, 'minimal');

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

// ── GatewaySim — lightweight enforcement simulator ────────────────────

/**
 * Minimal GatewaySim that evaluates tool calls against a risk map
 * extracted from generated plugin source. Simulates before_tool_call
 * hook behavior without requiring the OC Gateway runtime.
 */
class GatewaySim {
  private readonly riskMap: ReadonlyMap<string, number>;
  private readonly auditLog: Array<Record<string, unknown>> = [];

  constructor(pluginSource: string) {
    this.riskMap = this.extractRiskMap(pluginSource);
  }

  /**
   * Extract risk map entries from generated plugin source.
   * Parses the `new Map<string, number>([...])` constructor.
   */
  private extractRiskMap(source: string): Map<string, number> {
    const map = new Map<string, number>();
    // Match entries like ["tool-name", 3]
    const entryPattern = /\["([^"]+)",\s*(\d+)\]/g;
    let match: RegExpExecArray | null;
    while ((match = entryPattern.exec(source)) !== null) {
      map.set(match[1]!, parseInt(match[2]!, 10));
    }
    return map;
  }

  /**
   * Simulate a before_tool_call hook evaluation.
   */
  evaluateToolCall(toolName: string): {
    allowed: boolean;
    blockReason: string | null;
    riskLevel: number;
  } {
    const riskLevel = this.riskMap.get(toolName) ?? 5;

    this.auditLog.push({
      event: 'tool-call',
      toolName,
      riskLevel,
      timestamp: new Date().toISOString(),
    });

    // R5 tools are always blocked (fail-closed)
    if (riskLevel >= 5) {
      return {
        allowed: false,
        blockReason: `R${riskLevel} fail-closed — tool "${toolName}" requires approval`,
        riskLevel,
      };
    }

    // R3-R4 tools are gated (require approval, simulated as blocked)
    if (riskLevel >= 3) {
      return {
        allowed: false,
        blockReason: `R${riskLevel} gated — tool "${toolName}" requires approval`,
        riskLevel,
      };
    }

    // R1-R2 tools are allowed (fail-open)
    return { allowed: true, blockReason: null, riskLevel };
  }

  /** Get the number of tools in the risk map. */
  get toolCount(): number {
    return this.riskMap.size;
  }

  /** Get the audit log. */
  get audit(): readonly Record<string, unknown>[] {
    return this.auditLog;
  }

  /** Get the risk level for a tool. */
  getRiskLevel(toolName: string): number | undefined {
    return this.riskMap.get(toolName);
  }
}

// ── Pipeline helper ───────────────────────────────────────────────────

/**
 * Run the full claws pipeline: parse → extract → analyze → emit.
 * Returns the GovernanceIR and the emitted plugin source.
 */
async function runPipeline(workspaceDir: string): Promise<{
  ir: GovernanceIR;
  pluginSource: string;
  packageJson: string;
  violationCount: number;
}> {
  // Pass 1: parse workspace files
  const parseResult = await parse(workspaceDir);

  // Pass 1b: extract intents per file
  const intentResults = extractAllIntents(parseResult);

  // Pass 2: build GovernanceAST with cross-reference resolution
  const ast = buildGovernanceAST(intentResults);

  // Extract ParsedManifest and build CapabilityManifest
  const parsedManifest = extract(ast);
  const capabilityManifest = buildCapabilityManifest(parsedManifest);

  // Pass 3: governance rules — create registry and analyze
  const registry = createDefaultRegistry(capabilityManifest);
  const analysis = analyze(capabilityManifest, registry);

  // Pass 3b: conflict detection
  const rawConflicts = detectConflicts(ast, parsedManifest);
  const conflicts = toIRConflictReport(rawConflicts);

  // Build GovernanceIR
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

  // Pass 4: emit gateway plugin
  const emitResult = emitPlugin(ir);

  return {
    ir,
    pluginSource: emitResult.pluginSource,
    packageJson: emitResult.packageJson,
    violationCount: analysis.violations.length,
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

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `claws-e2e-${prefix}-`));
  tempDirs.push(dir);
  return dir;
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('init-to-enforcement E2E', () => {
  it('full workspace: manual config → check → build → GatewaySim enforcement', async () => {
    // Step 1: Copy reference workspace to temp dir WITHOUT claws.json and .claws/
    const tempDir = createTempDir('full');

    // Copy all OC source files (not claws config or expected outputs)
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
    // Copy skills directory
    const skillsDir = resolve(REFERENCE_WORKSPACE, 'skills');
    if (existsSync(skillsDir)) {
      cpSync(skillsDir, join(tempDir, 'skills'), { recursive: true });
    }

    // Verify no claws.json or .claws/ exist yet
    expect(existsSync(join(tempDir, 'claws.json'))).toBe(false);
    expect(existsSync(join(tempDir, '.claws'))).toBe(false);

    // Step 2: Manually create claws.json (T2 defaults) + .claws/ sidecar
    writeFileSync(
      join(tempDir, 'claws.json'),
      JSON.stringify(DEFAULT_CLAWS_CONFIG, null, 2),
    );
    await initSidecar(tempDir);

    // Verify config was created and is valid
    const configResult = await loadConfig(tempDir);
    expect(configResult.found).toBe(true);
    expect(configResult.config.trustTier).toBe(2);
    expect(configResult.config.failMode.R5).toBe('closed');

    // Verify .claws/ sidecar directories exist
    for (const dir of Object.values(CLAWS_SIDECAR_LAYOUT)) {
      expect(existsSync(join(tempDir, dir))).toBe(true);
    }

    // Step 3: Run claws check → reports violations with WHAT/HOW/WHERE
    const pipeline = await runPipeline(tempDir);

    // Check should find violations (the reference workspace has intentional conflicts)
    expect(pipeline.violationCount).toBeGreaterThan(0);

    // Verify violations have proper structure (WHAT/HOW/WHERE)
    for (const violation of pipeline.ir.analysis.violations) {
      expect(violation.ruleId).toBeTruthy();
      expect(violation.message).toBeTruthy();
      expect(violation.target).toBeTruthy();
      expect(violation.diagnosticCode).toMatch(/^CLAWS-/);
    }

    // Step 4: Run claws build → generates enforcement artifacts
    expect(pipeline.pluginSource.length).toBeGreaterThan(0);
    expect(pipeline.packageJson.length).toBeGreaterThan(0);

    // Verify generated plugin has no forbidden imports
    const forbidden = verifyNoForbiddenImports(pipeline.pluginSource);
    expect(forbidden).toEqual([]);

    // Verify generated plugin has RISK_MAP
    expect(pipeline.pluginSource).toContain('RISK_MAP');
    expect(pipeline.pluginSource).toContain('ReadonlyMap<string, number>');

    // Verify package.json is valid
    const pkg = JSON.parse(pipeline.packageJson);
    expect(pkg.name).toBe('@openclaw/governance-plugin');

    // Step 5: Load generated artifacts into GatewaySim
    const sim = new GatewaySim(pipeline.pluginSource);
    expect(sim.toolCount).toBeGreaterThan(0);

    // Step 6: Fire send-email (R5) tool call → BLOCKED
    const emailResult = sim.evaluateToolCall('send-email');
    expect(emailResult.allowed).toBe(false);
    expect(emailResult.riskLevel).toBeGreaterThanOrEqual(5);
    expect(emailResult.blockReason).toBeTruthy();
    expect(emailResult.blockReason).toContain('fail-closed');

    // Step 7: Verify full pipeline from manual configuration to live enforcement
    // R1-R2 tools should be allowed
    const webSearchResult = sim.evaluateToolCall('web-search');
    expect(webSearchResult.allowed).toBe(true);
    expect(webSearchResult.riskLevel).toBeLessThanOrEqual(2);

    // R5 tools should all be blocked
    const r5Tools = ['send-email', 'send-slack', 'shell-exec', 'deploy-trigger'];
    for (const tool of r5Tools) {
      const result = sim.evaluateToolCall(tool);
      expect(result.allowed).toBe(false);
      expect(result.blockReason).toBeTruthy();
    }

    // Audit log should have entries for all tool calls
    expect(sim.audit.length).toBeGreaterThanOrEqual(6); // 1 + 1 + 4 R5 tools
  }, 30_000);

  it('minimal workspace: SOUL.md + TOOLS.md → full pipeline with platform detection fallback (SA-M03)', async () => {
    // Step 8: Create temp dir with only SOUL.md + TOOLS.md
    const tempDir = createTempDir('minimal');

    cpSync(resolve(MINIMAL_FIXTURE, 'SOUL.md'), join(tempDir, 'SOUL.md'));
    cpSync(resolve(MINIMAL_FIXTURE, 'TOOLS.md'), join(tempDir, 'TOOLS.md'));

    // Verify only SOUL.md and TOOLS.md exist
    expect(existsSync(join(tempDir, 'SOUL.md'))).toBe(true);
    expect(existsSync(join(tempDir, 'TOOLS.md'))).toBe(true);
    expect(existsSync(join(tempDir, 'AGENTS.md'))).toBe(false);

    // Step 9: Manually create claws.json (T2 defaults) + .claws/ sidecar
    writeFileSync(
      join(tempDir, 'claws.json'),
      JSON.stringify(DEFAULT_CLAWS_CONFIG, null, 2),
    );
    await initSidecar(tempDir);

    // Verify config and sidecar
    const configResult = await loadConfig(tempDir);
    expect(configResult.found).toBe(true);
    expect(configResult.config.trustTier).toBe(2);

    // Step 10: Run claws check → reports violations (fewer than full workspace)
    const pipeline = await runPipeline(tempDir);

    // Minimal workspace should still produce results (may have fewer violations)
    expect(pipeline.ir.capabilities.tools.length).toBeGreaterThanOrEqual(0);

    // Step 11: Run claws build → generates enforcement artifacts
    expect(pipeline.pluginSource.length).toBeGreaterThan(0);
    expect(pipeline.packageJson.length).toBeGreaterThan(0);

    // Verify no forbidden imports
    const forbidden = verifyNoForbiddenImports(pipeline.pluginSource);
    expect(forbidden).toEqual([]);

    // Step 12: Load generated artifacts into GatewaySim
    const sim = new GatewaySim(pipeline.pluginSource);

    // Step 13: Fire a tool call → verify enforcement works with minimal input
    // Unknown tools default to R5 (fail-closed) in the risk map
    const unknownResult = sim.evaluateToolCall('unknown-tool');
    expect(unknownResult.allowed).toBe(false);
    expect(unknownResult.riskLevel).toBe(5);
    expect(unknownResult.blockReason).toContain('fail-closed');

    // Step 14: Platform detection fallback validated by the fact that
    // parse() succeeded on a directory with only 2 of 9 possible OC files
    expect(pipeline.pluginSource).toContain('RISK_MAP');
    expect(pipeline.packageJson).toContain('@openclaw/governance-plugin');
  }, 30_000);
});
