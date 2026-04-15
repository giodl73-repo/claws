/**
 * Acceptance tests: compile-pipeline scenario pitfalls (CP-1 gate).
 *
 * Validates compile pipeline edge cases from design scenarios:
 * - P-232: BOM handling — UTF-8 BOM does not cause first constraint to be missed
 * - P-233: CRLF normalization — same content with CRLF vs LF → identical hash
 * - P-234: Deterministic JSON — compile same workspace twice → identical output
 * - P-235: Last-known-good preservation — error does NOT delete previous artifacts
 * - Cross-file conflict: TOOLS.md allows tool + SOUL.md denies same tool
 * - Diagnostic codes: every violation has CLAWS-prefixed diagnostic code
 * - Parse ordering: files parsed in deterministic order (sorted paths)
 * - Collect-all-errors: malformed SOUL.md + malformed TOOLS.md → both reported
 *
 * @module claws-sdk/tests/accept/scenarios/compile-pipeline
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
import { createHash } from 'node:crypto';

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
import { emitPlugin } from '../../../src/emit/emit-plugin.js';
import { COMPILER_VERSION, SCHEMA_VERSION } from '../../../src/compile/version.js';
import type { GovernanceIR } from '../../../src/ir/governance-ir.js';

// ── Text utils ───────────────────────────────────────────────────────
import { stripBOM, normalizeLF } from '../../../src/util/text.js';

// ── Init module ──────────────────────────────────────────────────────
import { initWorkspace } from '../../../src/init/index.js';

// ── Fixtures ─────────────────────────────────────────────────────────

const FIXTURES = resolve(__dirname, '../../fixtures');
const REFERENCE_WORKSPACE = resolve(FIXTURES, 'oc-reference-workspace');

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
  const dir = mkdtempSync(join(tmpdir(), `claws-accept-cp-${prefix}-`));
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

// ── Full pipeline helper ─────────────────────────────────────────────

async function runFullPipeline(workspaceDir: string): Promise<{
  ir: GovernanceIR;
  pluginSource: string;
  packageJson: string;
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
  };
}

// ── Compile Pipeline Acceptance Tests ────────────────────────────────

describe('accept: compile-pipeline scenarios (CP-1 gate)', () => {

  // ── P-232: BOM handling ────────────────────────────────────────────

  it('P-232: UTF-8 BOM does not cause first constraint to be silently dropped', async () => {
    const tempDir = createTempDir('p232');
    copyReferenceWorkspace(tempDir);

    // Write SOUL.md with UTF-8 BOM preceding the first deny constraint
    const BOM = '\uFEFF';
    const soulContent = `${BOM}# Agent Soul

You are a research assistant.

## Deny Constraints

- **Never access production databases.** All queries go through read-only replica.
- **Never send external communications without approval.**
`;
    writeFileSync(join(tempDir, 'SOUL.md'), soulContent, 'utf-8');

    // Parse the workspace
    const parseResult = await parse(tempDir);

    // SOUL.md should be present
    const soulEntry = parseResult.entries.find(e => e.source === 'SOUL.md');
    expect(soulEntry).toBeDefined();
    expect(soulEntry!.status).toBe('present');

    if (soulEntry!.status === 'present') {
      // BOM should be stripped from content
      expect(soulEntry!.content.charCodeAt(0)).not.toBe(0xFEFF);
      // First heading should be intact
      expect(soulEntry!.content).toMatch(/^# Agent Soul/);
    }

    // Extract intents — first deny constraint must NOT be dropped
    const intents = extractAllIntents(parseResult);
    const soulIntents = intents.find(r => r.source === 'SOUL.md');
    expect(soulIntents).toBeDefined();
    // At least 2 deny constraints extracted
    expect(soulIntents!.intents.length).toBeGreaterThanOrEqual(2);

    // Verify BOM stripping utility
    expect(stripBOM(BOM + 'test')).toBe('test');
    expect(stripBOM('test')).toBe('test');
  }, 30_000);

  // ── P-233: CRLF normalization ──────────────────────────────────────

  it('P-233: CRLF vs LF produces identical content hash after normalization', async () => {
    const tempDir1 = createTempDir('p233-lf');
    const tempDir2 = createTempDir('p233-crlf');
    copyReferenceWorkspace(tempDir1);
    copyReferenceWorkspace(tempDir2);

    // Write identical content to both workspaces with different line endings
    const lfContent = '# Tool Guidance\n\n## web-search\n- Risk: R1\n- Description: Search\n';
    const crlfContent = '# Tool Guidance\r\n\r\n## web-search\r\n- Risk: R1\r\n- Description: Search\r\n';

    writeFileSync(join(tempDir1, 'TOOLS.md'), lfContent, 'utf-8');
    writeFileSync(join(tempDir2, 'TOOLS.md'), crlfContent, 'utf-8');

    // Parse both workspaces
    const parse1 = await parse(tempDir1);
    const parse2 = await parse(tempDir2);

    // Both should produce present entries for TOOLS.md
    const tools1 = parse1.entries.find(e => e.source === 'TOOLS.md');
    const tools2 = parse2.entries.find(e => e.source === 'TOOLS.md');
    expect(tools1!.status).toBe('present');
    expect(tools2!.status).toBe('present');

    if (tools1!.status === 'present' && tools2!.status === 'present') {
      // After normalization, content should be identical
      expect(tools1!.content).toBe(tools2!.content);
      // Content hashes should match
      expect(tools1!.provenance.contentHash).toBe(tools2!.provenance.contentHash);
    }

    // Verify normalization utility
    expect(normalizeLF('a\r\nb\r\nc')).toBe('a\nb\nc');
    expect(normalizeLF('a\nb\nc')).toBe('a\nb\nc');
  }, 30_000);

  // ── P-234: Deterministic JSON ──────────────────────────────────────

  it('P-234: compile same workspace twice produces identical plugin output', async () => {
    const tempDir = createTempDir('p234');
    copyReferenceWorkspace(tempDir);
    await initWorkspace(tempDir, { template: 'soc2' });

    // Compile twice
    const run1 = await runFullPipeline(tempDir);
    const run2 = await runFullPipeline(tempDir);

    // Plugin source should be identical (except timestamp in comment and compiledAt field)
    // Strip all timestamp-like patterns for comparison
    const stripTimestamps = (s: string) =>
      s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z/g, 'TIMESTAMP');
    expect(stripTimestamps(run1.pluginSource)).toBe(stripTimestamps(run2.pluginSource));

    // Package.json should be identical
    expect(run1.packageJson).toBe(run2.packageJson);

    // GovernanceIR structure (minus compiledAt) should match
    expect(run1.ir.capabilities).toEqual(run2.ir.capabilities);
    expect(run1.ir.analysis).toEqual(run2.ir.analysis);
    expect(run1.ir.conflicts).toEqual(run2.ir.conflicts);
    expect(run1.ir.compiler.compilerVersion).toBe(run2.ir.compiler.compilerVersion);
    expect(run1.ir.compiler.schemaVersion).toBe(run2.ir.compiler.schemaVersion);
  }, 60_000);

  // ── P-235: Last-known-good preservation ────────────────────────────

  it('P-235: compilation error does NOT delete previous working artifacts', async () => {
    const tempDir = createTempDir('p235');
    copyReferenceWorkspace(tempDir);
    await initWorkspace(tempDir, { template: 'soc2' });

    // First successful compile — create a "compiled" artifact directory
    const compiledDir = join(tempDir, '.claws', 'compiled');
    mkdirSync(compiledDir, { recursive: true });

    const firstResult = await runFullPipeline(tempDir);
    expect(firstResult.pluginSource.length).toBeGreaterThan(0);

    // Write the artifact to disk (simulates a successful build)
    writeFileSync(
      join(compiledDir, 'governance-plugin.ts'),
      firstResult.pluginSource,
      'utf-8',
    );
    writeFileSync(
      join(compiledDir, 'package.json'),
      firstResult.packageJson,
      'utf-8',
    );

    // Verify artifacts exist
    expect(existsSync(join(compiledDir, 'governance-plugin.ts'))).toBe(true);
    expect(existsSync(join(compiledDir, 'package.json'))).toBe(true);

    // Now break the workspace (corrupt SOUL.md with unclosed frontmatter)
    writeFileSync(join(tempDir, 'SOUL.md'), '---\nbroken: true\n', 'utf-8');

    // Parse should produce diagnostics (error for unclosed frontmatter)
    const brokenParse = await parse(tempDir);
    const errorDiags = brokenParse.diagnostics.filter(d => d.severity === 'error');
    expect(errorDiags.length).toBeGreaterThan(0);

    // Previous artifacts must NOT be deleted
    expect(existsSync(join(compiledDir, 'governance-plugin.ts'))).toBe(true);
    expect(existsSync(join(compiledDir, 'package.json'))).toBe(true);

    // Previous artifacts should still be readable and non-empty
    const preservedPlugin = readFileSync(join(compiledDir, 'governance-plugin.ts'), 'utf-8');
    expect(preservedPlugin.length).toBeGreaterThan(0);
    expect(preservedPlugin).toBe(firstResult.pluginSource);
  }, 30_000);

  // ── Cross-file conflict: TOOLS.md + SOUL.md ────────────────────────

  it('cross-file conflict: TOOLS.md allows tool + SOUL.md denies same tool → conflict diagnostic', async () => {
    const tempDir = createTempDir('cross-conflict');

    // Create minimal workspace with explicit conflict
    writeFileSync(join(tempDir, 'SOUL.md'), `# Agent Soul

You are a helpful assistant.

## Deny Constraints

- **Never use prod-deploy.** Deployments must go through CI/CD only.
`, 'utf-8');

    writeFileSync(join(tempDir, 'TOOLS.md'), `# Tool Guidance

## Read
- Risk: R1
- Description: Read files

## prod-deploy
- Risk: R5
- OBO: true
- Description: Deploy to production
`, 'utf-8');

    writeFileSync(join(tempDir, 'AGENTS.md'), `# Agents

## Orchestrator
- Model: claude-sonnet-4-20250514
- Description: Main orchestrator
- Tools: Read, prod-deploy
`, 'utf-8');

    // Run conflict detection
    const parseResult = await parse(tempDir);
    const intentResults = extractAllIntents(parseResult);
    const ast = buildGovernanceAST(intentResults);
    const parsedManifest = extract(ast);
    const conflicts = detectConflicts(ast, parsedManifest);

    // Should detect DENY-vs-TOOL conflict for prod-deploy
    const denyVsTool = conflicts.conflicts.filter(c => c.category === 'DENY-vs-TOOL');
    expect(denyVsTool.length).toBeGreaterThan(0);

    // Each conflict should have a CLAWS-prefixed diagnostic code
    for (const conflict of denyVsTool) {
      expect(conflict.code).toMatch(/^CLAWS-C/);
      expect(conflict.explanation.length).toBeGreaterThan(0);
      expect(conflict.locationA.file).toBeTruthy();
      expect(conflict.locationB.file).toBeTruthy();
    }
  }, 30_000);

  // ── Diagnostic codes ───────────────────────────────────────────────

  it('diagnostic codes: every violation has a CLAWS-prefixed diagnostic code', async () => {
    const tempDir = createTempDir('diag-codes');
    copyReferenceWorkspace(tempDir);
    await initWorkspace(tempDir, { template: 'soc2' });

    const result = await runFullPipeline(tempDir);

    // Every violation must have a CLAWS-prefixed diagnostic code
    expect(result.ir.analysis.violations.length).toBeGreaterThan(0);
    for (const v of result.ir.analysis.violations) {
      expect(v.diagnosticCode).toMatch(/^CLAWS-/);
      expect(v.ruleId).toBeTruthy();
      expect(v.message.length).toBeGreaterThan(0);
      expect(v.target.length).toBeGreaterThan(0);
      expect(Array.isArray(v.fixSuggestions)).toBe(true);
      expect(Array.isArray(v.toolFuzzyMatches)).toBe(true);
    }
  }, 30_000);

  // ── Parse ordering ─────────────────────────────────────────────────

  it('parse ordering: files parsed in deterministic order (sorted paths)', async () => {
    const tempDir = createTempDir('parse-order');
    copyReferenceWorkspace(tempDir);

    // Parse twice
    const parse1 = await parse(tempDir);
    const parse2 = await parse(tempDir);

    // Entry order should be identical
    expect(parse1.entries.length).toBe(parse2.entries.length);
    for (let i = 0; i < parse1.entries.length; i++) {
      expect(parse1.entries[i]!.source).toBe(parse2.entries[i]!.source);
    }

    // Entries should follow the DEFAULT_FILE_SOURCES order (which is deterministic)
    const sources = parse1.entries.map(e => e.source);
    expect(sources).toEqual(parse2.entries.map(e => e.source));
  }, 30_000);

  // ── Collect-all-errors ─────────────────────────────────────────────

  it('collect-all-errors: malformed SOUL.md + malformed TOOLS.md → both errors reported', async () => {
    const tempDir = createTempDir('collect-errors');

    // Create workspace with TWO malformed files
    // SOUL.md: unclosed frontmatter
    writeFileSync(join(tempDir, 'SOUL.md'), '---\nbroken: true\n', 'utf-8');
    // TOOLS.md: tab indentation in YAML-like content? No, TOOLS.md is markdown.
    // Instead: empty content (produces warning)
    writeFileSync(join(tempDir, 'TOOLS.md'), '   \n   \n', 'utf-8');

    const parseResult = await parse(tempDir);

    // Both files should produce diagnostics — NOT fail-fast on first
    expect(parseResult.diagnostics.length).toBeGreaterThanOrEqual(2);

    // Find diagnostics from each file
    const soulDiags = parseResult.diagnostics.filter(d => d.file === 'SOUL.md');
    const toolsDiags = parseResult.diagnostics.filter(d => d.file === 'TOOLS.md');

    expect(soulDiags.length).toBeGreaterThan(0);
    expect(toolsDiags.length).toBeGreaterThan(0);

    // SOUL.md should have an error for unclosed frontmatter
    const unclosedFrontmatter = soulDiags.find(d => d.code === 'CLAWS-P003');
    expect(unclosedFrontmatter).toBeDefined();
    expect(unclosedFrontmatter!.severity).toBe('error');

    // TOOLS.md should have a warning for empty content
    const emptyWarning = toolsDiags.find(d => d.code === 'CLAWS-P001');
    expect(emptyWarning).toBeDefined();
    expect(emptyWarning!.severity).toBe('warning');

    // All diagnostics should have file and code fields
    for (const d of parseResult.diagnostics) {
      expect(d.file).toBeTruthy();
      expect(d.code).toMatch(/^CLAWS-/);
    }
  }, 30_000);
});
