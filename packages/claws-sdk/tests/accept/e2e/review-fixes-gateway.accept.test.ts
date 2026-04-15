/**
 * L3: Review fixes — gateway/platform + architecture findings from CP-2.
 *
 * Validates the fixes for G1-G4, A1-A2:
 *  1. init → .gitignore contains all 4 sensitive dirs (keys, secrets, cache, runtime)
 *  2. amend add-skill → recompile actually runs (artifact updated, not stale)
 *  3. amend → skills/ directory contents unchanged (OC protection)
 *  4. amend → all 9 OC workspace files unchanged after amendment
 *  5. uninstall on workspace with existing backup → succeeds (force overwrite)
 *  6. uninstall → backup → uninstall again → second backup doesn't fail
 *
 * @module claws-sdk/tests/accept/e2e/review-fixes-gateway
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
import { createHash } from 'node:crypto';

// ── Init module ──────────────────────────────────────────────────────
import {
  initWorkspace,
  uninstallWorkspace,
} from '../../../src/init/index.js';

// ── Amend module ─────────────────────────────────────────────────────
import {
  runAmendPipeline,
  OC_PROTECTED_FILES,
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
import { serialize } from '../../../src/ir/governance-ir.js';
import { COMPILER_VERSION, SCHEMA_VERSION } from '../../../src/compile/version.js';
import type { GovernanceIR } from '../../../src/ir/governance-ir.js';

// ── Sidecar + config ─────────────────────────────────────────────────
import {
  CLAWS_GITIGNORE_DIRS,
  CLAWS_CONFIG_FILE,
} from '../../../src/types/sidecar.js';

// ── Fixtures ─────────────────────────────────────────────────────────

const FIXTURES = resolve(__dirname, '../../fixtures');
const REFERENCE_WORKSPACE = resolve(FIXTURES, 'oc-reference-workspace');

// ── Pipeline helper ──────────────────────────────────────────────────

async function runPipeline(workspaceDir: string): Promise<GovernanceIR> {
  const parseResult = await parse(workspaceDir);
  const intentResults = extractAllIntents(parseResult);
  const ast = buildGovernanceAST(intentResults);
  const parsedManifest = extract(ast);
  const capabilityManifest = buildCapabilityManifest(parsedManifest);
  const registry = createDefaultRegistry(capabilityManifest);
  const analysis = analyze(capabilityManifest, registry);
  const rawConflicts = detectConflicts(ast, parsedManifest);
  const conflicts = toIRConflictReport(rawConflicts);

  return {
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
}

/**
 * Recompile callback for the amend pipeline — runs full compile and writes IR.
 */
async function recompile(workspaceRoot: string): Promise<{ success: boolean }> {
  try {
    const ir = await runPipeline(workspaceRoot);
    const outDir = join(workspaceRoot, '.claws', 'compiled');
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, 'governance-ir.json'), serialize(ir), 'utf-8');
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
  const dir = mkdtempSync(join(tmpdir(), `claws-accept-gw-fix-${prefix}-`));
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
 * Hash a file's content, returning hex string.
 */
function hashFile(filePath: string): string {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

/**
 * Hash all OC-protected files including skills/ directory tree.
 */
function hashOCFiles(workspaceDir: string): Map<string, string> {
  const hashes = new Map<string, string>();
  for (const file of OC_PROTECTED_FILES) {
    if (file.endsWith('/')) {
      // Directory entry — hash all files recursively
      const dirPath = join(workspaceDir, file);
      if (existsSync(dirPath)) {
        hashDirRecursive(dirPath, file, hashes);
      }
    } else {
      const fullPath = join(workspaceDir, file);
      if (existsSync(fullPath)) {
        hashes.set(file, hashFile(fullPath));
      }
    }
  }
  return hashes;
}

function hashDirRecursive(
  dirPath: string,
  prefix: string,
  hashes: Map<string, string>,
): void {
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const relPath = `${prefix}${entry.name}`;
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      hashDirRecursive(fullPath, `${relPath}/`, hashes);
    } else if (entry.isFile()) {
      hashes.set(relPath, hashFile(fullPath));
    }
  }
}

async function initAndCompile(tempDir: string): Promise<GovernanceIR> {
  copyReferenceWorkspace(tempDir);
  await initWorkspace(tempDir, { template: 'soc2' });
  const ir = await runPipeline(tempDir);
  // Write IR so amend can read it
  const outDir = join(tempDir, '.claws', 'compiled');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'governance-ir.json'), serialize(ir), 'utf-8');
  return ir;
}

// ── Acceptance Tests ─────────────────────────────────────────────────

describe('accept: review-fixes-gateway (G1-G4 + A1-A2)', () => {

  // ── G1: Gitignore covers all 4 sensitive dirs ─────────────────────

  it('G1: init → .gitignore contains all 4 sensitive dirs (keys, secrets, cache, runtime)', async () => {
    const tempDir = createTempDir('g1');
    copyReferenceWorkspace(tempDir);

    await initWorkspace(tempDir);

    const gitignorePath = join(tempDir, '.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);
    const content = readFileSync(gitignorePath, 'utf-8');

    // All 4 dirs from CLAWS_GITIGNORE_DIRS must be present
    expect(CLAWS_GITIGNORE_DIRS).toHaveLength(4);
    for (const dir of CLAWS_GITIGNORE_DIRS) {
      const entry = dir.endsWith('/') ? dir : `${dir}/`;
      expect(content, `expected .gitignore to contain ${entry}`).toContain(entry);
    }

    // Specific checks
    expect(content).toContain('.claws/keys/');
    expect(content).toContain('.claws/secrets/');
    expect(content).toContain('.claws/cache/');
    expect(content).toContain('.claws/runtime/');
  }, 30_000);

  // ── G2: Amend recompile actually runs ─────────────────────────────

  it('G2: amend add-skill → recompile runs and governance-ir.json is updated', async () => {
    const tempDir = createTempDir('g2');
    await initAndCompile(tempDir);

    const irPath = join(tempDir, '.claws', 'compiled', 'governance-ir.json');
    expect(existsSync(irPath)).toBe(true);

    // Record the IR hash before amendment
    const irBefore = hashFile(irPath);
    // Record the mtime
    const statBefore = readFileSync(irPath, 'utf-8');
    const parsedBefore = JSON.parse(statBefore) as GovernanceIR;
    const compiledAtBefore = parsedBefore.compiler.compiledAt;

    // Small delay to ensure timestamp difference
    await new Promise((r) => setTimeout(r, 50));

    const amendment: Amendment = {
      type: 'add-skill',
      target: 'test-skill-recompile',
      value: {
        description: 'A test skill to verify recompile',
        requiredTools: ['web-search'],
      },
    };

    const result = await runAmendPipeline(
      tempDir,
      amendment,
      parsedBefore,
      2, // trust tier
      recompile,
    );

    expect(result.success).toBe(true);
    expect(result.step).toBe('done');

    // IR should have been rewritten with a new timestamp
    expect(existsSync(irPath)).toBe(true);
    const irAfter = readFileSync(irPath, 'utf-8');
    const parsedAfter = JSON.parse(irAfter) as GovernanceIR;
    expect(parsedAfter.compiler.compiledAt).not.toBe(compiledAtBefore);
  }, 30_000);

  // ── G3: skills/ directory protected by OC_PROTECTED_FILES ─────────

  it('G3: OC_PROTECTED_FILES includes skills/ directory', () => {
    expect(OC_PROTECTED_FILES).toContain('skills/');
  });

  it('G3: amend → skills/ directory contents are unchanged after amendment', async () => {
    const tempDir = createTempDir('g3');
    await initAndCompile(tempDir);

    // Hash skills/ files before amendment
    const skillsBefore = new Map<string, string>();
    const skillsDir = join(tempDir, 'skills');
    if (existsSync(skillsDir)) {
      hashDirRecursive(skillsDir, 'skills/', skillsBefore);
    }
    expect(skillsBefore.size).toBeGreaterThan(0);

    const ir = JSON.parse(
      readFileSync(join(tempDir, '.claws', 'compiled', 'governance-ir.json'), 'utf-8'),
    ) as GovernanceIR;

    const amendment: Amendment = {
      type: 'add-skill',
      target: 'new-skill-for-g3',
      value: {
        description: 'Testing OC protection for skills/',
        requiredTools: [],
      },
    };

    await runAmendPipeline(tempDir, amendment, ir, 2, recompile);

    // Hash skills/ files after amendment
    const skillsAfter = new Map<string, string>();
    if (existsSync(skillsDir)) {
      hashDirRecursive(skillsDir, 'skills/', skillsAfter);
    }

    // Same number of files, same hashes
    expect(skillsAfter.size).toBe(skillsBefore.size);
    for (const [path, hash] of skillsBefore) {
      expect(skillsAfter.get(path), `${path} should be unchanged`).toBe(hash);
    }
  }, 30_000);

  // ── G3b: All 9 OC workspace files unchanged after amendment ───────

  it('G3b: amend → all 9 OC workspace files unchanged after amendment', async () => {
    const tempDir = createTempDir('g3b');
    await initAndCompile(tempDir);

    // Hash all OC files before amendment
    const ocBefore = hashOCFiles(tempDir);
    expect(ocBefore.size).toBeGreaterThan(0);

    const ir = JSON.parse(
      readFileSync(join(tempDir, '.claws', 'compiled', 'governance-ir.json'), 'utf-8'),
    ) as GovernanceIR;

    const amendment: Amendment = {
      type: 'add-skill',
      target: 'oc-fidelity-test',
      value: {
        description: 'Testing OC fidelity across all 9 files',
        requiredTools: ['bash'],
      },
    };

    await runAmendPipeline(tempDir, amendment, ir, 2, recompile);

    // Hash all OC files after amendment
    const ocAfter = hashOCFiles(tempDir);

    // Same count, same hashes
    expect(ocAfter.size).toBe(ocBefore.size);
    for (const [path, hash] of ocBefore) {
      expect(ocAfter.get(path), `${path} should be byte-identical`).toBe(hash);
    }
  }, 30_000);

  // ── G4: Uninstall with existing backup succeeds ───────────────────

  it('G4: uninstall on workspace with existing backup → succeeds (force overwrite)', async () => {
    const tempDir = createTempDir('g4');
    const backupsDir = createTempDir('g4-backups');
    copyReferenceWorkspace(tempDir);

    // First init + uninstall
    await initWorkspace(tempDir, { template: 'soc2' });
    const first = await uninstallWorkspace(tempDir, backupsDir);
    expect(first.status).toBe('uninstalled');
    expect(first.backupPath).toBeDefined();

    // Second init + uninstall — backup target already exists
    await initWorkspace(tempDir, { template: 'soc2' });
    expect(existsSync(join(tempDir, '.claws'))).toBe(true);

    const second = await uninstallWorkspace(tempDir, backupsDir);
    expect(second.status).toBe('uninstalled');
    expect(second.backupPath).toBeDefined();

    // Both backup paths exist (different timestamps)
    expect(existsSync(first.backupPath!)).toBe(true);
    expect(existsSync(second.backupPath!)).toBe(true);
    expect(second.backupPath).not.toBe(first.backupPath);
  }, 30_000);

  it('G4b: uninstall → backup → uninstall again → second backup does not fail', async () => {
    const tempDir = createTempDir('g4b');
    const backupsDir = createTempDir('g4b-backups');
    copyReferenceWorkspace(tempDir);

    // First cycle
    await initWorkspace(tempDir);
    const r1 = await uninstallWorkspace(tempDir, backupsDir);
    expect(r1.status).toBe('uninstalled');

    // Second cycle
    await initWorkspace(tempDir);
    const r2 = await uninstallWorkspace(tempDir, backupsDir);
    expect(r2.status).toBe('uninstalled');

    // Third cycle — stress test
    await initWorkspace(tempDir);
    const r3 = await uninstallWorkspace(tempDir, backupsDir);
    expect(r3.status).toBe('uninstalled');

    // All three backups exist
    expect(existsSync(r1.backupPath!)).toBe(true);
    expect(existsSync(r2.backupPath!)).toBe(true);
    expect(existsSync(r3.backupPath!)).toBe(true);
  }, 30_000);

  // ── A1+A2: Sidecar consolidation — scaffoldSidecar writes .gitignore ─

  it('A1+A2: scaffoldSidecar creates .claws/.gitignore with all 4 sensitive dirs', async () => {
    const tempDir = createTempDir('a1a2');
    copyReferenceWorkspace(tempDir);

    await initWorkspace(tempDir);

    // .claws/.gitignore should exist (written by scaffoldSidecar)
    const innerGitignore = join(tempDir, '.claws', '.gitignore');
    expect(existsSync(innerGitignore)).toBe(true);

    const content = readFileSync(innerGitignore, 'utf-8');
    expect(content).toContain('keys/');
    expect(content).toContain('secrets/');
    expect(content).toContain('cache/');
    expect(content).toContain('runtime/');
  }, 30_000);
});
