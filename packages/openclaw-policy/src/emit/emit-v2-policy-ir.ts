/**
 * @bic/openclaw-policy/emit/emit-v2-policy-ir — serialize the v2 form.
 *
 * Composes `toV2PolicyIR` (rich → v2 projection with R5-lowering) with
 * `canonicalize` (RFC 8785 JCS) so the on-disk artifact is byte-identical
 * across processes producing the same logical IR.
 *
 * The result is what gets written to `<snapshot>/.openclaw/policy/policy-ir.json`
 * and what the gateway's policy plugin reads via `store.read`.
 *
 * @module @bic/openclaw-policy/emit/emit-v2-policy-ir
 */

import type { SnapshotId } from '@bic/v2-prototype';

import { canonicalize } from '../compile/canonicalize.js';
import type { PolicyIR as RichPolicyIR } from '../types/index.js';
import { toV2PolicyIR } from './lower.js';

export function emitV2PolicyIR(
  rich: RichPolicyIR,
  snapshotId: SnapshotId,
  opts: { now?: () => Date } = {},
): string {
  const v2 = toV2PolicyIR(rich, snapshotId, opts);
  return canonicalize(v2 as unknown as Record<string, unknown>);
}
