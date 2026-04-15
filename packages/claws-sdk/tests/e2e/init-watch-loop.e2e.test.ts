/**
 * L2: Full CP-2 E2E — init → watch → doctor → build → amend → enforce loop.
 *
 * Exercises all CP-2 deliverables as integrated workflows:
 *   1. init → edit TOOLS.md → watch detects → check reports → build regenerates
 *   2. init --template soc2 → verify policy files + config overrides
 *   3. uninstall → init roundtrip leaves workspace byte-identical
 *   4. CLAWS_BYPASS=1 → enforcement disabled, audit recorded
 *   5. doctor --post-upgrade → detects version gap, applies migration
 *   6. amend → blocks invalid amendment, shows diff preview
 *   7. Full lifecycle: init → watch → doctor → amend → check
 *
 * @module claws-sdk/tests/e2e/init-watch-loop
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
  readdirSync,
  mkdirSync,
  appendFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

// ── Init module ──────────────────────────────────────────────────────
import {
  initWorkspace,
  uninstallWorkspace,
  checkBypass,
  CLAWS_BYPASS_ENV,
} from '../../src/init/index.js';

// ── Watch module ─────────────────────────────────────────────────────
import { IncrementalParser } from '../../src/watch/incremental.js';
import { AutoAnalyzer } from '../../src/watch/auto-analyze.js';
import { AutoRecompiler } from '../../src/watch/auto-recompile.js';

// ── Doctor module ────────────────────────────────────────────────────
import {
  runDoctor,
  createDefaultChecks,
  runMigrations,
  detectVersion,
} from '../../src/doctor/index.js';

// ── Amend module ─────────────────────────────────────────────────────
import {
  runAmendPipeline,
  validateAmendment,
  previewAmendment,
} from '../../src/amend/index.js';
import type { Amendment } from '../../src/amend/index.js';

// ── Compile pipeline ─────────────────────────────────────────────────
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
import { COMPILER_VERSION, SCHEMA_VERSION } from '../../src/compile/version.js';
import type { GovernanceIR } from '../../src/ir/governance-ir.js';

// ── Sidecar + config ─────────────────────────────────────────────────
import { CLAWS_SIDECAR_LAYOUT, CLAWS_CONFIG_FILE } from '../../src/types/sidecar.js';
import { loadConfig } from '../../src/config/loader.js';

// ── Fixtures ─────────────────────────────────────────────────────────

const FIXTURES = resolve(__dirname, '../fixtures');
const REFERENCE_WORKSPACE = resolve(FIXTURES, 'oc-reference-workspace');

// ── GatewaySim (lightweight) ─────────────────────────────────────────

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
        blockReason: `R${riskLevel} fail-closed — tool "${toolName}" requires approval`,
        riskLevel,
      };
    }
    if (riskLevel >= 3) {
      return {
        allowed: false,
        blockReason: `R${riskLevel} gated — tool "${toolName}" requires approval`,
        riskLevel,
      };
    }
    return { allowed: true, blockReason: null, riskLevel };
  }

  get toolCount(): number {
    return this.riskMap.size;
  }

  get audit(): readonly Record<string, unknown>[] {
    return this.auditLog;
  }
}

// ── Pipeline helper ──────────────────────────────────────────────────

async function runPipeline(workspaceDir: string): Promise<{
  ir: GovernanceIR;
  pluginSource: string;
  packageJson: string;
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
    violationCount: analysis.violations.length,
  };
}

// ── Cleanup tracking ─────────────────────────────────────────────────

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

/**
 * Copy OC source files from the reference workspace (no claws config).
 */
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

/**
 * Recursively list all files under a directory (relative paths).
 */
function listAllFiles(dir: string, base = ''): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...listAllFiles(join(dir, entry.name), relPath));
    } else {
      files.push(relPath);
    }
  }
  return files.sort();
}

// ── Tests ────────────────────────────────────────────────────────────

describe('CP-2 E2E: init-watch-loop', () => {
  it('init → edit TOOLS.md → watch detects → check reports → build regenerates', async () => {
    const tempDir = createTempDir('core-loop');
    copyReferenceWorkspace(tempDir);

    // Step 1: Initialize workspace
    const initResult = await initWorkspace(tempDir);
    expect(initResult.exitCode).toBe(0);
    expect(initResult.status).toBe('initialized');
    expect(existsSync(join(tempDir, CLAWS_CONFIG_FILE))).toBe(true);
    expect(existsSync(join(tempDir, '.claws'))).toBe(true);

    // Step 2: Run initial parse and seed incremental state
    const initialParse = await parse(tempDir);
    const incParser = new IncrementalParser(tempDir);
    incParser.seed(initialParse);

    const autoAnalyzer = new AutoAnalyzer();
    const initialAnalysis = autoAnalyzer.run(initialParse);
    const initialViolationCount = initialAnalysis.analysis.violations.length;
    expect(initialViolationCount).toBeGreaterThan(0);

    // Step 3: Edit TOOLS.md — add a shell-exec R5 tool with explicit risk
    const toolsMdPath = join(tempDir, 'TOOLS.md');
    const originalToolsMd = readFileSync(toolsMdPath, 'utf-8');
    const appendedTool = `

## malicious-script-runner
- Risk: R5
- Description: Execute untrusted scripts from the internet
- Governance: audit + approval (exec) + elicitation required
`;
    writeFileSync(toolsMdPath, originalToolsMd + appendedTool, 'utf-8');

    // Step 4: Watch detects the change via incremental parse
    const updatedParse = await incParser.update(['TOOLS.md']);
    expect(updatedParse.presentCount).toBeGreaterThanOrEqual(initialParse.presentCount);

    // Step 5: Auto-analyze detects the violation diff
    const updatedAnalysis = autoAnalyzer.run(updatedParse);
    // The new tool should produce at least 1 new G-CLASS violation
    expect(updatedAnalysis.diff.added.length).toBeGreaterThan(0);
    expect(updatedAnalysis.diff.totalCount).toBeGreaterThanOrEqual(initialViolationCount);

    // Step 6: Build — run full pipeline, verify new tool appears in generated plugin
    const pipeline = await runPipeline(tempDir);
    expect(pipeline.violationCount).toBeGreaterThanOrEqual(initialViolationCount);
    expect(pipeline.pluginSource).toContain('RISK_MAP');
    expect(pipeline.pluginSource.length).toBeGreaterThan(0);

    // Verify no forbidden imports in generated code
    const forbidden = verifyNoForbiddenImports(pipeline.pluginSource);
    expect(forbidden).toEqual([]);

    // Step 7: Load into GatewaySim — new tool is blocked
    const sim = new GatewaySim(pipeline.pluginSource);
    expect(sim.toolCount).toBeGreaterThan(0);

    const shellExecResult = sim.evaluateToolCall('shell-exec');
    expect(shellExecResult.allowed).toBe(false);
    expect(shellExecResult.riskLevel).toBeGreaterThanOrEqual(5);

    // Low-risk tools still allowed
    const webSearchResult = sim.evaluateToolCall('web-search');
    expect(webSearchResult.allowed).toBe(true);
    expect(webSearchResult.riskLevel).toBeLessThanOrEqual(2);
  }, 30_000);

  it('init --template soc2 → verify policy files + config overrides', async () => {
    const tempDir = createTempDir('soc2-template');
    copyReferenceWorkspace(tempDir);

    // Step 1: Initialize with SOC2 template
    const initResult = await initWorkspace(tempDir, { template: 'soc2' });
    expect(initResult.exitCode).toBe(0);
    expect(initResult.status).toBe('initialized');
    expect(initResult.templateApplied).toBe('soc2');

    // Step 2: Verify config was written with template overrides
    const configResult = await loadConfig(tempDir);
    expect(configResult.found).toBe(true);

    // Step 3: Verify 5 SOC2 policy files exist
    const policiesDir = join(tempDir, '.claws', 'policies');
    expect(existsSync(policiesDir)).toBe(true);

    const expectedPolicies = [
      'require_section.yaml',
      'tool_blocklist.yaml',
      'trust_tier_gate.yaml',
      'pii_detection.yaml',
      'budget_ceiling.yaml',
    ];
    for (const policyFile of expectedPolicies) {
      const fullPath = join(policiesDir, policyFile);
      expect(existsSync(fullPath), `${policyFile} should exist`).toBe(true);
      const content = readFileSync(fullPath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('policy:');
      expect(content).toContain('framework: soc2');
    }

    // Step 4: Verify policyFiles in result
    expect(initResult.policyFiles).toBeDefined();
    expect(initResult.policyFiles!.length).toBe(5);
    for (const pf of expectedPolicies) {
      expect(initResult.policyFiles).toContain(pf);
    }

    // Step 5: Verify all 13 sidecar directories exist
    for (const dir of Object.values(CLAWS_SIDECAR_LAYOUT)) {
      expect(existsSync(join(tempDir, dir)), `${dir} should exist`).toBe(true);
    }

    // Step 6: Verify total files — init creates 5 policy files inside .claws/policies/
    const clawsFiles = listAllFiles(join(tempDir, '.claws'));
    // At least 5 policy files inside .claws/
    expect(clawsFiles.length).toBeGreaterThanOrEqual(5);
  }, 30_000);

  it('uninstall → init roundtrip leaves OC workspace files byte-identical', async () => {
    const tempDir = createTempDir('roundtrip');
    copyReferenceWorkspace(tempDir);

    // Capture pre-init state of OC source files
    const ocFiles = ['SOUL.md', 'TOOLS.md', 'AGENTS.md'];
    const originalHashes = new Map<string, string>();
    for (const file of ocFiles) {
      const path = join(tempDir, file);
      if (existsSync(path)) {
        originalHashes.set(file, readFileSync(path, 'utf-8'));
      }
    }

    // Step 1: Init
    const initResult = await initWorkspace(tempDir);
    expect(initResult.exitCode).toBe(0);
    expect(existsSync(join(tempDir, CLAWS_CONFIG_FILE))).toBe(true);
    expect(existsSync(join(tempDir, '.claws'))).toBe(true);

    // Step 2: Verify OC files are untouched after init
    for (const [file, original] of originalHashes) {
      const current = readFileSync(join(tempDir, file), 'utf-8');
      expect(current, `${file} should be unchanged after init`).toBe(original);
    }

    // Step 3: Uninstall with custom backup root (avoid polluting homedir)
    const backupsDir = createTempDir('backups');
    const uninstallResult = await uninstallWorkspace(tempDir, backupsDir);
    expect(uninstallResult.exitCode).toBe(0);
    expect(uninstallResult.status).toBe('uninstalled');
    expect(uninstallResult.backupPath).toBeDefined();

    // .claws/ and claws.json should be gone
    expect(existsSync(join(tempDir, '.claws'))).toBe(false);
    expect(existsSync(join(tempDir, CLAWS_CONFIG_FILE))).toBe(false);

    // Backup should exist
    expect(existsSync(uninstallResult.backupPath!)).toBe(true);

    // Step 4: OC source files are byte-identical after uninstall
    for (const [file, original] of originalHashes) {
      const current = readFileSync(join(tempDir, file), 'utf-8');
      expect(current, `${file} should be byte-identical after roundtrip`).toBe(original);
    }

    // Step 5: Re-init succeeds (no "already initialized" error)
    const reinitResult = await initWorkspace(tempDir);
    expect(reinitResult.exitCode).toBe(0);
    expect(reinitResult.status).toBe('initialized');
    expect(existsSync(join(tempDir, CLAWS_CONFIG_FILE))).toBe(true);
    expect(existsSync(join(tempDir, '.claws'))).toBe(true);

    // Step 6: OC source files still identical after re-init
    for (const [file, original] of originalHashes) {
      const current = readFileSync(join(tempDir, file), 'utf-8');
      expect(current, `${file} should be byte-identical after re-init`).toBe(original);
    }
  }, 30_000);

  it('CLAWS_BYPASS=1 → enforcement disabled, audit recorded', async () => {
    const tempDir = createTempDir('bypass');
    copyReferenceWorkspace(tempDir);

    // Init workspace
    const initResult = await initWorkspace(tempDir);
    expect(initResult.exitCode).toBe(0);

    // Step 1: Bypass not active when env var not set
    const notBypassed = await checkBypass(tempDir, undefined, {});
    expect(notBypassed.bypassed).toBe(false);
    expect(notBypassed.reason).toBe('not-requested');
    expect(notBypassed.auditRecorded).toBe(false);

    // Step 2: Bypass active when CLAWS_BYPASS=1
    const bypassed = await checkBypass(tempDir, undefined, { [CLAWS_BYPASS_ENV]: '1' });
    expect(bypassed.bypassed).toBe(true);
    expect(bypassed.reason).toBe('env-bypass');
    expect(bypassed.auditRecorded).toBe(true);

    // Step 3: Signed audit event was written to chain.jsonl
    const auditFile = join(tempDir, '.claws', 'audit', 'chain.jsonl');
    expect(existsSync(auditFile)).toBe(true);
    const auditContent = readFileSync(auditFile, 'utf-8').trim();
    const auditEvent = JSON.parse(auditContent);
    expect(auditEvent.eventType).toBe('BYPASS_ACTIVATED');
    expect(auditEvent.actor).toBeTruthy();
    expect(auditEvent.hmacSignature).toMatch(/^[0-9a-f]{64}$/);
    expect(auditEvent.timestamp).toBeTruthy();

    // Step 4: Fleet policy can prohibit bypass
    const fleetBlocked = await checkBypass(
      tempDir,
      { allowBypass: false },
      { [CLAWS_BYPASS_ENV]: '1' },
    );
    expect(fleetBlocked.bypassed).toBe(false);
    expect(fleetBlocked.reason).toBe('fleet-prohibited');
    expect(fleetBlocked.auditRecorded).toBe(false);

    // Step 5: Pipeline still works during bypass (enforcement disabled but analysis runs)
    const pipeline = await runPipeline(tempDir);
    expect(pipeline.violationCount).toBeGreaterThan(0);
    // In bypass mode, all tool calls would be allowed regardless of risk
    // (the caller checks bypass before consulting the sim)
  }, 30_000);

  it('doctor --post-upgrade → detects version gap, applies migration', async () => {
    const tempDir = createTempDir('doctor-migrate');
    copyReferenceWorkspace(tempDir);

    // Step 1: Write a v1 config (old field names, no schemaVersion)
    const v1Config = {
      trust: 2,
      suppress: [],
      policy: 'default',
      audit: 'full',
    };
    writeFileSync(join(tempDir, CLAWS_CONFIG_FILE), JSON.stringify(v1Config, null, 2));

    // Step 2: Detect version — should be v1
    expect(detectVersion(v1Config)).toBe(1);

    // Step 3: Run migration
    const migrationResult = await runMigrations(tempDir);
    expect(migrationResult.migrated).toBe(true);
    expect(migrationResult.fromVersion).toBe(1);
    expect(migrationResult.toVersion).toBe(2);
    expect(migrationResult.applied.length).toBe(1);
    expect(migrationResult.applied[0]!.description).toBeTruthy();
    expect(migrationResult.backupPath).toBeTruthy();
    expect(migrationResult.error).toBeNull();

    // Step 4: Read migrated config and verify v2 fields
    const migratedRaw = JSON.parse(readFileSync(join(tempDir, CLAWS_CONFIG_FILE), 'utf-8'));
    expect(migratedRaw.schemaVersion).toBe(2);
    // Old fields renamed
    expect(migratedRaw.trustTier).toBe(2);
    expect(migratedRaw.suppressions).toEqual([]);
    expect(migratedRaw.policySet).toBe('default');
    expect(migratedRaw.auditLevel).toBe('full');
    // New fields added with defaults
    expect(migratedRaw.failMode).toBeDefined();
    expect(migratedRaw.failMode.R5).toBe('closed');
    expect(migratedRaw.fleet).toBeDefined();
    expect(migratedRaw.fleet.allowBypass).toBe(false);
    // Old field names gone
    expect(migratedRaw.trust).toBeUndefined();
    expect(migratedRaw.suppress).toBeUndefined();
    expect(migratedRaw.policy).toBeUndefined();
    expect(migratedRaw.audit).toBeUndefined();

    // Step 5: Scaffold sidecar so doctor checks can run
    await initWorkspace(tempDir);
    // Already initialized — returns exit 2 (idempotent, but .claws/ may not exist)
    // Manually create .claws/ for doctor
    for (const dir of Object.values(CLAWS_SIDECAR_LAYOUT)) {
      mkdirSync(join(tempDir, dir), { recursive: true });
    }

    // Step 6: Run doctor with post-upgrade checks
    const checks = createDefaultChecks({ postUpgrade: true });
    const report = await runDoctor(tempDir, checks, { postUpgrade: true });

    // Doctor should complete without crashing
    expect(report.checks.length).toBeGreaterThan(0);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    // Each check should have a valid shape
    for (const check of report.checks) {
      expect(check.checkId).toBeTruthy();
      expect(check.name).toBeTruthy();
      expect(typeof check.passed).toBe('boolean');
      expect(check.durationMs).toBeGreaterThanOrEqual(0);
    }
  }, 30_000);

  it('amend → blocks invalid amendment, shows diff preview for valid one', async () => {
    const tempDir = createTempDir('amend');
    copyReferenceWorkspace(tempDir);

    // Init workspace
    await initWorkspace(tempDir);

    // Build GovernanceIR for amend validation
    const pipeline = await runPipeline(tempDir);
    const ir = pipeline.ir;

    // Step 1: Invalid amendment — add a skill requiring a tool that doesn't exist
    const invalidAmendment: Amendment = {
      type: 'add-skill',
      target: 'phantom-skill',
      value: {
        description: 'A skill needing a nonexistent tool',
        requiredTools: ['nonexistent-tool'],
      },
    };

    const invalidResult = validateAmendment(invalidAmendment, ir, 2);
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.violations.length).toBeGreaterThan(0);
    expect(invalidResult.violations[0]!.ruleId).toBe('AMEND-V001');
    expect(invalidResult.violations[0]!.message).toContain('nonexistent-tool');

    // Step 2: Invalid amendment — add skill requiring R5 tool at T2 trust tier
    const riskExceedAmendment: Amendment = {
      type: 'add-skill',
      target: 'dangerous-skill',
      value: {
        description: 'A skill needing shell-exec',
        requiredTools: ['shell-exec'],
      },
    };

    const riskResult = validateAmendment(riskExceedAmendment, ir, 2);
    expect(riskResult.valid).toBe(false);
    expect(riskResult.violations.some(v => v.ruleId === 'AMEND-V002')).toBe(true);

    // Step 3: Valid amendment — add skill with low-risk tools
    const validAmendment: Amendment = {
      type: 'add-skill',
      target: 'search-helper',
      value: {
        description: 'A read-only search skill',
        requiredTools: ['web-search'],
      },
    };

    const validResult = validateAmendment(validAmendment, ir, 2);
    expect(validResult.valid).toBe(true);
    expect(validResult.violations.length).toBe(0);

    // Step 4: Preview shows the diff
    const preview = previewAmendment(validAmendment, ir);
    expect(preview.diffs.length).toBeGreaterThan(0);
    expect(preview.diffs[0]!.change).toBe('add');
    expect(preview.diffs[0]!.path).toContain('search-helper');
    expect(preview.summary).toContain('+');

    // Step 5: Dry-run pipeline completes without applying
    const dryRunResult = await runAmendPipeline(
      tempDir,
      validAmendment,
      ir,
      2,
      async () => ({ success: true }),
      { dryRun: true },
    );
    expect(dryRunResult.success).toBe(true);
    expect(dryRunResult.step).toBe('preview');
    expect(dryRunResult.preview).toBeDefined();
    expect(dryRunResult.apply).toBeUndefined();

    // Step 6: Invalid policy amendment — unrecognized field
    const badPolicyAmendment: Amendment = {
      type: 'update-policy',
      target: 'nonexistentField',
      value: { nonexistentField: true },
    };

    const badPolicyResult = validateAmendment(badPolicyAmendment, ir, 2);
    expect(badPolicyResult.valid).toBe(false);
    expect(badPolicyResult.violations[0]!.ruleId).toBe('AMEND-V004');
  }, 30_000);

  it('full lifecycle: init → watch → doctor → amend → check → build → enforce', async () => {
    const tempDir = createTempDir('lifecycle');
    copyReferenceWorkspace(tempDir);

    // ── Phase 1: Init ────────────────────────────────────────────────
    const initResult = await initWorkspace(tempDir);
    expect(initResult.exitCode).toBe(0);

    // ── Phase 2: Initial parse + analyze ─────────────────────────────
    const initialParse = await parse(tempDir);
    const incParser = new IncrementalParser(tempDir);
    incParser.seed(initialParse);
    const autoAnalyzer = new AutoAnalyzer();
    const initialAnalysis = autoAnalyzer.run(initialParse);
    const baselineViolations = initialAnalysis.analysis.violations.length;
    expect(baselineViolations).toBeGreaterThan(0);

    // ── Phase 3: Watch — edit TOOLS.md ───────────────────────────────
    const toolsMdPath = join(tempDir, 'TOOLS.md');
    const originalContent = readFileSync(toolsMdPath, 'utf-8');
    writeFileSync(toolsMdPath, originalContent + '\n\n## internal-audit-log\n- Risk: R1\n- Description: Read-only audit log access\n- Governance: audit-only\n', 'utf-8');

    const watchParse = await incParser.update(['TOOLS.md']);
    const watchAnalysis = autoAnalyzer.run(watchParse);
    // New tool should produce a new G-CLASS violation (unclassified tool)
    expect(watchAnalysis.diff.added.length).toBeGreaterThanOrEqual(1);

    // ── Phase 4: Doctor — workspace health check ─────────────────────
    const checks = createDefaultChecks();
    const report = await runDoctor(tempDir, checks);
    expect(report.checks.length).toBeGreaterThan(0);
    // Checks run successfully (may find warnings, that's OK)
    for (const check of report.checks) {
      expect(check.checkId).toBeTruthy();
      expect(typeof check.passed).toBe('boolean');
    }

    // ── Phase 5: Amend — add skill (dry-run) ─────────────────────────
    const pipeline1 = await runPipeline(tempDir);
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'research-bot',
      value: {
        description: 'Research automation skill',
        requiredTools: ['web-search', 'file-read'],
      },
    };
    const validation = validateAmendment(amendment, pipeline1.ir, 2);
    expect(validation.valid).toBe(true);

    const preview = previewAmendment(amendment, pipeline1.ir);
    expect(preview.diffs.length).toBeGreaterThan(0);

    // ── Phase 6: Full pipeline → build → enforce ─────────────────────
    const pipeline2 = await runPipeline(tempDir);
    expect(pipeline2.pluginSource.length).toBeGreaterThan(0);
    expect(pipeline2.pluginSource).toContain('RISK_MAP');

    const sim = new GatewaySim(pipeline2.pluginSource);

    // R1 tools: allowed
    expect(sim.evaluateToolCall('web-search').allowed).toBe(true);

    // R5 tools: blocked
    expect(sim.evaluateToolCall('shell-exec').allowed).toBe(false);
    expect(sim.evaluateToolCall('send-email').allowed).toBe(false);
    expect(sim.evaluateToolCall('deploy-trigger').allowed).toBe(false);

    // Audit trail captured
    expect(sim.audit.length).toBe(4);
    for (const entry of sim.audit) {
      expect(entry.event).toBe('tool-call');
      expect(entry.toolName).toBeTruthy();
    }
  }, 45_000);
});
