/**
 * Emit PolicyIR as canonical JSON.
 *
 * Deterministic: canonicalize-then-stringify produces byte-identical output
 * for the same IR across processes and platforms.
 */

import { canonicalize, computePolicyId } from '../compile/canonicalize.js';
import type { PolicyIR } from '../types/index.js';

export function emitPolicyIR(ir: PolicyIR): string {
  const finalized: PolicyIR = { ...ir, policyId: computePolicyId(ir) };
  return canonicalize(finalized);
}
