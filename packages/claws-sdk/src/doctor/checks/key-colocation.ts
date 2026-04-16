/**
 * Doctor check: key-colocation — warn when HMAC key and audit chain
 * are stored in the same directory.
 *
 * If an attacker gains read access to that directory, they can both
 * read the audit chain and forge entries using the co-located HMAC key.
 *
 * @module claws-sdk/doctor/checks/key-colocation
 */

import { dirname, resolve, join } from 'node:path';
import { access } from 'node:fs/promises';
import { CLAWS_SIDECAR_LAYOUT } from '../../types/sidecar.js';
import type { CheckResult, Diagnostic } from '../orchestrator.js';

const CHECK_ID = 'key-colocation';
const CHECK_NAME = 'Key / Audit Chain Co-location';

/**
 * Default HMAC key path within the sidecar layout.
 */
function defaultHmacKeyPath(workspaceRoot: string): string {
  return join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.keys, 'hmac.key');
}

/**
 * Default audit chain path within the sidecar layout.
 */
function defaultChainPath(workspaceRoot: string): string {
  return join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.audit, 'chain.jsonl');
}

/**
 * Check if the HMAC key and audit chain are co-located in the same directory.
 *
 * @param chainPath - Absolute path to the audit chain file
 * @param keyPath - Absolute path to the HMAC key file
 * @returns CheckResult with a warning if co-located
 */
export function checkKeyColocation(
  chainPath: string,
  keyPath: string,
): CheckResult {
  const start = Date.now();
  const diagnostics: Diagnostic[] = [];

  const chainDir = resolve(dirname(chainPath));
  const keyDir = resolve(dirname(keyPath));

  if (chainDir === keyDir) {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'warning',
      message:
        `HMAC key and audit chain are co-located in ${chainDir}. ` +
        'An attacker with read access to this directory can both read the chain and forge entries. ' +
        'Move the HMAC key to a separate, restricted directory.',
      file: keyPath,
      fixable: false,
    });
  } else {
    diagnostics.push({
      checkId: CHECK_ID,
      severity: 'info',
      message: 'HMAC key and audit chain are in separate directories',
      fixable: false,
    });
  }

  return {
    checkId: CHECK_ID,
    name: CHECK_NAME,
    passed: diagnostics.every((d) => d.severity !== 'error'),
    diagnostics,
    durationMs: Date.now() - start,
  };
}

/**
 * Doctor check entry point — uses default sidecar paths.
 *
 * Checks whether the HMAC signing key (`.claws/keys/hmac.key`) exists
 * and if so, whether it shares a directory with the audit chain.
 */
export async function checkKeyColocationDoctor(workspaceRoot: string): Promise<CheckResult> {
  const start = Date.now();
  const keyPath = defaultHmacKeyPath(workspaceRoot);

  // Only run if the HMAC key file exists
  try {
    await access(keyPath);
  } catch {
    return {
      checkId: CHECK_ID,
      name: CHECK_NAME,
      passed: true,
      diagnostics: [{
        checkId: CHECK_ID,
        severity: 'info',
        message: 'No HMAC key file found — skipping co-location check',
        fixable: false,
      }],
      durationMs: Date.now() - start,
    };
  }

  const chainPath = defaultChainPath(workspaceRoot);

  // Only warn about co-location if the chain file also exists
  try {
    await access(chainPath);
  } catch {
    return {
      checkId: CHECK_ID,
      name: CHECK_NAME,
      passed: true,
      diagnostics: [{
        checkId: CHECK_ID,
        severity: 'info',
        message: 'No audit chain file found — skipping co-location check',
        fixable: false,
      }],
      durationMs: Date.now() - start,
    };
  }

  return checkKeyColocation(chainPath, keyPath);
}
