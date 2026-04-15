/**
 * Audit chain — append signed events to the tamper-evident audit log.
 *
 * All governance-significant actions (bypass, uninstall, amendments) MUST
 * record events through this module. Events are HMAC-signed and appended
 * to `.claws/audit/chain.jsonl` as JSON-lines.
 *
 * @module claws-sdk/compliance/audit-chain
 */

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { userInfo } from 'node:os';

import { CLAWS_SIDECAR_LAYOUT } from '../types/sidecar.js';
import { signAuditEntry, type AuditChainEntry } from './artifact-signer.js';

/**
 * The audit chain filename within the audit directory.
 */
const CHAIN_FILE = 'chain.jsonl';

/**
 * Default key ID when no key rotation is configured.
 */
const DEFAULT_KEY_ID = 'claws-default-v1';

/**
 * Fields required for recording an audit event.
 */
export interface AuditEventInput {
  /** Category of the event (e.g. 'BYPASS_ACTIVATED', 'GOVERNANCE_REMOVED'). */
  readonly eventType: string;
  /** What the event applies to (workspace path, tool name, etc.). */
  readonly target: string;
  /** The action taken. */
  readonly action: string;
  /** Result of the action. */
  readonly outcome: string;
  /** Rule ID for audit trail correlation. */
  readonly ruleId: string;
  /** Severity level (1-5). */
  readonly severity: number;
  /** Policy version at the time of the event. */
  readonly policyVersion: string;
  /** Override actor (default: OS user). */
  readonly actor?: string;
}

/**
 * Resolve the current actor identity.
 *
 * Uses process.env.USER, process.env.USERNAME, or os.userInfo() as fallback.
 */
export function resolveActor(): string {
  /* istanbul ignore next -- USERNAME always set on Windows; userInfo+catch are safety nets */
  try {
    return process.env.USER ?? process.env.USERNAME ?? userInfo().username;
  } catch {
    return 'unknown';
  }
}

/**
 * Read the current chain length (number of entries) from the chain file.
 * Returns 0 if the file doesn't exist.
 */
async function readChainLength(chainPath: string): Promise<number> {
  try {
    const content = await readFile(chainPath, 'utf-8');
    const lines = content.trim().split('\n').filter((l) => l.length > 0);
    return lines.length;
  } catch {
    return 0;
  }
}

/**
 * Get or generate the HMAC signing key.
 *
 * Reads from `.claws/keys/hmac.key` if present, otherwise generates a
 * random 32-byte key and writes it to disk.
 */
async function getSigningKey(workspaceRoot: string): Promise<Buffer> {
  const keysDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.keys);
  const keyPath = join(keysDir, 'hmac.key');

  try {
    const hex = await readFile(keyPath, 'utf-8');
    return Buffer.from(hex.trim(), 'hex');
  } catch {
    await mkdir(keysDir, { recursive: true });
    const key = randomBytes(32);
    await writeFile(keyPath, key.toString('hex') + '\n', 'utf-8');
    return key;
  }
}

/**
 * Read the policy version from claws.json, falling back to 'unknown'.
 */
async function readPolicyVersion(workspaceRoot: string): Promise<string> {
  try {
    const raw = await readFile(join(workspaceRoot, 'claws.json'), 'utf-8');
    const config = JSON.parse(raw) as Record<string, unknown>;
    return String(config['compilerVersion'] ?? config['version'] ?? 'unknown');
  } catch {
    return 'unknown';
  }
}

/**
 * Append a signed audit event to the audit chain.
 *
 * Creates the audit directory and chain file if they don't exist.
 * Returns the complete signed AuditChainEntry.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @param event - The audit event fields
 * @returns The signed audit chain entry that was appended
 */
export async function appendAuditEvent(
  workspaceRoot: string,
  event: AuditEventInput,
): Promise<AuditChainEntry> {
  const auditDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.audit);
  await mkdir(auditDir, { recursive: true });

  const chainPath = join(auditDir, CHAIN_FILE);
  const seq = await readChainLength(chainPath);
  const key = await getSigningKey(workspaceRoot);
  const actor = event.actor ?? resolveActor();

  const unsigned = {
    seq,
    timestamp: new Date().toISOString(),
    eventType: event.eventType,
    actor,
    target: event.target,
    action: event.action,
    outcome: event.outcome,
    ruleId: event.ruleId,
    severity: event.severity,
    policyVersion: event.policyVersion,
  };

  const signed = signAuditEntry(unsigned, key, DEFAULT_KEY_ID);
  await appendFile(chainPath, JSON.stringify(signed) + '\n', 'utf-8');

  return signed;
}

/**
 * Read all entries from the audit chain.
 *
 * @param workspaceRoot - Absolute path to workspace root
 * @returns Array of AuditChainEntry objects
 */
export async function readAuditChain(workspaceRoot: string): Promise<AuditChainEntry[]> {
  const auditDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.audit);
  const chainPath = join(auditDir, CHAIN_FILE);

  try {
    const content = await readFile(chainPath, 'utf-8');
    return content
      .trim()
      .split('\n')
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as AuditChainEntry);
  } catch {
    return [];
  }
}

export { readPolicyVersion, CHAIN_FILE };
