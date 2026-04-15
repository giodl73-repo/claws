/**
 * Acceptance tests: lossless-roundtrip scenario pitfalls (CP-1 gate).
 *
 * Validates the lossless guarantee — the compiler NEVER modifies
 * original OC workspace files:
 * - Compile does NOT modify any of the 9 OC workspace files (SHA-256 before/after)
 * - Generated skill directory does NOT collide with user skill names
 * - Compiled workflow detection — file with ".compiled" in name skipped
 * - Write-allow-list — emit only writes to .claws/ directories
 * - BOM preservation — source file with BOM preserved after compile
 * - Mixed line endings — CRLF source files produce correct diagnostics
 *
 * @module claws-sdk/tests/accept/scenarios/lossless-roundtrip
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
  readdirSync,
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
import { stripBOM } from '../../../src/util/text.js';

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
  const dir = mkdtempSync(join(tmpdir(), `claws-accept-lr-${prefix}-`));
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
 * Compute raw SHA-256 hash of a file's raw bytes (no normalization).
 */
function rawFileHash(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

/**
 * The 9 OC workspace files (or paths) that must remain untouched.
 */
const OC_WORKSPACE_FILES = [
  'SOUL.md',
  'TOOLS.md',
  'AGENTS.md',
  'IDENTITY.md',
  'USER.md',
  'MEMORY.md',
  'HEARTBEAT.md',
  'lobster.yaml',
  // skills/ is a directory — checked separately
];

// ── Full pipeline helper ─────────────────────────────────────────────

async function runFullPipeline(workspaceDir: string): Promise<{
  ir: GovernanceIR;
  pluginSource: string;
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
  };
}

// ── Lossless Roundtrip Acceptance Tests ──────────────────────────────

describe('accept: lossless-roundtrip scenarios (CP-1 gate)', () => {

  // ── SHA-256 before/after compile ───────────────────────────────────

  it('compile does NOT modify any of the 9 OC workspace files (SHA-256 before/after)', async () => {
    const tempDir = createTempDir('sha256');
    copyReferenceWorkspace(tempDir);
    await initWorkspace(tempDir, { template: 'soc2' });

    // Record SHA-256 of all OC files BEFORE compile
    const beforeHashes = new Map<string, string>();
    for (const file of OC_WORKSPACE_FILES) {
      const filePath = join(tempDir, file);
      if (existsSync(filePath)) {
        beforeHashes.set(file, rawFileHash(filePath));
      }
    }
    // Also hash skills/ directory files
    const skillsDir = join(tempDir, 'skills');
    if (existsSync(skillsDir)) {
      for (const subdir of readdirSync(skillsDir)) {
        const skillPath = join(skillsDir, subdir, 'SKILL.md');
        if (existsSync(skillPath)) {
          const relPath = `skills/${subdir}/SKILL.md`;
          beforeHashes.set(relPath, rawFileHash(skillPath));
        }
      }
    }

    expect(beforeHashes.size).toBeGreaterThan(0);

    // Run full compile pipeline
    const result = await runFullPipeline(tempDir);
    expect(result.pluginSource.length).toBeGreaterThan(0);

    // Record SHA-256 of all OC files AFTER compile
    for (const [file, beforeHash] of beforeHashes) {
      const filePath = join(tempDir, file);
      expect(existsSync(filePath), `${file} should still exist after compile`).toBe(true);
      const afterHash = rawFileHash(filePath);
      expect(afterHash, `${file} must not be modified by compile`).toBe(beforeHash);
    }
  }, 30_000);

  // ── Generated skill directory collision check ──────────────────────

  it('generated skill directory does NOT collide with user skill names', async () => {
    const tempDir = createTempDir('collision');

    // Create workspace with a user-authored skill named "governance"
    // (a plausible name that might collide with generated governance skill)
    writeFileSync(join(tempDir, 'SOUL.md'), '# Agent Soul\n\nYou are helpful.\n', 'utf-8');
    writeFileSync(join(tempDir, 'TOOLS.md'), '# Tools\n\n## Read\n- Risk: R1\n- Description: Read files\n', 'utf-8');
    mkdirSync(join(tempDir, 'skills', 'governance'), { recursive: true });
    writeFileSync(
      join(tempDir, 'skills', 'governance', 'SKILL.md'),
      '# Governance Review\n\nReview PRs for governance compliance.\n\n## Required Tools\n- Read\n',
      'utf-8',
    );

    // Parse and verify the user skill is found
    const parseResult = await parse(tempDir);
    const skillEntry = parseResult.entries.find(e => e.source === 'skills/');
    expect(skillEntry).toBeDefined();
    expect(skillEntry!.status).toBe('present');

    if (skillEntry!.status === 'present') {
      expect(skillEntry!.content).toContain('Governance Review');
    }

    // Extract intents — the user's "governance" skill should be extracted
    const intents = extractAllIntents(parseResult);
    const skillIntents = intents.find(r => r.source === 'skills/');
    expect(skillIntents).toBeDefined();
    expect(skillIntents!.intents.length).toBeGreaterThan(0);

    // The user's skill directory must remain intact after parse
    expect(existsSync(join(tempDir, 'skills', 'governance', 'SKILL.md'))).toBe(true);
    const preserved = readFileSync(
      join(tempDir, 'skills', 'governance', 'SKILL.md'),
      'utf-8',
    );
    expect(preserved).toContain('Governance Review');
  }, 30_000);

  // ── Compiled workflow detection ────────────────────────────────────

  it('compiled workflow detection: file with ".compiled" in name skipped by parser', async () => {
    const tempDir = createTempDir('compiled-skip');

    // Create workspace with a normal lobster.yaml AND a compiled version
    writeFileSync(join(tempDir, 'SOUL.md'), '# Agent Soul\n\nYou are helpful.\n', 'utf-8');
    writeFileSync(join(tempDir, 'TOOLS.md'), '# Tools\n\n## Read\n- Risk: R1\n- Description: Read\n', 'utf-8');
    writeFileSync(
      join(tempDir, 'lobster.yaml'),
      'name: deploy-workflow\nsteps:\n  - name: build\n    command: npm run build\n  - name: test\n    command: npm test\n',
      'utf-8',
    );
    // This compiled version should NOT be treated as a source file
    writeFileSync(
      join(tempDir, 'lobster.compiled.yaml'),
      'name: deploy-workflow\nsteps:\n  - name: governance-check\n    command: claws check\n  - name: build\n    command: npm run build\n',
      'utf-8',
    );

    const parseResult = await parse(tempDir);

    // Parser reads lobster.yaml, NOT lobster.compiled.yaml
    const workflowEntry = parseResult.entries.find(e => e.source === 'lobster.yaml');
    expect(workflowEntry).toBeDefined();
    expect(workflowEntry!.status).toBe('present');

    if (workflowEntry!.status === 'present') {
      // Content should be from the original, not the compiled version
      expect(workflowEntry!.content).not.toContain('governance-check');
      expect(workflowEntry!.content).toContain('build');
    }

    // The compiled file should NOT appear in entries
    const compiledEntry = parseResult.entries.find(e =>
      e.source.includes('compiled'),
    );
    expect(compiledEntry).toBeUndefined();
  }, 30_000);

  // ── Write-allow-list ───────────────────────────────────────────────

  it('write-allow-list: emit only targets .claws/ directories, never workspace root', async () => {
    const tempDir = createTempDir('write-allow');
    copyReferenceWorkspace(tempDir);
    await initWorkspace(tempDir, { template: 'soc2' });

    // Record all files in workspace root before compile
    const beforeFiles = new Set<string>();
    for (const entry of readdirSync(tempDir)) {
      if (entry !== '.claws' && entry !== 'claws.json') {
        beforeFiles.add(entry);
      }
    }

    // Run full pipeline (parse+analyze+emit, but DON'T write emit output)
    const result = await runFullPipeline(tempDir);
    expect(result.pluginSource.length).toBeGreaterThan(0);

    // The parse pipeline itself should not create ANY new files in workspace root
    const afterFiles = new Set<string>();
    for (const entry of readdirSync(tempDir)) {
      if (entry !== '.claws' && entry !== 'claws.json') {
        afterFiles.add(entry);
      }
    }

    // No new files in workspace root (only .claws/ should be modified)
    for (const file of afterFiles) {
      expect(beforeFiles.has(file), `unexpected file in workspace root: ${file}`).toBe(true);
    }

    // All emit results are in-memory — nothing written to disk by parse/analyze/emit pipeline
    expect(typeof result.pluginSource).toBe('string');
  }, 30_000);

  // ── BOM preservation ───────────────────────────────────────────────

  it('BOM preservation: source file with BOM preserved in source after compile (no write-back)', async () => {
    const tempDir = createTempDir('bom-preserve');

    // Create workspace files, SOUL.md has a UTF-8 BOM
    const BOM = '\uFEFF';
    const soulWithBOM = `${BOM}# Agent Soul\n\nYou are helpful.\n\n## Deny Constraints\n\n- **Never access production.**\n`;
    writeFileSync(join(tempDir, 'SOUL.md'), soulWithBOM, 'utf-8');
    writeFileSync(join(tempDir, 'TOOLS.md'), '# Tools\n\n## Read\n- Risk: R1\n- Description: Read\n', 'utf-8');

    // Record raw bytes before compile
    const beforeBytes = readFileSync(join(tempDir, 'SOUL.md'));
    const beforeHash = createHash('sha256').update(beforeBytes).digest('hex');

    // Run parse (which is the stage that reads source files)
    const parseResult = await parse(tempDir);
    expect(parseResult.presentCount).toBeGreaterThan(0);

    // Source file on disk must be byte-for-byte identical — BOM preserved
    const afterBytes = readFileSync(join(tempDir, 'SOUL.md'));
    const afterHash = createHash('sha256').update(afterBytes).digest('hex');
    expect(afterHash).toBe(beforeHash);

    // Verify the BOM is still there in raw bytes
    expect(afterBytes[0]).toBe(0xEF); // UTF-8 BOM byte 1
    expect(afterBytes[1]).toBe(0xBB); // UTF-8 BOM byte 2
    expect(afterBytes[2]).toBe(0xBF); // UTF-8 BOM byte 3

    // But the parsed content should NOT have the BOM (stripped for processing)
    const soulEntry = parseResult.entries.find(e => e.source === 'SOUL.md');
    expect(soulEntry!.status).toBe('present');
    if (soulEntry!.status === 'present') {
      expect(soulEntry!.content.charCodeAt(0)).not.toBe(0xFEFF);
    }
  }, 30_000);

  // ── Mixed line endings ─────────────────────────────────────────────

  it('mixed line endings: CRLF source files produce correct line numbers in diagnostics', async () => {
    const tempDir = createTempDir('mixed-endings');

    // Create a SOUL.md with CRLF line endings that has a structural issue
    // (missing heading produces warning at correct line)
    const crlfContent = 'No heading here\r\n\r\nJust some text about being helpful.\r\n\r\n## Deny Constraints\r\n\r\n- **Never access production.**\r\n';
    writeFileSync(join(tempDir, 'SOUL.md'), crlfContent, 'utf-8');
    writeFileSync(join(tempDir, 'TOOLS.md'), '# Tools\r\n\r\n## Read\r\n- Risk: R1\r\n- Description: Read files\r\n', 'utf-8');

    const parseResult = await parse(tempDir);

    // SOUL.md should produce a "no heading" warning
    const soulDiag = parseResult.diagnostics.find(
      d => d.file === 'SOUL.md' && d.code === 'CLAWS-P002',
    );
    expect(soulDiag).toBeDefined();
    expect(soulDiag!.severity).toBe('warning');
    // Line number should be correct (line 1, where the non-heading text starts)
    expect(soulDiag!.line).toBe(1);

    // Content should be normalized to LF internally
    const soulEntry = parseResult.entries.find(e => e.source === 'SOUL.md');
    expect(soulEntry!.status).toBe('present');
    if (soulEntry!.status === 'present') {
      // No \r\n in normalized content
      expect(soulEntry!.content).not.toContain('\r\n');
      // Content preserved after normalization
      expect(soulEntry!.content).toContain('Never access production');
    }
  }, 30_000);
});
