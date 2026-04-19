import { describe, expect, it } from 'vitest';

import { diffPolicyIR } from '../src/compile/diff.js';
import type { PolicyIR } from '../src/types/index.js';

// CP-12 follow-up stub per snap.md §CLI L172 + conf-r1 W3. The symbol is
// exported so the named cross-package coupling exists at the package boundary;
// the body lands in CP-12. Until then, this test locks in the "not yet
// implemented" behavior so any caller that depends on the stub getting real
// semantics knows to check when the assertion flips.

describe('diffPolicyIR (stub) — locks in CP-12-pending behavior', () => {
  const emptyIr = {} as PolicyIR;

  it('throws "not yet implemented" with a CP-12 reference', () => {
    expect(() => diffPolicyIR(emptyIr, emptyIr)).toThrow(/not yet implemented/i);
    expect(() => diffPolicyIR(emptyIr, emptyIr)).toThrow(/CP-12/);
  });
});
