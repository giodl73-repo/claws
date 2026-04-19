/**
 * Audit chain — append signed events to the tamper-evident audit log.
 *
 * All governance-significant actions (bypass, uninstall, amendments) MUST
 * record events through this module. Events are HMAC-signed and appended
 * to `.claws/audit/chain.jsonl` as JSON-lines.
 *
 * @module claws-sdk/compliance/audit-chain
 */

import { appendFile, mkdir, readFile, writeFile, open, unlink } from 'node:fs/promises';
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
 * Lock file name within the audit directory.
 */
const CHAIN_LOCK_FILE = 'chain.lock';

/**
 * Default maximum age of a lock file before it is considered stale (60 seconds).
 */
const DEFAULT_LOCK_TIMEOUT_MS = 60 * 1000;

/**
 * Acquire a file lock on the audit chain using atomic O_EXCL create.
 *
 * Prevents TOCTOU race where concurrent appenders read the same chain length,
 * assign duplicate seq numbers, and corrupt the chain. The lock serialises
 * the read-length + append operation.
 *
 * If the lock file exists, checks PID liveness and lock age.
 * Stale locks (dead PID or expired) are reclaimed and retried once.
 */
async function acquireChainLock(auditDir: string, lockTimeoutMs: number = DEFAULT_LOCK_TIMEOUT_MS): Promise<string> {
  const lockPath = join(auditDir, CHAIN_LOCK_FILE);
  const lockContent = `${process.pid}\n${Date.now()}\n`;

  try {
    const fh = await open(lockPath, 'wx');
    await fh.writeFile(lockContent, 'utf-8');
    await fh.close();
    return lockPath;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'EEXIST') throw err;

    // Lock file exists — check if it is stale
    try {
      const content = await readFile(lockPath, 'utf-8');
      const [pidStr, tsStr] = content.trim().split('\n');
      const lockPid = Number(pidStr);
      const lockTs = Number(tsStr);

      let pidAlive = false;
      try {
        process.kill(lockPid, 0);
        pidAlive = true;
      } catch {
        pidAlive = false;
      }

      if (!pidAlive || (Number.isFinite(lockTs) && Date.now() - lockTs > lockTimeoutMs)) {
        // Stale lock — remove and retry once with atomic O_EXCL
        await unlink(lockPath);
        const fh = await open(lockPath, 'wx');
        await fh.writeFile(lockContent, 'utf-8');
        await fh.close();
        return lockPath;
      }
    } catch {
      // Could not read/parse/clean lock — fall through to throw
    }

    throw new Error('Audit chain append already in progress (lock file exists). Wait or remove .claws/audit/chain.lock');
  }
}

/**
 * Release the chain lock by unlinking the lock file.
 */
async function releaseChainLock(lockPath: string): Promise<void> {
  try {
    await unlink(lockPath);
  } catch {
    // Best-effort cleanup
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
 * random 32-byte key and writes it to disk using O_EXCL (exclusive creation)
 * to prevent TOCTOU races where two concurrent processes both generate
 * different keys and the second silently overwrites the first.
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

    try {
      // O_CREAT | O_EXCL | O_WRONLY — atomic: fails with EEXIST if file already exists.
      // This prevents a TOCTOU race where two concurrent processes both fail readFile,
      // both generate different random keys, and the second overwrites the first.
      const fh = await open(keyPath, 'wx');
      await fh.writeFile(key.toString('hex') + '\n', 'utf-8');
      await fh.datasync();
      await fh.close();
      return key;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') throw err;

      // Another process won the race and created the key — read theirs.
      const hex = await readFile(keyPath, 'utf-8');
      return Buffer.from(hex.trim(), 'hex');
    }
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

  const key = await getSigningKey(workspaceRoot);
  const actor = event.actor ?? resolveActor();

  // Lock around read-length + append to prevent TOCTOU race where concurrent
  // appenders read the same chain length and assign duplicate seq numbers.
  const lockPath = await acquireChainLock(auditDir);
  try {
    const chainPath = join(auditDir, CHAIN_FILE);
    const seq = await readChainLength(chainPath);

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
  } finally {
    await releaseChainLock(lockPath);
  }
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

export { readPolicyVersion, CHAIN_FILE, acquireChainLock, releaseChainLock };

/**
 * Pluggable audit-chain emission surface — CP-7 R1 ciso M2.
 *
 * Governance-significant modules (trust-manager, violation-state machine,
 * session-config-editor, auto-snapshot) accept an optional sink in their
 * constructor options. When supplied the module calls `emit()` at every
 * audit-relevant mutation; when omitted audit emission is a silent no-op so
 * unit tests and tree-shaken consumers keep working without ceremony.
 *
 * The sink receives the same {@link AuditEventInput} shape the
 * `appendAuditEvent` helper accepts. `fire-and-forget` is the contract:
 * the sink MUST NOT throw back at the caller — persistence failures are
 * expected to land in operator logs, not in a user PATCH response (the
 * audit trail is a compliance artifact, not a request-path precondition).
 *
 * The serve layer wires a single {@link createFsAuditChainSink} instance
 * backed by `.claws/audit/chain.jsonl`; tests inject an in-memory capturing
 * sink to assert that the right events fired with the right fields.
 */
export interface AuditChainSink {
  readonly emit: (event: AuditEventInput) => void;
}

/**
 * Options for {@link createFsAuditChainSink}.
 */
export interface FsAuditChainSinkOptions {
  /** Absolute workspace root. Used to resolve the chain file path. */
  readonly workspaceRoot: string;
  /**
   * Optional error observer. Invoked with the caught error when a write
   * fails. Defaults to `console.error`. Tests inject a spy so they can
   * assert the sink never throws while still surfacing failures.
   */
  readonly onError?: (err: unknown) => void;
}

/**
 * Construct a filesystem-backed {@link AuditChainSink} that appends each
 * emitted event to `.claws/audit/chain.jsonl` as a signed HMAC-chained
 * entry. The returned sink is fire-and-forget — the caller's call site
 * never awaits the persistence. Append-safety comes from the existing
 * `acquireChainLock` + signed-entry machinery in {@link appendAuditEvent}.
 */
export function createFsAuditChainSink(
  options: FsAuditChainSinkOptions,
): AuditChainSink {
  const onError =
    options.onError ??
    ((err: unknown): void => {
      // eslint-disable-next-line no-console
      console.error('[audit-chain] sink write failed:', err);
    });
  return {
    emit(event: AuditEventInput): void {
      void appendAuditEvent(options.workspaceRoot, event).catch(onError);
    },
  };
}
