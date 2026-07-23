import type { InvalidReason } from "../types.js";

export interface ContentHashInput {
  readonly handleContentHash: string;
  readonly canonicalInvocationHash: string;
}

/**
 * Compares the handle's `contentHash` against the host-supplied canonical
 * invocation hash (P-02). The validator does NOT re-canonicalize; the host is
 * authoritative for what the hash should be.
 */
export function checkContentHash(input: ContentHashInput): InvalidReason | null {
  return input.handleContentHash === input.canonicalInvocationHash ? null : "content-hash-mismatch";
}
