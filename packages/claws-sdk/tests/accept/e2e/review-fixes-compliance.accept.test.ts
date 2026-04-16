/**
 * L3: Compliance review fixes acceptance test — CP-2 audit chain integrity.
 *
 * Validates the four compliance review fixes (X1–X4):
 * 1. Bypass events are HMAC-signed via the artifact signer
 * 2. Bypass events contain all mandatory fields (actor, timestamp, policyVersion, outcome)
 * 3. Uninstall records GOVERNANCE_REMOVED before chain archive
 * 4. Amendment apply records AMENDMENT_APPLIED events
 * 5. All audit events have valid HMAC signatures
 * 6. Sequential lifecycle: init → amend → bypass → uninstall with correct ordering
 *
 * @module claws-sdk/tests/accept/e2e/review-fixes-compliance
 */

import { describe, it, expect, afterEach } from 'vitest';
import { join, resolve } from 'node:path';
import {
  mkdtempSync,
  cpSync,
  rmSync,
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { initWorkspace } from '../../../src/init/index.js';
import { checkBypass } from '../../../src/config/bypass.js';
import { uninstallWorkspace } from '../../../src/init/uninstall.js';
import { applyAmendment } from '../../../src/amend/apply.js';
import { readAuditChain } from '../../../src/compliance/audit-chain.js';
import { verifyAuditEntry, type AuditChainEntry } from '../../../src/compliance/artifact-signer.js';
import type { Amendment } from '../../../src/amend/validate.js';

// ── Fixtures ─────────────────────────────────────────────────────────

const FIXTURES = resolve(__dirname, '../../fixtures');
const REFERENCE_WORKSPACE = resolve(FIXTURES, 'oc-reference-workspace');

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

function createTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'claws-accept-compliance-'));
  tempDirs.push(dir);
  return dir;
}

/**
 * Set up a fresh initialized workspace for testing.
 */
async function setupWorkspace(): Promise<string> {
  const tempDir = createTempDir();

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

  await initWorkspace(tempDir);
  return tempDir;
}

/**
 * Read the HMAC signing key from the workspace.
 */
function readSigningKey(workspaceRoot: string): Buffer {
  const keyPath = join(workspaceRoot, '.claws', 'keys', 'hmac.key');
  const hex = readFileSync(keyPath, 'utf-8').trim();
  return Buffer.from(hex, 'hex');
}

/**
 * Read the audit chain from a backup archive directory.
 */
function readArchivedChain(backupsDir: string): AuditChainEntry[] {
  const hashEntries = readdirSync(backupsDir);
  const wsHashDir = join(backupsDir, hashEntries[0]!);
  const timestampEntries = readdirSync(wsHashDir);
  const archiveDir = join(wsHashDir, timestampEntries[0]!, 'audit-archive');
  const chainFile = join(archiveDir, 'chain.jsonl');

  expect(existsSync(archiveDir), 'audit-archive should exist').toBe(true);
  expect(existsSync(chainFile), 'chain.jsonl should exist').toBe(true);

  return readFileSync(chainFile, 'utf-8')
    .trim()
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as AuditChainEntry);
}

/**
 * Stub recompile function for amendment tests.
 */
const stubRecompile = async () => ({ success: true });

// ── Acceptance Tests ─────────────────────────────────────────────────

describe('accept: compliance review fixes (CP-2 audit chain integrity)', () => {
  // ── X1: Bypass events are HMAC-signed ────────────────────────────

  it('X1: CLAWS_BYPASS=1 → bypass event is HMAC-signed with valid hex signature', async () => {
    const workspace = await setupWorkspace();

    await checkBypass(workspace, undefined, { CLAWS_BYPASS: '1' });

    const chain = await readAuditChain(workspace);
    expect(chain.length).toBeGreaterThanOrEqual(1);

    const bypassEvent = chain.find((e) => e.eventType === 'BYPASS_ACTIVATED');
    expect(bypassEvent).toBeDefined();
    expect(bypassEvent!.hmacSignature).toBeDefined();
    expect(bypassEvent!.hmacSignature).toMatch(/^[0-9a-f]{64}$/);
    expect(bypassEvent!.keyId).toBe('claws-default-v1');
    expect(bypassEvent!.algorithm).toBe('sha256');
  }, 30_000);

  // ── X2: Bypass event contains all mandatory fields ───────────────

  it('X2: bypass event contains actor, timestamp, policyVersion, outcome, target, ruleId', async () => {
    const workspace = await setupWorkspace();

    await checkBypass(workspace, undefined, { CLAWS_BYPASS: '1' });

    const chain = await readAuditChain(workspace);
    const bypassEvent = chain.find((e) => e.eventType === 'BYPASS_ACTIVATED')!;
    expect(bypassEvent).toBeDefined();

    expect(bypassEvent.actor).toBeTruthy();
    expect(typeof bypassEvent.actor).toBe('string');
    expect(bypassEvent.timestamp).toBeTruthy();
    expect(bypassEvent.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(bypassEvent.policyVersion).toBeTruthy();
    expect(bypassEvent.outcome).toBe('allow');
    expect(bypassEvent.target).toBeTruthy();
    expect(bypassEvent.ruleId).toBe('BYPASS-001');
    expect(bypassEvent.severity).toBe(5);
    expect(typeof bypassEvent.seq).toBe('number');
  }, 30_000);

  // ── X3: Uninstall records GOVERNANCE_REMOVED ─────────────────────

  it('X3: uninstall → archived audit chain contains GOVERNANCE_REMOVED with workspace path + actor', async () => {
    const workspace = await setupWorkspace();
    const backupsDir = createTempDir();

    await uninstallWorkspace(workspace, backupsDir);

    const entries = readArchivedChain(backupsDir);
    const govRemoved = entries.find((e) => e.eventType === 'GOVERNANCE_REMOVED');
    expect(govRemoved).toBeDefined();
    expect(govRemoved!.target).toBe(workspace);
    expect(govRemoved!.actor).toBeTruthy();
    expect(govRemoved!.action).toBe('uninstall');
    expect(govRemoved!.ruleId).toBe('UNINSTALL-001');
    expect(govRemoved!.severity).toBe(5);
  }, 30_000);

  // ── X3b: GOVERNANCE_REMOVED appears BEFORE chain archive ─────────

  it('X3b: GOVERNANCE_REMOVED is the last entry in archived chain (appended before archive)', async () => {
    const workspace = await setupWorkspace();
    const backupsDir = createTempDir();

    // Create a bypass event first so chain has multiple entries
    await checkBypass(workspace, undefined, { CLAWS_BYPASS: '1' });

    await uninstallWorkspace(workspace, backupsDir);

    const entries = readArchivedChain(backupsDir);
    expect(entries.length).toBeGreaterThanOrEqual(2);

    // GOVERNANCE_REMOVED must be the LAST entry
    const lastEntry = entries[entries.length - 1]!;
    expect(lastEntry.eventType).toBe('GOVERNANCE_REMOVED');

    // BYPASS_ACTIVATED must come before GOVERNANCE_REMOVED
    const bypassIdx = entries.findIndex((e) => e.eventType === 'BYPASS_ACTIVATED');
    const govIdx = entries.findIndex((e) => e.eventType === 'GOVERNANCE_REMOVED');
    expect(bypassIdx).toBeLessThan(govIdx);
  }, 30_000);

  // ── X4: Amendment apply records AMENDMENT_APPLIED ────────────────

  it('X4a: amend add-skill → audit chain contains AMENDMENT_APPLIED with type=add-skill', async () => {
    const workspace = await setupWorkspace();

    const amendment: Amendment = {
      type: 'add-skill',
      target: 'test-skill',
      value: { requiredTools: [] },
    };

    await applyAmendment(workspace, amendment, stubRecompile);

    const chain = await readAuditChain(workspace);
    const amendEvent = chain.find((e) => e.eventType === 'AMENDMENT_APPLIED');
    expect(amendEvent).toBeDefined();
    expect(amendEvent!.target).toBe('test-skill');
    expect(amendEvent!.action).toBe('add-skill');
    expect(amendEvent!.outcome).toBe('allow');
    expect(amendEvent!.ruleId).toBe('AMEND-ADD-SKILL');
  }, 30_000);

  it('X4b: amend remove-tool → audit chain contains AMENDMENT_APPLIED with type=remove-tool', async () => {
    const workspace = await setupWorkspace();

    const amendment: Amendment = {
      type: 'remove-tool',
      target: 'dangerous-tool',
      value: {},
    };

    await applyAmendment(workspace, amendment, stubRecompile);

    const chain = await readAuditChain(workspace);
    const amendEvent = chain.find((e) => e.eventType === 'AMENDMENT_APPLIED');
    expect(amendEvent).toBeDefined();
    expect(amendEvent!.target).toBe('dangerous-tool');
    expect(amendEvent!.action).toBe('remove-tool');
    expect(amendEvent!.ruleId).toBe('AMEND-REMOVE-TOOL');
  }, 30_000);

  // ── Sequential lifecycle: correct event ordering ─────────────────

  it('X5: sequential init → amend → bypass → uninstall → all 3 event types in order', async () => {
    const workspace = await setupWorkspace();
    const backupsDir = createTempDir();

    // Step 1: Amend (add-skill)
    await applyAmendment(
      workspace,
      { type: 'add-skill', target: 'lifecycle-skill', value: { requiredTools: [] } },
      stubRecompile,
    );

    // Step 2: Bypass
    await checkBypass(workspace, undefined, { CLAWS_BYPASS: '1' });

    // Step 3: Uninstall (records GOVERNANCE_REMOVED then archives)
    await uninstallWorkspace(workspace, backupsDir);

    const entries = readArchivedChain(backupsDir);
    expect(entries.length).toBe(3);

    // Verify ordering: AMENDMENT_APPLIED → BYPASS_ACTIVATED → GOVERNANCE_REMOVED
    expect(entries[0]!.eventType).toBe('AMENDMENT_APPLIED');
    expect(entries[1]!.eventType).toBe('BYPASS_ACTIVATED');
    expect(entries[2]!.eventType).toBe('GOVERNANCE_REMOVED');

    // Verify sequential seq numbers
    expect(entries[0]!.seq).toBe(0);
    expect(entries[1]!.seq).toBe(1);
    expect(entries[2]!.seq).toBe(2);
  }, 30_000);

  // ── All audit events have valid HMAC signatures ──────────────────

  it('X6: all audit events across lifecycle have valid HMAC signatures', async () => {
    const workspace = await setupWorkspace();
    const backupsDir = createTempDir();

    // Generate multiple events
    await applyAmendment(
      workspace,
      { type: 'add-skill', target: 'signed-skill', value: { requiredTools: [] } },
      stubRecompile,
    );
    await checkBypass(workspace, undefined, { CLAWS_BYPASS: '1' });

    // Read the signing key before uninstall removes it
    const signingKey = readSigningKey(workspace);

    await uninstallWorkspace(workspace, backupsDir);

    const entries = readArchivedChain(backupsDir);
    expect(entries.length).toBe(3);

    // Verify every entry's HMAC signature
    for (const entry of entries) {
      const valid = verifyAuditEntry(entry, signingKey);
      expect(valid, `Entry seq=${entry.seq} (${entry.eventType}) HMAC should be valid`).toBe(true);
    }
  }, 30_000);
});
