import type { PolicyIR } from '../types/index.js';

export interface PolicyIRDiffEntry {
  kind: 'added' | 'removed' | 'changed';
  path: string;
  before?: unknown;
  after?: unknown;
}

export interface PolicyIRDiffResult {
  changed: boolean;
  entries: PolicyIRDiffEntry[];
}

/**
 * Compute a semantic diff between two PolicyIRs.
 *
 * Spec surface: `snap.md` §CLI L172 — `snap diff <a> <b>` imports this symbol
 * from `@bic/openclaw-policy` at the CLI-handler compose layer.
 *
 * Status: not yet implemented. Planned for CP-12 follow-up; the symbol is
 * exported now so the cross-package named coupling named in `snap.md` exists
 * at the package boundary rather than being a dangling spec promise.
 */
export function diffPolicyIR(_a: PolicyIR, _b: PolicyIR): PolicyIRDiffResult {
  throw new Error('diffPolicyIR: not yet implemented (CP-12 follow-up)');
}
