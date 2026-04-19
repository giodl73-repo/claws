/**
 * canonicalize helpers for PolicyIR.
 *
 * RFC 8785 JCS is owned by `@bic/openclaw-workspace/canonicalize`. This module
 * only adds the PolicyIR-specific helper `computePolicyId` — a thin wrapper
 * over the shared `computeStrippedHash`. The strip-and-hash primitive lives
 * in workspace so @bic/openclaw-snap can call it with identical semantics;
 * two parallel implementations would be a silent drift vector.
 */

import {
  canonicalize,
  canonicalHash,
  computeStrippedHash,
  CANONICALIZER_VERSION,
} from '@bic/openclaw-workspace/canonicalize';

import type { PolicyIR } from '../types/index.js';

export { canonicalize, canonicalHash, CANONICALIZER_VERSION };

export function computePolicyId(ir: PolicyIR): string {
  return computeStrippedHash(ir, ['policyId', 'canonicalizerVersion']);
}
