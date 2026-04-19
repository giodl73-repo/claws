/**
 * verifyAudit — thin wrapper over `@bic/openclaw-guardrails/audit.verifyChain`.
 *
 * Policy consumes the hash chain produced by `guardrails/audit.append`; chain
 * construction, HMAC-SHA256 computation, and canonicalization all live in
 * guardrails. Policy's job is to route chain events through guardrails'
 * `verifyChain` and hand the result to `renderReport`.
 *
 * Per `docs/claws/proposals/openclaw-upstream/policy.md` §verifyAudit (L354):
 * "verifyAudit walks the hash chain **produced by** @openclaw/guardrails/audit".
 *
 * @module @bic/openclaw-policy/ops/verify-audit
 */

import { verifyChain, type AuditEntry, type VerifyResult } from '@bic/openclaw-guardrails/audit';

export interface VerifyAuditOptions {
  readonly chain: readonly AuditEntry[];
  readonly hmacKey: Buffer;
  readonly expectedGenesis?: string;
}

export function verifyAudit(options: VerifyAuditOptions): VerifyResult {
  return verifyChain([...options.chain], options.hmacKey, options.expectedGenesis);
}
