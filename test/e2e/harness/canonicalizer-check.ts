/**
 * test/e2e/harness/canonicalizer-check — three-consumer byte-identity probe.
 *
 * The canonicalizer (JCS per RFC 8785 + extended rules) is owned by
 * `@bic/openclaw-workspace/canonicalize`. Every other package in the family
 * MUST import from that single source of truth — any parallel implementation
 * is a silent drift vector (CL-NEW §1).
 *
 * This helper proves the invariant experimentally: for an arbitrary input,
 * invoke `canonicalize` via each of the three peer packages
 * (`@bic/openclaw-policy`, `@bic/openclaw-snap`,
 * `@bic/openclaw-guardrails/audit`) and diff the resulting UTF-8 bytes.
 * Any byte-diff is a CL-NEW violation. `canonicalizerVersionCheck`
 * verifies the numeric `canonicalizerAlgorithmVersion` agrees across peers.
 *
 * @module test/e2e/harness/canonicalizer-check
 */

import { canonicalize as policyCanonicalize, canonicalizerAlgorithmVersion as policyVersion } from '@bic/openclaw-policy';
import { canonicalize as snapCanonicalize, canonicalizerAlgorithmVersion as snapVersion } from '@bic/openclaw-snap';
import {
  canonicalize as auditCanonicalize,
  canonicalizerAlgorithmVersion as auditVersion,
  CanonicalizerVersionMismatchError,
} from '@bic/openclaw-guardrails/audit';

export interface CanonicalizerByteResult {
  readonly policy: Uint8Array;
  readonly snap: Uint8Array;
  readonly audit: Uint8Array;
  readonly identical: boolean;
  readonly firstDiffOffset?: number;
}

export interface CanonicalizerVersionResult {
  readonly policy: number;
  readonly snap: number;
  readonly audit: number;
  readonly agree: boolean;
}

const encoder = new TextEncoder();

/**
 * Compare three byte arrays and return the offset of the first differing
 * byte, or `undefined` if all three are identical. Missing trailing bytes
 * in any array count as differences (sentinel value -1).
 *
 * Exported so tests can validate the diff-finding primitive independently
 * of the live canonicalizer (which always agrees on real input).
 */
export function diffThree(
  a: Uint8Array,
  b: Uint8Array,
  c: Uint8Array,
): number | undefined {
  const maxLen = Math.max(a.length, b.length, c.length);
  for (let i = 0; i < maxLen; i++) {
    const ai = i < a.length ? a[i] : -1;
    const bi = i < b.length ? b[i] : -1;
    const ci = i < c.length ? c[i] : -1;
    if (ai !== bi || bi !== ci) return i;
  }
  return undefined;
}

/**
 * Check three numeric algorithm versions for agreement. Throws
 * `CanonicalizerVersionMismatchError` when any disagree. Extracted from
 * `canonicalizerVersionCheck` so tests can simulate the mismatch path
 * without mutating live package constants.
 */
export function assertVersionsAgree(
  policy: number,
  snap: number,
  audit: number,
): CanonicalizerVersionResult {
  const agree = policy === snap && snap === audit;
  if (!agree) {
    throw new CanonicalizerVersionMismatchError({ policy, snap, audit });
  }
  return { policy, snap, audit, agree };
}

/**
 * Invoke `canonicalize` via each of the three consumer packages on identical
 * input, encode each result to UTF-8 bytes, and compare byte-for-byte.
 *
 * Returns per-surface bytes, identity flag, and the offset of the first
 * differing byte (for debugging). A `Promise` signature is kept for forward
 * compatibility with async-canonicalizer variants; the current canonicalizer
 * is synchronous.
 */
export async function canonicalizerByteIdentical(
  input: unknown,
): Promise<CanonicalizerByteResult> {
  const policyBytes = encoder.encode(policyCanonicalize(input));
  const snapBytes = encoder.encode(snapCanonicalize(input));
  const auditBytes = encoder.encode(auditCanonicalize(input));

  const firstDiff = diffThree(policyBytes, snapBytes, auditBytes);
  const identical = firstDiff === undefined;
  return identical
    ? { policy: policyBytes, snap: snapBytes, audit: auditBytes, identical: true }
    : {
        policy: policyBytes,
        snap: snapBytes,
        audit: auditBytes,
        identical: false,
        firstDiffOffset: firstDiff,
      };
}

/**
 * Read the exported `canonicalizerAlgorithmVersion` from each consumer
 * package and check all three agree. Throws
 * `CanonicalizerVersionMismatchError` when any pair disagrees — this is a
 * package-install drift (an older peer pinned alongside a newer one).
 */
export function canonicalizerVersionCheck(): CanonicalizerVersionResult {
  return assertVersionsAgree(policyVersion, snapVersion, auditVersion);
}

export { CanonicalizerVersionMismatchError };
