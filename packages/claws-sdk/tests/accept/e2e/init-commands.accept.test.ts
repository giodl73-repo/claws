/**
 * L3: Init-commands acceptance test — focused init + uninstall scenarios.
 *
 * Covers 10 discrete scenarios for `claws init` and `claws uninstall`:
 *  1. Init on empty workspace → .claws/ with 13 dirs, claws.json with detected platform
 *  2. Init --template soc2 → 5 SOC2 policy files, trustTier overrides
 *  3. Init --template hipaa → 4 HIPAA policy files
 *  4. Init --template eu-ai-act → 3 EU AI Act policy files
 *  5. Init on already-initialized workspace → exit 2, no modifications
 *  6. Uninstall → removes .claws/ and claws.json, creates backup
 *  7. Uninstall on non-initialized workspace → idempotent no-op
 *  8. Uninstall → .gitignore entries removed
 *  9. Init → uninstall → init roundtrip → byte-identical OC files
 * 10. CLAWS_BYPASS=1 → enforcement disabled, BYPASS event recorded
 *
 * @module claws-sdk/tests/accept/e2e/init-commands
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join } from 'node:path';
import {
  existsSync,
  readFileSync,
  mkdtempSync,
  writeFileSync,
  rmSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

// ── Init module ──────────────────────────────────────────────────────
import {
  initWorkspace,
  uninstallWorkspace,
  checkBypass,
  CLAWS_BYPASS_ENV,
} from '../../../src/init/index.js';

// ── Sidecar + config ─────────────────────────────────────────────────
import {
  CLAWS_SIDECAR_LAYOUT,
  CLAWS_CONFIG_FILE,
  CLAWS_GITIGNORE_DIRS,
} from '../../../src/types/sidecar.js';
import { loadConfig } from '../../../src/config/loader.js';

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
  const dir = mkdtempSync(join(tmpdir(), `claws-accept-init-cmd-${prefix}-`));
  tempDirs.push(dir);
  return dir;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Read all files recursively under a directory into a Map<relativePath, content>.
 */
function readAllFiles(dir: string, prefix = ''): Map<string, string> {
  const result = new Map<string, string>();
  if (!existsSync(dir)) return result;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const [k, v] of readAllFiles(fullPath, relPath)) {
        result.set(k, v);
      }
    } else if (entry.isFile()) {
      try {
        result.set(relPath, readFileSync(fullPath, 'utf-8'));
      } catch {
        // Skip binary/unreadable
      }
    }
  }
  return result;
}

/**
 * Create a minimal OC workspace with marker files for platform detection.
 * Returns the set of OC file basenames written.
 */
function seedOCWorkspace(dir: string): string[] {
  const files = ['SOUL.md', 'TOOLS.md', 'AGENTS.md'];
  for (const f of files) {
    writeFileSync(join(dir, f), `# ${f}\nTest content for ${f}\n`, 'utf-8');
  }
  // Add a package.json so platform is detected as 'node'
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'test-workspace', version: '1.0.0' }, null, 2),
    'utf-8',
  );
  return [...files, 'package.json'];
}

// ── Acceptance Tests ─────────────────────────────────────────────────

describe('accept: init-commands', () => {
  // ── Scenario 1: Init on empty workspace ────────────────────────────

  it('S1: init on empty workspace creates .claws/ with 13 dirs and claws.json with detected platform', async () => {
    const tempDir = createTempDir('s1');
    seedOCWorkspace(tempDir);

    const result = await initWorkspace(tempDir);

    // Exit code 0 = success
    expect(result.exitCode).toBe(0);
    expect(result.status).toBe('initialized');

    // claws.json exists at workspace root
    const configPath = join(tempDir, CLAWS_CONFIG_FILE);
    expect(existsSync(configPath)).toBe(true);

    // Config is valid JSON — config.platform is agent platform
    // (seedOCWorkspace creates SOUL.md with governance patterns → 'openclaw')
    const rawConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
    expect(rawConfig.platform).toBe('openclaw');
    expect(rawConfig.trustTier).toBe(2);
    expect(rawConfig.suppress).toEqual([]);

    // loadConfig agrees
    const loadResult = await loadConfig(tempDir);
    expect(loadResult.found).toBe(true);

    // All 13 sidecar dirs exist
    const allDirs = Object.values(CLAWS_SIDECAR_LAYOUT);
    expect(allDirs).toHaveLength(13);
    for (const dir of allDirs) {
      expect(existsSync(join(tempDir, dir)), `${dir} should exist`).toBe(true);
    }

    // .gitignore updated with sensitive dirs
    const gitignorePath = join(tempDir, '.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);
    const gitignoreContent = readFileSync(gitignorePath, 'utf-8');
    expect(gitignoreContent).toContain('.claws/keys/');
    expect(gitignoreContent).toContain('.claws/secrets/');

    // Detection result present
    expect(result.detection).toBeDefined();
    expect(result.detection!.platform).toBe('node');
    expect(result.detection!.markerFile).toBe('package.json');
  }, 30_000);

  // ── Scenario 2: Init --template soc2 ──────────────────────────────

  it('S2: init --template soc2 produces 5 SOC2 policy files with framework tag', async () => {
    const tempDir = createTempDir('s2');
    seedOCWorkspace(tempDir);

    const result = await initWorkspace(tempDir, { template: 'soc2' });

    expect(result.exitCode).toBe(0);
    expect(result.status).toBe('initialized');
    expect(result.templateApplied).toBe('soc2');

    // 5 SOC2 policy files
    const policiesDir = join(tempDir, '.claws', 'policies');
    const expectedPolicies = [
      'require_section.yaml',
      'tool_blocklist.yaml',
      'trust_tier_gate.yaml',
      'pii_detection.yaml',
      'budget_ceiling.yaml',
    ];
    for (const pf of expectedPolicies) {
      const filePath = join(policiesDir, pf);
      expect(existsSync(filePath), `policy ${pf} should exist`).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('framework: soc2');
    }

    // policyFiles list in result
    expect(result.policyFiles).toBeDefined();
    expect(result.policyFiles!.length).toBe(5);
    for (const pf of expectedPolicies) {
      expect(result.policyFiles).toContain(pf);
    }
  }, 30_000);

  // ── Scenario 3: Init --template hipaa ─────────────────────────────

  it('S3: init --template hipaa produces 4 HIPAA policy files', async () => {
    const tempDir = createTempDir('s3');
    seedOCWorkspace(tempDir);

    const result = await initWorkspace(tempDir, { template: 'hipaa' });

    expect(result.exitCode).toBe(0);
    expect(result.templateApplied).toBe('hipaa');

    const policiesDir = join(tempDir, '.claws', 'policies');
    const expectedPolicies = [
      'data_labeling_mandatory.yaml',
      'phi_detection.yaml',
      'audit_mandatory.yaml',
      'access_control.yaml',
    ];
    for (const pf of expectedPolicies) {
      const filePath = join(policiesDir, pf);
      expect(existsSync(filePath), `policy ${pf} should exist`).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('framework: hipaa');
    }

    expect(result.policyFiles).toBeDefined();
    expect(result.policyFiles!.length).toBe(4);
  }, 30_000);

  // ── Scenario 4: Init --template eu-ai-act ─────────────────────────

  it('S4: init --template eu-ai-act produces 3 EU AI Act policy files', async () => {
    const tempDir = createTempDir('s4');
    seedOCWorkspace(tempDir);

    const result = await initWorkspace(tempDir, { template: 'eu-ai-act' });

    expect(result.exitCode).toBe(0);
    expect(result.templateApplied).toBe('eu-ai-act');

    const policiesDir = join(tempDir, '.claws', 'policies');
    const expectedPolicies = [
      'risk_classification_mandatory.yaml',
      'human_oversight_gates.yaml',
      'transparency.yaml',
    ];
    for (const pf of expectedPolicies) {
      const filePath = join(policiesDir, pf);
      expect(existsSync(filePath), `policy ${pf} should exist`).toBe(true);
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('framework: eu-ai-act');
    }

    expect(result.policyFiles).toBeDefined();
    expect(result.policyFiles!.length).toBe(3);
  }, 30_000);

  // ── Scenario 5: Init on already-initialized workspace ─────────────

  it('S5: init on already-initialized workspace exits with code 2 and no modifications', async () => {
    const tempDir = createTempDir('s5');
    seedOCWorkspace(tempDir);

    // First init
    const first = await initWorkspace(tempDir);
    expect(first.exitCode).toBe(0);

    // Snapshot config + sidecar state after first init
    const configBefore = readFileSync(join(tempDir, CLAWS_CONFIG_FILE), 'utf-8');
    const sidecarFilesBefore = readAllFiles(join(tempDir, '.claws'));

    // Second init — should be idempotent
    const second = await initWorkspace(tempDir);
    expect(second.exitCode).toBe(2);
    expect(second.status).toBe('already-initialized');

    // No template, no detection, no sidecar dirs in result
    expect(second.templateApplied).toBeUndefined();
    expect(second.detection).toBeUndefined();
    expect(second.sidecarDirs).toBeUndefined();

    // Config unchanged
    const configAfter = readFileSync(join(tempDir, CLAWS_CONFIG_FILE), 'utf-8');
    expect(configAfter).toBe(configBefore);

    // Sidecar unchanged
    const sidecarFilesAfter = readAllFiles(join(tempDir, '.claws'));
    expect(sidecarFilesAfter.size).toBe(sidecarFilesBefore.size);
    for (const [path, content] of sidecarFilesBefore) {
      expect(sidecarFilesAfter.get(path), `${path} should be unchanged`).toBe(content);
    }
  }, 30_000);

  // ── Scenario 6: Uninstall removes .claws/ and claws.json with backup ─

  it('S6: uninstall removes .claws/ and claws.json, creates backup', async () => {
    const tempDir = createTempDir('s6');
    const backupsDir = createTempDir('s6-backups');
    seedOCWorkspace(tempDir);

    // Init first
    await initWorkspace(tempDir, { template: 'soc2' });
    expect(existsSync(join(tempDir, '.claws'))).toBe(true);
    expect(existsSync(join(tempDir, CLAWS_CONFIG_FILE))).toBe(true);

    // Uninstall
    const result = await uninstallWorkspace(tempDir, backupsDir);

    expect(result.exitCode).toBe(0);
    expect(result.status).toBe('uninstalled');

    // .claws/ removed
    expect(existsSync(join(tempDir, '.claws'))).toBe(false);

    // claws.json removed
    expect(existsSync(join(tempDir, CLAWS_CONFIG_FILE))).toBe(false);

    // Backup created
    expect(result.backupPath).toBeDefined();
    expect(existsSync(result.backupPath!)).toBe(true);

    // Backup contains sidecar copy
    expect(existsSync(join(result.backupPath!, 'sidecar'))).toBe(true);

    // Backup contains claws.json copy
    expect(existsSync(join(result.backupPath!, CLAWS_CONFIG_FILE))).toBe(true);
  }, 30_000);

  // ── Scenario 7: Uninstall on non-initialized workspace is no-op ────

  it('S7: uninstall on non-initialized workspace is idempotent no-op', async () => {
    const tempDir = createTempDir('s7');
    // No init — workspace has no .claws/

    const result = await uninstallWorkspace(tempDir);

    expect(result.exitCode).toBe(0);
    expect(result.status).toBe('no-op');
    expect(result.backupPath).toBeUndefined();
    expect(result.auditArchivePath).toBeUndefined();
    expect(result.gitignoreRemoved).toBeUndefined();
  }, 30_000);

  // ── Scenario 8: Uninstall removes .gitignore entries ──────────────

  it('S8: uninstall removes claws .gitignore entries', async () => {
    const tempDir = createTempDir('s8');
    const backupsDir = createTempDir('s8-backups');
    seedOCWorkspace(tempDir);

    // Pre-populate .gitignore with non-claws entries
    writeFileSync(join(tempDir, '.gitignore'), 'node_modules/\ndist/\n', 'utf-8');

    // Init adds claws entries
    await initWorkspace(tempDir);

    const gitignoreAfterInit = readFileSync(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignoreAfterInit).toContain('.claws/keys/');
    expect(gitignoreAfterInit).toContain('.claws/secrets/');
    expect(gitignoreAfterInit).toContain('node_modules/');

    // Uninstall removes claws entries but keeps others
    const result = await uninstallWorkspace(tempDir, backupsDir);

    expect(result.status).toBe('uninstalled');
    expect(result.gitignoreRemoved).toBeDefined();
    expect(result.gitignoreRemoved!.length).toBeGreaterThan(0);

    const gitignoreAfterUninstall = readFileSync(join(tempDir, '.gitignore'), 'utf-8');
    expect(gitignoreAfterUninstall).not.toContain('.claws/keys/');
    expect(gitignoreAfterUninstall).not.toContain('.claws/secrets/');
    expect(gitignoreAfterUninstall).toContain('node_modules/');
    expect(gitignoreAfterUninstall).toContain('dist/');
  }, 30_000);

  // ── Scenario 9: Init → uninstall → init roundtrip ─────────────────

  it('S9: init → uninstall → init roundtrip produces byte-identical OC workspace files', async () => {
    const tempDir = createTempDir('s9');
    const backupsDir = createTempDir('s9-backups');
    const ocFiles = seedOCWorkspace(tempDir);

    // Snapshot OC file contents before any init
    const ocBefore = new Map<string, string>();
    for (const f of ocFiles) {
      ocBefore.set(f, readFileSync(join(tempDir, f), 'utf-8'));
    }

    // Init
    const init1 = await initWorkspace(tempDir, { template: 'soc2' });
    expect(init1.exitCode).toBe(0);

    // OC files unchanged after init
    for (const [f, content] of ocBefore) {
      expect(readFileSync(join(tempDir, f), 'utf-8'), `${f} unchanged after init`).toBe(content);
    }

    // Uninstall
    const uninstall = await uninstallWorkspace(tempDir, backupsDir);
    expect(uninstall.status).toBe('uninstalled');

    // OC files still unchanged after uninstall
    for (const [f, content] of ocBefore) {
      expect(readFileSync(join(tempDir, f), 'utf-8'), `${f} unchanged after uninstall`).toBe(content);
    }

    // Re-init
    const init2 = await initWorkspace(tempDir, { template: 'soc2' });
    expect(init2.exitCode).toBe(0);

    // OC files byte-identical after roundtrip
    for (const [f, content] of ocBefore) {
      expect(readFileSync(join(tempDir, f), 'utf-8'), `${f} byte-identical after roundtrip`).toBe(content);
    }

    // Re-initialized workspace has same structure
    const allDirs = Object.values(CLAWS_SIDECAR_LAYOUT);
    for (const dir of allDirs) {
      expect(existsSync(join(tempDir, dir)), `${dir} should exist after re-init`).toBe(true);
    }

    // Config exists again
    expect(existsSync(join(tempDir, CLAWS_CONFIG_FILE))).toBe(true);
  }, 30_000);

  // ── Scenario 10: CLAWS_BYPASS=1 ──────────────────────────────────

  it('S10: CLAWS_BYPASS=1 records BYPASS event in audit chain', async () => {
    const tempDir = createTempDir('s10');
    seedOCWorkspace(tempDir);
    await initWorkspace(tempDir);

    // Not bypassed when env var is absent
    const notBypassed = await checkBypass(tempDir, undefined, {});
    expect(notBypassed.bypassed).toBe(false);
    expect(notBypassed.reason).toBe('not-requested');
    expect(notBypassed.auditRecorded).toBe(false);

    // Bypassed when env var is set
    const bypassed = await checkBypass(tempDir, undefined, { [CLAWS_BYPASS_ENV]: '1' });
    expect(bypassed.bypassed).toBe(true);
    expect(bypassed.reason).toBe('env-bypass');
    expect(bypassed.auditRecorded).toBe(true);

    // Signed audit event written to .claws/audit/chain.jsonl
    const auditFile = join(tempDir, '.claws', 'audit', 'chain.jsonl');
    expect(existsSync(auditFile)).toBe(true);
    const auditContent = readFileSync(auditFile, 'utf-8').trim();
    const auditEvent = JSON.parse(auditContent);
    expect(auditEvent.eventType).toBe('BYPASS_ACTIVATED');
    expect(auditEvent.actor).toBeTruthy();
    expect(auditEvent.hmacSignature).toMatch(/^[0-9a-f]{64}$/);
    expect(auditEvent.timestamp).toBeTruthy();

    // Fleet policy can block bypass
    const fleetBlocked = await checkBypass(
      tempDir,
      { allowBypass: false },
      { [CLAWS_BYPASS_ENV]: '1' },
    );
    expect(fleetBlocked.bypassed).toBe(false);
    expect(fleetBlocked.reason).toBe('fleet-prohibited');
    expect(fleetBlocked.auditRecorded).toBe(false);
  }, 30_000);
});
