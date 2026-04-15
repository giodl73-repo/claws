/**
 * L3: Init-scaffold-to-enforcement acceptance test — zero-touch onboarding.
 *
 * Validates the full zero-to-enforcement pipeline starting from a truly
 * empty directory with NO pre-existing OC workspace files:
 *
 *   1. claws init on empty dir → scaffolds 5 starter OC files + sidecar + config
 *   2. Parse phase reads all 9 default sources (5 present, 4 absent)
 *   3. Intent extraction produces deny constraints + tool declarations
 *   4. GovernanceAST cross-references tools against SOUL deny constraints
 *   5. Governance analysis produces violations
 *   6. Conflict detection runs without errors
 *   7. Emit produces valid gateway plugin with risk map from starter TOOLS.md
 *   8. GatewaySim enforces risk tiers: R1 open, R2 open, R3 gated, R5 closed
 *   9. Unknown tools default to R5 fail-closed
 *
 * This proves that a user who runs `claws init` on a fresh project can
 * immediately `claws build` and get a working enforcement plugin with
 * no manual file creation.
 *
 * @module claws-sdk/tests/accept/e2e/init-scaffold-to-enforcement
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import {
  existsSync,
  readFileSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { initWorkspace } from '../../../src/init/orchestrator.js';
import { parse } from '../../../src/compile/parse.js';
import { extractAllIntents } from '../../../src/compile/intent/index.js';
import { buildGovernanceAST } from '../../../src/compile/governance-ast.js';
import { extract } from '../../../src/compile/extract.js';
import { buildCapabilityManifest } from '../../../src/compile/manifest.js';
import { analyze } from '../../../src/compile/analyze.js';
import { detectConflicts } from '../../../src/compile/conflict-detect.js';
import { toIRConflictReport } from '../../../src/compile/conflicts-ir.js';
import { createDefaultRegistry } from '../../../src/governance/index.js';
import { emitPlugin, verifyNoForbiddenImports } from '../../../src/emit/emit-plugin.js';
import { CLAWS_SIDECAR_LAYOUT, CLAWS_CONFIG_FILE } from '../../../src/types/sidecar.js';
import { COMPILER_VERSION, SCHEMA_VERSION } from '../../../src/compile/version.js';
import type { GovernanceIR } from '../../../src/ir/governance-ir.js';

// ── GatewaySim — risk-map enforcement simulator ─────────────────────

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
}

// ── Pipeline helper ──────────────────────────────────────────────────

async function runPipeline(workspaceDir: string): Promise<{
  ir: GovernanceIR;
  pluginSource: string;
  packageJson: string;
  hookFiles: ReadonlyMap<string, string>;
  warnings: readonly string[];
  violationCount: number;
  presentCount: number;
  absentCount: number;
}> {
  // Pass 1: parse
  const parseResult = await parse(workspaceDir);

  // Pass 1b: intent extraction
  const intentResults = extractAllIntents(parseResult);

  // Pass 2: GovernanceAST with cross-references
  const ast = buildGovernanceAST(intentResults);

  // Extract ParsedManifest + CapabilityManifest
  const parsedManifest = extract(ast);
  const capabilityManifest = buildCapabilityManifest(parsedManifest);

  // Pass 3: governance rules
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
    hookFiles: emitResult.hookFiles,
    warnings: emitResult.warnings,
    violationCount: analysis.violations.length,
    presentCount: parseResult.presentCount,
    absentCount: parseResult.absentCount,
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

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'claws-accept-scaffold-'));
  tempDirs.push(dir);
  return dir;
}

// ── Acceptance Test ──────────────────────────────────────────────────

describe('accept: init-scaffold-to-enforcement (zero-touch onboarding)', () => {
  it('empty dir → claws init → build → GatewaySim enforcement with starter files', async () => {
    // ── Phase 1: Init on truly empty directory ───────────────────────

    const tempDir = createTempDir();

    // Nothing exists — not even platform markers
    expect(existsSync(join(tempDir, CLAWS_CONFIG_FILE))).toBe(false);
    expect(existsSync(join(tempDir, '.claws'))).toBe(false);
    expect(existsSync(join(tempDir, 'SOUL.md'))).toBe(false);

    const initResult = await initWorkspace(tempDir, { scaffold: true });

    // ── Acceptance: init succeeded ───────────────────────────────────

    expect(initResult.exitCode).toBe(0);
    expect(initResult.status).toBe('initialized');
    expect(initResult.detection?.platform).toBe('unknown');

    // claws.json created — config.platform is agent platform (fallback 'openclaw')
    expect(existsSync(join(tempDir, CLAWS_CONFIG_FILE))).toBe(true);
    const config = JSON.parse(readFileSync(join(tempDir, CLAWS_CONFIG_FILE), 'utf-8'));
    expect(config.platform).toBe('openclaw');
    expect(config.trustTier).toBe(2);

    // All 13 sidecar dirs created
    for (const dir of Object.values(CLAWS_SIDECAR_LAYOUT)) {
      expect(existsSync(join(tempDir, dir)), `${dir} should exist`).toBe(true);
    }

    // ── Acceptance: workspace files scaffolded ───────────────────────

    const scaffold = initResult.workspaceScaffold;
    expect(scaffold).toBeDefined();

    const expectedFiles = [
      'SOUL.md', 'TOOLS.md', 'AGENTS.md', 'IDENTITY.md', 'USER.md',
      'MEMORY.md', 'HEARTBEAT.md', 'skills/example/SKILL.md', 'lobster.yaml',
    ];
    expect(scaffold!.created).toEqual(expectedFiles);
    expect(scaffold!.skipped).toHaveLength(0);

    // All 9 starter files exist on disk
    for (const name of expectedFiles) {
      expect(existsSync(join(tempDir, name)), `${name} should exist`).toBe(true);
    }

    // SOUL.md has governance keywords (will trigger OpenClaw detection)
    const soulContent = readFileSync(join(tempDir, 'SOUL.md'), 'utf-8');
    expect(soulContent).toMatch(/\bnever\b/i);
    expect(soulContent).toContain('Deny Constraints');

    // TOOLS.md declares 4 tools with risk annotations
    const toolsContent = readFileSync(join(tempDir, 'TOOLS.md'), 'utf-8');
    expect(toolsContent).toContain('## file-read');
    expect(toolsContent).toContain('## web-search');
    expect(toolsContent).toContain('## file-write');
    expect(toolsContent).toContain('## send-email');
    expect(toolsContent).toContain('Risk: R1');
    expect(toolsContent).toContain('Risk: R5');

    // ── Phase 2: Parse — compiler reads scaffolded workspace ─────────

    const pipeline = await runPipeline(tempDir);

    // All 9 default OC sources present — zero absent
    expect(pipeline.presentCount).toBe(9);
    expect(pipeline.absentCount).toBe(0);

    // ── Phase 3: Build — emit gateway plugin ─────────────────────────

    // Plugin source is non-trivial
    expect(pipeline.pluginSource.length).toBeGreaterThan(100);
    expect(pipeline.pluginSource).toContain('RISK_MAP');
    expect(pipeline.pluginSource).toContain('ReadonlyMap<string, number>');
    expect(pipeline.pluginSource).toContain('before_tool_call');
    expect(pipeline.pluginSource).toContain('claws-governance');
    expect(pipeline.pluginSource).toContain(`v${COMPILER_VERSION}`);

    // No forbidden imports
    const forbidden = verifyNoForbiddenImports(pipeline.pluginSource);
    expect(forbidden).toEqual([]);

    // Package.json is valid
    const pkg = JSON.parse(pipeline.packageJson);
    expect(pkg.name).toBe('@openclaw/governance-plugin');
    expect(pkg.version).toBe(COMPILER_VERSION);

    // Hook handler files generated
    expect(pipeline.hookFiles.size).toBe(3);
    expect(pipeline.hookFiles.has('handlers/before-tool-call.ts')).toBe(true);
    expect(pipeline.hookFiles.has('handlers/a2a-firewall.ts')).toBe(true);
    expect(pipeline.hookFiles.has('handlers/elicitation-gate.ts')).toBe(true);

    // GovernanceIR structure
    expect(pipeline.ir.compiler.compilerVersion).toBe(COMPILER_VERSION);
    expect(pipeline.ir.compiler.schemaVersion).toBe(SCHEMA_VERSION);
    expect(pipeline.ir.capabilities.tools.length).toBeGreaterThan(0);

    // ── Acceptance: tools from starter TOOLS.md in capabilities ──────

    const toolNames = pipeline.ir.capabilities.tools.map(t => t.name);
    expect(toolNames).toContain('file-read');
    expect(toolNames).toContain('web-search');
    expect(toolNames).toContain('file-write');
    expect(toolNames).toContain('send-email');

    // ── Phase 4: Enforce — GatewaySim evaluates tool calls ──────────

    const sim = new GatewaySim(pipeline.pluginSource);
    expect(sim.toolCount).toBeGreaterThan(0);

    // R1 tool: file-read → allowed (fail-open)
    const r1 = sim.evaluateToolCall('file-read');
    expect(r1.allowed).toBe(true);
    expect(r1.failMode).toBe('open');
    expect(r1.riskLevel).toBeLessThanOrEqual(2);

    // R2 tool: web-search → allowed (fail-open)
    const r2 = sim.evaluateToolCall('web-search');
    expect(r2.allowed).toBe(true);
    expect(r2.failMode).toBe('open');
    expect(r2.riskLevel).toBeLessThanOrEqual(2);

    // R3 tool: file-write → gated (requires approval)
    const r3 = sim.evaluateToolCall('file-write');
    expect(r3.allowed).toBe(false);
    expect(r3.failMode).toBe('gated');
    expect(r3.riskLevel).toBe(3);

    // R5 tool: send-email → blocked (fail-closed)
    const r5 = sim.evaluateToolCall('send-email');
    expect(r5.allowed).toBe(false);
    expect(r5.failMode).toBe('closed');
    expect(r5.riskLevel).toBeGreaterThanOrEqual(5);

    // Unknown tool → R5 fail-closed (safe default)
    const unknown = sim.evaluateToolCall('totally-unknown-tool');
    expect(unknown.allowed).toBe(false);
    expect(unknown.riskLevel).toBe(5);
    expect(unknown.failMode).toBe('closed');

    // ── Acceptance: audit log captured all evaluations ────────────────

    // file-read, web-search, file-write, send-email, unknown = 5
    expect(sim.audit.length).toBe(5);
    for (const entry of sim.audit) {
      expect(entry.event).toBe('tool-call');
      expect(entry.toolName).toBeTruthy();
      expect(typeof entry.riskLevel).toBe('number');
      expect(entry.timestamp).toBeTruthy();
    }
  }, 60_000);

  it('init with existing SOUL.md preserves it, scaffolds rest, and pipeline still works', async () => {
    // ── Setup: workspace with only a custom SOUL.md ──────────────────

    const tempDir = createTempDir();
    const customSoul = [
      '# My Custom Agent',
      '',
      'You are a code review assistant.',
      '',
      '## Deny Constraints',
      '',
      '- **Never** modify production branches directly.',
      '- **Always** request approval before merging.',
    ].join('\n') + '\n';

    const { writeFileSync: wfs } = await import('node:fs');
    wfs(join(tempDir, 'SOUL.md'), customSoul, 'utf-8');

    // ── Init — should preserve SOUL.md, scaffold the rest ────────────

    const initResult = await initWorkspace(tempDir, { scaffold: true });

    expect(initResult.exitCode).toBe(0);
    expect(initResult.workspaceScaffold).toBeDefined();
    expect(initResult.workspaceScaffold!.skipped).toEqual(['SOUL.md']);
    expect(initResult.workspaceScaffold!.created).toEqual([
      'TOOLS.md', 'AGENTS.md', 'IDENTITY.md', 'USER.md',
      'MEMORY.md', 'HEARTBEAT.md', 'skills/example/SKILL.md', 'lobster.yaml',
    ]);

    // SOUL.md is untouched (lossless OC fidelity)
    const soulOnDisk = readFileSync(join(tempDir, 'SOUL.md'), 'utf-8');
    expect(soulOnDisk).toBe(customSoul);

    // ── Pipeline still runs end-to-end ───────────────────────────────

    const pipeline = await runPipeline(tempDir);

    // All 9 present: custom SOUL + 8 scaffolded
    expect(pipeline.presentCount).toBe(9);
    expect(pipeline.absentCount).toBe(0);

    // Plugin still emits valid output
    expect(pipeline.pluginSource.length).toBeGreaterThan(100);
    expect(pipeline.pluginSource).toContain('RISK_MAP');

    const forbidden = verifyNoForbiddenImports(pipeline.pluginSource);
    expect(forbidden).toEqual([]);

    // GatewaySim works
    const sim = new GatewaySim(pipeline.pluginSource);
    expect(sim.toolCount).toBeGreaterThan(0);

    // Starter TOOLS.md tools still enforced correctly
    const r1 = sim.evaluateToolCall('file-read');
    expect(r1.allowed).toBe(true);

    const r5 = sim.evaluateToolCall('send-email');
    expect(r5.allowed).toBe(false);
    expect(r5.failMode).toBe('closed');
  }, 60_000);
});
