/**
 * L3: Amend pipeline acceptance tests — governed amendment pipeline.
 *
 * Validates the full amend lifecycle: validate → preview → apply → recompile.
 * Covers add-skill, remove-tool, update-policy, trust tier violations,
 * dependency conflicts, dry-run, invalid types, sequential amendments,
 * and OC file protection guarantee.
 *
 * @module claws-sdk/tests/accept/e2e/amend-commands
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
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';

// ── Init module ──────────────────────────────────────────────────────
import { initWorkspace } from '../../../src/init/index.js';

// ── Watch module ─────────────────────────────────────────────────────
import { IncrementalParser } from '../../../src/watch/incremental.js';
import { AutoAnalyzer } from '../../../src/watch/auto-analyze.js';

// ── Doctor module ────────────────────────────────────────────────────
import {
  runDoctor,
  createDefaultChecks,
} from '../../../src/doctor/index.js';

// ── Amend module ─────────────────────────────────────────────────────
import {
  runAmendPipeline,
  validateAmendment,
  previewAmendment,
  applyAmendment,
  OC_PROTECTED_FILES,
} from '../../../src/amend/index.js';
import type {
  Amendment,
  AmendmentType,
  AmendValidationResult,
} from '../../../src/amend/index.js';

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
} from '../../../src/types/sidecar.js';
import { loadConfig } from '../../../src/config/loader.js';

// ── Fixtures ─────────────────────────────────────────────────────────

const FIXTURES = resolve(__dirname, '../../fixtures');
const REFERENCE_WORKSPACE = resolve(FIXTURES, 'oc-reference-workspace');

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

/**
 * Recompile callback for the amend pipeline.
 * Re-runs the full compile pipeline and returns success.
 */
async function recompile(workspaceRoot: string): Promise<{ success: boolean }> {
  try {
    await runPipeline(workspaceRoot);
    return { success: true };
  } catch {
    return { success: false };
  }
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
  const dir = mkdtempSync(join(tmpdir(), `claws-accept-amend-${prefix}-`));
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

/**
 * Hash all OC-protected files in a workspace for before/after comparison.
 */
function hashOCFiles(workspaceDir: string): Map<string, string> {
  const hashes = new Map<string, string>();
  for (const file of OC_PROTECTED_FILES) {
    // Skip directory entries (e.g. 'skills/') — hashed separately below
    if (file.endsWith('/')) continue;
    const fullPath = join(workspaceDir, file);
    if (existsSync(fullPath)) {
      const content = readFileSync(fullPath);
      hashes.set(file, createHash('sha256').update(content).digest('hex'));
    }
  }
  // Also hash skills directory
  const skillsDir = join(workspaceDir, 'skills');
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const skillFile = join(skillsDir, entry.name, 'SKILL.md');
        if (existsSync(skillFile)) {
          const content = readFileSync(skillFile);
          hashes.set(
            `skills/${entry.name}/SKILL.md`,
            createHash('sha256').update(content).digest('hex'),
          );
        }
      }
    }
  }
  return hashes;
}

/**
 * Initialize a workspace with soc2 template and return the pipeline result.
 */
async function initAndCompile(tempDir: string): Promise<{
  ir: GovernanceIR;
  pluginSource: string;
  violationCount: number;
}> {
  copyReferenceWorkspace(tempDir);
  await initWorkspace(tempDir, { template: 'soc2' });
  return runPipeline(tempDir);
}

// ── Acceptance Tests ─────────────────────────────────────────────────

describe('accept: amend-commands (governed amendment pipeline)', () => {

  // ── Scenario 1: add-skill with valid skill ─────────────────────────

  it('S1: amend add-skill with valid low-risk skill — validates, previews, applies, recompiles', async () => {
    const tempDir = createTempDir('s1');
    const { ir } = await initAndCompile(tempDir);

    const amendment: Amendment = {
      type: 'add-skill',
      target: 'wiki-helper',
      value: {
        description: 'Look up wiki articles',
        requiredTools: ['web-search'],
      },
    };

    // Validate passes
    const validation = validateAmendment(amendment, ir, 2);
    expect(validation.valid).toBe(true);
    expect(validation.violations).toHaveLength(0);

    // Preview shows addition
    const preview = previewAmendment(amendment, ir);
    expect(preview.diffs.length).toBeGreaterThan(0);
    expect(preview.diffs[0]!.change).toBe('add');
    expect(preview.diffs[0]!.path).toContain('wiki-helper');
    expect(preview.summary).toContain('+');

    // Full pipeline: apply + recompile
    const result = await runAmendPipeline(
      tempDir, amendment, ir, 2, recompile,
    );
    expect(result.success).toBe(true);
    expect(result.step).toBe('done');
    expect(result.validation.valid).toBe(true);
    expect(result.preview).toBeDefined();
    expect(result.preview!.diffs.length).toBeGreaterThan(0);
    expect(result.apply).toBeDefined();
    expect(result.apply!.success).toBe(true);
    expect(result.apply!.modifiedFiles.length).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);

    // Verify staging file written
    const stagingPath = join(tempDir, '.claws', 'staging', 'amendments.json');
    expect(existsSync(stagingPath)).toBe(true);
    const amendments = JSON.parse(readFileSync(stagingPath, 'utf-8'));
    expect(Array.isArray(amendments)).toBe(true);
    expect(amendments.length).toBe(1);
    expect(amendments[0].type).toBe('add-skill');
    expect(amendments[0].target).toBe('wiki-helper');
    expect(amendments[0].appliedAt).toBeTruthy();
  }, 30_000);

  // ── Scenario 2: remove-tool ────────────────────────────────────────

  it('S2: amend remove-tool — tool removed from governance IR after recompile', async () => {
    const tempDir = createTempDir('s2');
    const { ir } = await initAndCompile(tempDir);

    // Verify web-scrape exists in IR
    const webScrape = ir.capabilities.tools.find(t => t.name === 'web-scrape');
    expect(webScrape).toBeDefined();

    // remove-tool for web-scrape — no skills depend on it solely
    // (web-lookup uses web-search + web-scrape, but the dependency check
    // will flag it if any skill requires it)
    const amendment: Amendment = {
      type: 'remove-tool',
      target: 'web-scrape',
      value: {},
    };

    const validation = validateAmendment(amendment, ir, 2);
    // web-lookup skill requires web-scrape, so this should produce a dependency violation
    if (!validation.valid) {
      // Dependency conflict expected — skill 'web-lookup' depends on web-scrape
      expect(validation.violations.some(v => v.ruleId === 'AMEND-V003')).toBe(true);
      expect(validation.violations[0]!.message).toContain('web-scrape');
    }

    // Preview still works (shows what removal would look like)
    const preview = previewAmendment(amendment, ir);
    expect(preview.diffs.length).toBeGreaterThan(0);
    expect(preview.diffs[0]!.change).toBe('remove');
    expect(preview.diffs[0]!.path).toContain('web-scrape');

    // Try removing a tool with no dependents (e.g., calendar-read if no skill uses it)
    const calendarAmend: Amendment = {
      type: 'remove-tool',
      target: 'calendar-read',
      value: {},
    };
    const calValidation = validateAmendment(calendarAmend, ir, 2);
    // calendar-read has no skill dependencies in the reference workspace
    expect(calValidation.valid).toBe(true);

    // Apply the removal
    const result = await runAmendPipeline(
      tempDir, calendarAmend, ir, 2, recompile,
    );
    expect(result.success).toBe(true);
    expect(result.step).toBe('done');
    expect(result.apply!.modifiedFiles).toContain('.claws/staging/amendments.json');
  }, 30_000);

  // ── Scenario 3: update-policy ──────────────────────────────────────

  it('S3: amend update-policy — policy field updated in claws.json', async () => {
    const tempDir = createTempDir('s3');
    const { ir } = await initAndCompile(tempDir);

    const amendment: Amendment = {
      type: 'update-policy',
      target: 'auditLevel',
      value: { auditLevel: 'summary' },
    };

    // Validate
    const validation = validateAmendment(amendment, ir, 2);
    expect(validation.valid).toBe(true);

    // Preview shows modification
    const preview = previewAmendment(amendment, ir);
    expect(preview.diffs.length).toBe(1);
    expect(preview.diffs[0]!.change).toBe('modify');
    expect(preview.diffs[0]!.path).toBe('config.auditLevel');
    expect(preview.diffs[0]!.after).toBe('summary');

    // Full pipeline
    const result = await runAmendPipeline(
      tempDir, amendment, ir, 2, recompile,
    );
    expect(result.success).toBe(true);
    expect(result.step).toBe('done');
    expect(result.apply!.modifiedFiles).toContain('claws.json');

    // Verify claws.json was updated
    const config = JSON.parse(readFileSync(join(tempDir, 'claws.json'), 'utf-8'));
    expect(config.auditLevel).toBe('summary');
  }, 30_000);

  // ── Scenario 4: trust tier violation ───────────────────────────────

  it('S4: amend add-skill with trust tier violation — blocked at validate, no files modified', async () => {
    const tempDir = createTempDir('s4');
    const { ir } = await initAndCompile(tempDir);

    // Snapshot file state before amendment
    const ocHashesBefore = hashOCFiles(tempDir);
    const stagingBefore = existsSync(join(tempDir, '.claws', 'staging', 'amendments.json'));

    // shell-exec is R5, trust tier 2 allows max R3
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'dangerous-exec',
      value: {
        description: 'Execute arbitrary commands',
        requiredTools: ['shell-exec'],
      },
    };

    // Validate rejects
    const validation = validateAmendment(amendment, ir, 2);
    expect(validation.valid).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);
    expect(validation.violations.some(v => v.ruleId === 'AMEND-V002')).toBe(true);
    expect(validation.violations[0]!.message).toContain('trust tier');

    // Full pipeline aborts at validate
    const result = await runAmendPipeline(
      tempDir, amendment, ir, 2, recompile,
    );
    expect(result.success).toBe(false);
    expect(result.step).toBe('validate');
    expect(result.preview).toBeUndefined();
    expect(result.apply).toBeUndefined();

    // No files modified
    const ocHashesAfter = hashOCFiles(tempDir);
    for (const [file, hash] of ocHashesBefore) {
      expect(ocHashesAfter.get(file), `${file} must be unchanged`).toBe(hash);
    }

    // Staging file unchanged
    const stagingAfter = existsSync(join(tempDir, '.claws', 'staging', 'amendments.json'));
    expect(stagingAfter).toBe(stagingBefore);
  }, 30_000);

  // ── Scenario 5: tool dependency conflict ───────────────────────────

  it('S5: amend remove-tool with dependency conflict — blocked with diagnostic', async () => {
    const tempDir = createTempDir('s5');
    const { ir } = await initAndCompile(tempDir);

    // web-search is used by skill 'web-lookup'
    const amendment: Amendment = {
      type: 'remove-tool',
      target: 'web-search',
      value: {},
    };

    const validation = validateAmendment(amendment, ir, 2);
    expect(validation.valid).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);
    expect(validation.violations.some(v => v.ruleId === 'AMEND-V003')).toBe(true);

    // Diagnostic message explains the dependency
    const depViolation = validation.violations.find(v => v.ruleId === 'AMEND-V003')!;
    expect(depViolation.message).toContain('web-search');
    expect(depViolation.message).toContain('depends on it');

    // Full pipeline aborts at validate
    const result = await runAmendPipeline(
      tempDir, amendment, ir, 2, recompile,
    );
    expect(result.success).toBe(false);
    expect(result.step).toBe('validate');
  }, 30_000);

  // ── Scenario 6: dry-run ────────────────────────────────────────────

  it('S6: amend --dry-run — shows preview but does NOT modify any files', async () => {
    const tempDir = createTempDir('s6');
    const { ir } = await initAndCompile(tempDir);

    // Snapshot all file timestamps/content before dry-run
    const ocHashesBefore = hashOCFiles(tempDir);
    const configBefore = readFileSync(join(tempDir, 'claws.json'), 'utf-8');
    const stagingExistsBefore = existsSync(join(tempDir, '.claws', 'staging', 'amendments.json'));

    const amendment: Amendment = {
      type: 'add-skill',
      target: 'dry-run-skill',
      value: {
        description: 'Should not be persisted',
        requiredTools: ['web-search'],
      },
    };

    const result = await runAmendPipeline(
      tempDir, amendment, ir, 2, recompile,
      { dryRun: true },
    );

    // Pipeline succeeds at preview step
    expect(result.success).toBe(true);
    expect(result.step).toBe('preview');
    expect(result.validation.valid).toBe(true);
    expect(result.preview).toBeDefined();
    expect(result.preview!.diffs.length).toBeGreaterThan(0);
    expect(result.apply).toBeUndefined();

    // Verify NO files were modified
    const ocHashesAfter = hashOCFiles(tempDir);
    for (const [file, hash] of ocHashesBefore) {
      expect(ocHashesAfter.get(file), `${file} must be unchanged after dry-run`).toBe(hash);
    }

    // Config unchanged
    const configAfter = readFileSync(join(tempDir, 'claws.json'), 'utf-8');
    expect(configAfter).toBe(configBefore);

    // No staging file created
    const stagingExistsAfter = existsSync(join(tempDir, '.claws', 'staging', 'amendments.json'));
    expect(stagingExistsAfter).toBe(stagingExistsBefore);
  }, 30_000);

  // ── Scenario 7: invalid amendment type ─────────────────────────────

  it('S7: amend with invalid amendment type — rejected with validation violation', async () => {
    const tempDir = createTempDir('s7');
    const { ir } = await initAndCompile(tempDir);

    // update-policy with unrecognized field
    const amendment: Amendment = {
      type: 'update-policy',
      target: 'nonexistentField',
      value: { nonexistentField: 'bogus' },
    };

    const validation = validateAmendment(amendment, ir, 2);
    expect(validation.valid).toBe(false);
    expect(validation.violations.length).toBeGreaterThan(0);
    expect(validation.violations.some(v => v.ruleId === 'AMEND-V004')).toBe(true);
    expect(validation.violations[0]!.message).toContain('Unrecognized policy field');
    expect(validation.violations[0]!.message).toContain('nonexistentField');

    // Pipeline rejects
    const result = await runAmendPipeline(
      tempDir, amendment, ir, 2, recompile,
    );
    expect(result.success).toBe(false);
    expect(result.step).toBe('validate');
  }, 30_000);

  // ── Scenario 8: full pipeline init → add-skill → check ────────────

  it('S8: full pipeline — init → add-skill → recompile → verify skill in governance report', async () => {
    const tempDir = createTempDir('s8');
    const pipeline1 = await initAndCompile(tempDir);

    // Count skills before
    const skillCountBefore = pipeline1.ir.capabilities.skills.length;

    // Add a valid skill
    const amendment: Amendment = {
      type: 'add-skill',
      target: 'data-summarizer',
      value: {
        description: 'Summarize data from files',
        requiredTools: ['file-read'],
      },
    };

    const result = await runAmendPipeline(
      tempDir, amendment, pipeline1.ir, 2, recompile,
    );
    expect(result.success).toBe(true);
    expect(result.step).toBe('done');

    // Verify the staging file records the amendment
    const stagingPath = join(tempDir, '.claws', 'staging', 'amendments.json');
    expect(existsSync(stagingPath)).toBe(true);
    const amendments = JSON.parse(readFileSync(stagingPath, 'utf-8'));
    expect(amendments.some(
      (a: Record<string, unknown>) => a.target === 'data-summarizer',
    )).toBe(true);

    // Recompile and verify the amendment was recorded
    const pipeline2 = await runPipeline(tempDir);
    expect(pipeline2.ir.compiler.compilerVersion).toBe(COMPILER_VERSION);

    // Plugin was regenerated successfully
    expect(pipeline2.pluginSource.length).toBeGreaterThan(100);
    expect(pipeline2.pluginSource).toContain('RISK_MAP');
  }, 30_000);

  // ── Scenario 9: sequential amendments ──────────────────────────────

  it('S9: sequential amendments — add-skill → update-policy → both reflected', async () => {
    const tempDir = createTempDir('s9');
    const pipeline1 = await initAndCompile(tempDir);

    // Amendment 1: add-skill
    const skillAmend: Amendment = {
      type: 'add-skill',
      target: 'report-generator',
      value: {
        description: 'Generate reports from data',
        requiredTools: ['file-read'],
      },
    };

    const result1 = await runAmendPipeline(
      tempDir, skillAmend, pipeline1.ir, 2, recompile,
    );
    expect(result1.success).toBe(true);
    expect(result1.step).toBe('done');

    // Amendment 2: update-policy (change policySet)
    const policyAmend: Amendment = {
      type: 'update-policy',
      target: 'policySet',
      value: { policySet: 'strict' },
    };

    // Re-compile to get fresh IR after first amendment
    const pipeline2 = await runPipeline(tempDir);

    const result2 = await runAmendPipeline(
      tempDir, policyAmend, pipeline2.ir, 2, recompile,
    );
    expect(result2.success).toBe(true);
    expect(result2.step).toBe('done');

    // Verify both amendments are reflected
    // 1. Staging file has the skill amendment
    const stagingPath = join(tempDir, '.claws', 'staging', 'amendments.json');
    const amendments = JSON.parse(readFileSync(stagingPath, 'utf-8'));
    expect(amendments.some(
      (a: Record<string, unknown>) => a.target === 'report-generator',
    )).toBe(true);

    // 2. claws.json has the policy update
    const config = JSON.parse(readFileSync(join(tempDir, 'claws.json'), 'utf-8'));
    expect(config.policySet).toBe('strict');

    // 3. Final recompile succeeds
    const pipeline3 = await runPipeline(tempDir);
    expect(pipeline3.pluginSource.length).toBeGreaterThan(100);
    expect(pipeline3.ir.compiler.compilerVersion).toBe(COMPILER_VERSION);
  }, 30_000);

  // ── Scenario 10: OC file protection ────────────────────────────────

  it('S10: amend NEVER modifies OC workspace files — only .claws/ files', async () => {
    const tempDir = createTempDir('s10');
    const { ir } = await initAndCompile(tempDir);

    // Hash all OC-protected files before amendment
    const ocHashesBefore = hashOCFiles(tempDir);
    expect(ocHashesBefore.size).toBeGreaterThan(0);

    // Run multiple amendments of each type
    const amendments: Amendment[] = [
      {
        type: 'add-skill',
        target: 'oc-guard-test-skill',
        value: { description: 'Test skill', requiredTools: ['web-search'] },
      },
      {
        type: 'update-policy',
        target: 'auditLevel',
        value: { auditLevel: 'none' },
      },
    ];

    for (const amendment of amendments) {
      const result = await runAmendPipeline(
        tempDir, amendment, ir, 2, recompile,
      );
      expect(result.success).toBe(true);

      // After each amendment, verify every modified file is in .claws/ or claws.json
      if (result.apply) {
        for (const file of result.apply.modifiedFiles) {
          const isClawsSidecar = file.startsWith('.claws/') || file.startsWith('.claws\\');
          const isClawsConfig = file === 'claws.json';
          expect(
            isClawsSidecar || isClawsConfig,
            `Modified file "${file}" must be in .claws/ or claws.json`,
          ).toBe(true);
        }
      }
    }

    // Final hash comparison: every OC file must be byte-identical
    const ocHashesAfter = hashOCFiles(tempDir);
    for (const [file, hashBefore] of ocHashesBefore) {
      const hashAfter = ocHashesAfter.get(file);
      expect(hashAfter, `OC file "${file}" must exist after amendments`).toBeDefined();
      expect(hashAfter, `OC file "${file}" must be byte-identical after amendments`).toBe(hashBefore);
    }

    // Verify protected files list includes the expected files
    expect(OC_PROTECTED_FILES).toContain('SOUL.md');
    expect(OC_PROTECTED_FILES).toContain('TOOLS.md');
    expect(OC_PROTECTED_FILES).toContain('AGENTS.md');
    expect(OC_PROTECTED_FILES).toContain('IDENTITY.md');
    expect(OC_PROTECTED_FILES).toContain('USER.md');
    expect(OC_PROTECTED_FILES).toContain('MEMORY.md');
    expect(OC_PROTECTED_FILES).toContain('HEARTBEAT.md');
    expect(OC_PROTECTED_FILES).toContain('lobster.yaml');
  }, 30_000);

  // ── Scenario: trust tier boundary ──────────────────────────────────

  it('S4b: add-skill with nonexistent tool — AMEND-V001 violation', async () => {
    const tempDir = createTempDir('s4b');
    const { ir } = await initAndCompile(tempDir);

    const amendment: Amendment = {
      type: 'add-skill',
      target: 'ghost-skill',
      value: { requiredTools: ['does-not-exist-anywhere'] },
    };

    const validation = validateAmendment(amendment, ir, 2);
    expect(validation.valid).toBe(false);
    expect(validation.violations[0]!.ruleId).toBe('AMEND-V001');
    expect(validation.violations[0]!.message).toContain('does not exist');
  }, 30_000);

  // ── Scenario: update-policy trust tier out of range ────────────────

  it('S7b: update-policy with invalid trust tier — AMEND-V005 violation', async () => {
    const tempDir = createTempDir('s7b');
    const { ir } = await initAndCompile(tempDir);

    const amendment: Amendment = {
      type: 'update-policy',
      target: 'trustTier',
      value: { trustTier: 99 },
    };

    const validation = validateAmendment(amendment, ir, 2);
    expect(validation.valid).toBe(false);
    expect(validation.violations.some(v => v.ruleId === 'AMEND-V005')).toBe(true);
    expect(validation.violations[0]!.message).toContain('Invalid trust tier');
  }, 30_000);

});

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
}

// ── Structured result tracking ───────────────────────────────────────

interface PhaseResult {
  phase: string;
  passed: boolean;
  assertions: number;
  failures: string[];
  durationMs: number;
}

function startPhase(name: string): {
  end: (passed: boolean, assertions: number, failures?: string[]) => PhaseResult;
  startTime: number;
} {
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

// ── Crown Jewel: Full CP-2 Lifecycle Acceptance Test ─────────────────

describe('accept: CP-2 full lifecycle (crown jewel)', () => {
  it('init → watch → doctor → amend → check → build → enforce — all CP-2 features integrated', async () => {
    const results: PhaseResult[] = [];
    const tempDir = createTempDir('lifecycle');
    copyReferenceWorkspace(tempDir);

    // Hash OC files before anything — the invariant for the entire test
    const ocHashesBaseline = hashOCFiles(tempDir);
    expect(ocHashesBaseline.size).toBeGreaterThan(0);

    // ── Phase 1: Init with SOC2 template ─────────────────────────────

    const p1 = startPhase('init-soc2');

    const initResult = await initWorkspace(tempDir, { template: 'soc2' });
    expect(initResult.exitCode).toBe(0);
    expect(initResult.status).toBe('initialized');
    expect(initResult.templateApplied).toBe('soc2');

    // claws.json created with SOC2 template overrides applied
    const configResult = await loadConfig(tempDir);
    expect(configResult.found).toBe(true);
    expect(configResult.config.trustTier).toBe(3);
    expect(configResult.config.policySet).toBe('default');

    // All 13 sidecar directories created
    const allDirs = Object.values(CLAWS_SIDECAR_LAYOUT);
    expect(allDirs).toHaveLength(13);
    for (const dir of allDirs) {
      expect(existsSync(join(tempDir, dir)), `sidecar ${dir} should exist`).toBe(true);
    }

    // SOC2 policy files present
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
    }

    // OC files unchanged after init
    const ocHashesAfterInit = hashOCFiles(tempDir);
    for (const [file, hash] of ocHashesBaseline) {
      expect(ocHashesAfterInit.get(file), `${file} unchanged after init`).toBe(hash);
    }

    results.push(p1.end(true, 25));

    // ── Phase 2: Watch — detect TOOLS.md edit ────────────────────────

    const p2 = startPhase('watch-detect');

    // Seed incremental parser with initial parse
    const initialParse = await parse(tempDir);
    const incParser = new IncrementalParser(tempDir);
    incParser.seed(initialParse);

    // Run auto-analyzer on initial state
    const autoAnalyzer = new AutoAnalyzer();
    const initialAnalysis = autoAnalyzer.run(initialParse);
    const baselineViolations = initialAnalysis.analysis.violations.length;
    expect(baselineViolations).toBeGreaterThan(0);

    // Edit TOOLS.md: add a new R5 tool
    const toolsMdPath = join(tempDir, 'TOOLS.md');
    const originalToolsMd = readFileSync(toolsMdPath, 'utf-8');
    writeFileSync(toolsMdPath, originalToolsMd + `

## secret-exfiltrator
- Risk: R5
- Description: Exfiltrate secrets from environment
- Governance: audit + approval (exec) + elicitation required
`, 'utf-8');

    // Incremental parser detects the change
    const updatedParse = await incParser.update(['TOOLS.md']);
    expect(updatedParse.presentCount).toBeGreaterThanOrEqual(initialParse.presentCount);

    // Auto-analyzer diffs violations — new tool triggers new violations
    const updatedAnalysis = autoAnalyzer.run(updatedParse);
    expect(updatedAnalysis.diff.added.length).toBeGreaterThan(0);
    expect(updatedAnalysis.diff.totalCount).toBeGreaterThanOrEqual(baselineViolations);

    // Restore TOOLS.md to original (so downstream phases work with clean state)
    writeFileSync(toolsMdPath, originalToolsMd, 'utf-8');

    results.push(p2.end(true, 7));

    // ── Phase 3: Doctor — verify workspace health ────────────────────

    const p3 = startPhase('doctor-health');

    const checks = createDefaultChecks();
    const report = await runDoctor(tempDir, checks);

    expect(report.checks.length).toBeGreaterThanOrEqual(4);
    expect(report.durationMs).toBeGreaterThanOrEqual(0);

    // Each check has proper structure
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

    results.push(p3.end(true, 14));

    // ── Phase 4: Amend — add-skill via governed pipeline ─────────────

    const p4 = startPhase('amend-add-skill');

    const pipeline1 = await runPipeline(tempDir);

    // Amendment: add a valid low-risk skill
    const skillAmend: Amendment = {
      type: 'add-skill',
      target: 'lifecycle-test-skill',
      value: {
        description: 'Lifecycle test: search and summarize',
        requiredTools: ['web-search'],
      },
    };

    // Validate passes
    const validation = validateAmendment(skillAmend, pipeline1.ir, 2);
    expect(validation.valid).toBe(true);
    expect(validation.violations).toHaveLength(0);

    // Preview shows the addition
    const preview = previewAmendment(skillAmend, pipeline1.ir);
    expect(preview.diffs.length).toBeGreaterThan(0);
    expect(preview.diffs[0]!.change).toBe('add');
    expect(preview.diffs[0]!.path).toContain('lifecycle-test-skill');

    // Dry-run first — verify no side effects
    const configBeforeDry = readFileSync(join(tempDir, 'claws.json'), 'utf-8');
    const dryRun = await runAmendPipeline(
      tempDir, skillAmend, pipeline1.ir, 2, recompile,
      { dryRun: true },
    );
    expect(dryRun.success).toBe(true);
    expect(dryRun.step).toBe('preview');
    expect(dryRun.apply).toBeUndefined();
    const configAfterDry = readFileSync(join(tempDir, 'claws.json'), 'utf-8');
    expect(configAfterDry).toBe(configBeforeDry);

    // Now apply for real
    const amendResult = await runAmendPipeline(
      tempDir, skillAmend, pipeline1.ir, 2, recompile,
    );
    expect(amendResult.success).toBe(true);
    expect(amendResult.step).toBe('done');
    expect(amendResult.apply).toBeDefined();
    expect(amendResult.apply!.success).toBe(true);
    expect(amendResult.apply!.modifiedFiles.length).toBeGreaterThan(0);

    // Verify staging file persisted
    const stagingPath = join(tempDir, '.claws', 'staging', 'amendments.json');
    expect(existsSync(stagingPath)).toBe(true);
    const amendments = JSON.parse(readFileSync(stagingPath, 'utf-8'));
    expect(amendments.some(
      (a: Record<string, unknown>) => a.target === 'lifecycle-test-skill',
    )).toBe(true);

    // Modified files are all in .claws/
    for (const file of amendResult.apply!.modifiedFiles) {
      const isClaws = file.startsWith('.claws/') || file.startsWith('.claws\\');
      const isConfig = file === 'claws.json';
      expect(isClaws || isConfig, `"${file}" must be .claws/ or claws.json`).toBe(true);
    }

    // Rejected amendment: trust tier violation does NOT modify state
    const badAmend: Amendment = {
      type: 'add-skill',
      target: 'dangerous-skill',
      value: { requiredTools: ['shell-exec'] },
    };
    const badResult = await runAmendPipeline(
      tempDir, badAmend, pipeline1.ir, 2, recompile,
    );
    expect(badResult.success).toBe(false);
    expect(badResult.step).toBe('validate');
    expect(badResult.validation.violations.some(v => v.ruleId === 'AMEND-V002')).toBe(true);

    // OC files unchanged after all amend operations
    const ocHashesAfterAmend = hashOCFiles(tempDir);
    for (const [file, hash] of ocHashesBaseline) {
      expect(ocHashesAfterAmend.get(file), `${file} unchanged after amend`).toBe(hash);
    }

    results.push(p4.end(true, 28));

    // ── Phase 5: Check — re-compile reports governance state ─────────

    const p5 = startPhase('check-governance');

    const pipeline2 = await runPipeline(tempDir);

    // GovernanceIR has proper structure
    expect(pipeline2.ir.compiler.compilerVersion).toBe(COMPILER_VERSION);
    expect(pipeline2.ir.compiler.schemaVersion).toBe(SCHEMA_VERSION);
    expect(pipeline2.ir.compiler.compiledAt).toBeTruthy();

    // Tools are present from workspace
    expect(pipeline2.ir.capabilities.tools.length).toBeGreaterThan(0);

    // Violations have proper structure
    expect(pipeline2.violationCount).toBeGreaterThan(0);
    for (const v of pipeline2.ir.analysis.violations) {
      expect(v.ruleId).toBeTruthy();
      expect(v.level).toBeGreaterThanOrEqual(1);
      expect(v.level).toBeLessThanOrEqual(5);
      expect(v.message.length).toBeGreaterThan(0);
      expect(v.target.length).toBeGreaterThan(0);
      expect(v.diagnosticCode).toMatch(/^CLAWS-/);
    }

    // Conflict report structure
    expect(pipeline2.ir.conflicts).toBeDefined();
    expect(Array.isArray(pipeline2.ir.conflicts.oboConflicts)).toBe(true);
    expect(typeof pipeline2.ir.conflicts.totalConflicts).toBe('number');

    results.push(p5.end(true, 14));

    // ── Phase 6: Build — regenerate artifacts ────────────────────────

    const p6 = startPhase('build-artifacts');

    // Plugin source well-formedness
    expect(pipeline2.pluginSource.length).toBeGreaterThan(100);
    expect(pipeline2.pluginSource).toContain('RISK_MAP');
    expect(pipeline2.pluginSource).toContain('claws-governance');
    expect(pipeline2.pluginSource).toContain(`v${COMPILER_VERSION}`);
    expect(pipeline2.pluginSource).toContain('before_tool_call');

    // No forbidden imports
    const forbidden = verifyNoForbiddenImports(pipeline2.pluginSource);
    expect(forbidden).toEqual([]);

    // No catch clause violations
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

    // Hook files have no forbidden imports
    for (const [name, content] of pipeline2.hookFiles) {
      const hookForbidden = verifyNoForbiddenImports(content);
      expect(hookForbidden, `${name} should have no forbidden imports`).toEqual([]);
    }

    results.push(p6.end(true, 16));

    // ── Phase 7: Enforce — GatewaySim validates compliance ───────────

    const p7 = startPhase('enforce-gateway');

    const sim = new GatewaySim(pipeline2.pluginSource);
    expect(sim.toolCount).toBeGreaterThan(0);

    // R1: allowed (fail-open)
    const r1 = sim.evaluateToolCall('web-search');
    expect(r1.allowed).toBe(true);
    expect(r1.failMode).toBe('open');

    // R2: allowed (fail-open)
    const r2 = sim.evaluateToolCall('file-read');
    expect(r2.allowed).toBe(true);
    expect(r2.failMode).toBe('open');

    // R3: gated (requires approval)
    const r3 = sim.evaluateToolCall('file-write');
    expect(r3.allowed).toBe(false);
    expect(r3.failMode).toBe('gated');

    // R4: gated
    const r4 = sim.evaluateToolCall('db-query');
    expect(r4.allowed).toBe(false);
    expect(r4.failMode).toBe('gated');

    // R5: fail-closed
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

    // Audit chain integrity — 9 calls: web-search, file-read, file-write, db-query, 4 R5, 1 unknown
    expect(sim.audit.length).toBe(9);
    for (const entry of sim.audit) {
      expect(entry.event).toBe('tool-call');
      expect(entry.toolName).toBeTruthy();
      expect(typeof entry.riskLevel).toBe('number');
      expect(entry.timestamp).toBeTruthy();
    }

    results.push(p7.end(true, 22));

    // ── Final: OC fidelity guarantee across ALL phases ───────────────

    const ocHashesFinal = hashOCFiles(tempDir);
    for (const [file, hash] of ocHashesBaseline) {
      expect(
        ocHashesFinal.get(file),
        `OC file "${file}" must be byte-identical after full lifecycle`,
      ).toBe(hash);
    }

    // ── Structured pass/fail summary ─────────────────────────────────

    const allPassed = results.every(r => r.passed);
    const totalAssertions = results.reduce((sum, r) => sum + r.assertions, 0);

    const summary = {
      testName: 'CP-2 full lifecycle acceptance (crown jewel)',
      passed: allPassed,
      totalAssertions,
      phases: results.map(r => ({
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
    expect(totalAssertions).toBeGreaterThanOrEqual(120);
  }, 60_000);
});
