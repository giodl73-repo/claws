/**
 * Type-level + runtime lock for `RiskClassification` — the discriminated
 * union that pairs each numeric level with exactly one capability string.
 *
 * CP-5 R1 M09 (type-M1): the union was previously constructed via an `as`
 * cast over a `Record<number, capability>` lookup, which defeated the
 * discriminant at compile time. The assembler now builds every
 * RiskClassification via an exhaustive `switch`, so these tests lock:
 *
 *   1. Each (level, capability) pair type-checks against the union.
 *   2. Mismatched pairings (e.g. level 5 paired with 'read') are rejected
 *      at the type level, not just at runtime.
 *   3. The discriminant set spans exactly {1, 2, 3, 4, 5} — adding or
 *      removing a level is a compile error.
 */

import { describe, expect, it } from 'vitest';
import type { RiskClassification } from '../../src/workspace/index.js';

describe('RiskClassification discriminated union', () => {
  it('accepts every valid (level, capability) pair', () => {
    const r1: RiskClassification = { level: 1, capability: 'read' };
    const r2: RiskClassification = { level: 2, capability: 'write' };
    const r3: RiskClassification = { level: 3, capability: 'communicate' };
    const r4: RiskClassification = { level: 4, capability: 'execute' };
    const r5: RiskClassification = { level: 5, capability: 'transact' };
    expect([r1.level, r2.level, r3.level, r4.level, r5.level]).toEqual([1, 2, 3, 4, 5]);
  });

  it('narrows capability from level at the type level (exhaustive switch)', () => {
    const describe_ = (r: RiskClassification): string => {
      switch (r.level) {
        case 1: {
          // Type narrowed to { level: 1; capability: 'read' }
          const cap: 'read' = r.capability;
          return `L1:${cap}`;
        }
        case 2: {
          const cap: 'write' = r.capability;
          return `L2:${cap}`;
        }
        case 3: {
          const cap: 'communicate' = r.capability;
          return `L3:${cap}`;
        }
        case 4: {
          const cap: 'execute' = r.capability;
          return `L4:${cap}`;
        }
        case 5: {
          const cap: 'transact' = r.capability;
          return `L5:${cap}`;
        }
      }
    };
    expect(describe_({ level: 3, capability: 'communicate' })).toBe('L3:communicate');
  });

  it('rejects mismatched pairings at the type level', () => {
    // The following lines are compile-time assertions: each `@ts-expect-error`
    // fails the test if the corresponding line type-checks. This is the lock
    // that previously missing — before M09, the `as` cast made all of these
    // assignable.
    // @ts-expect-error — level 5 cannot pair with 'read'
    const bad1: RiskClassification = { level: 5, capability: 'read' };
    // @ts-expect-error — level 1 cannot pair with 'transact'
    const bad2: RiskClassification = { level: 1, capability: 'transact' };
    // @ts-expect-error — level 0 is not a union discriminant
    const bad3: RiskClassification = { level: 0, capability: 'read' };
    // @ts-expect-error — 'admin' is not a capability
    const bad4: RiskClassification = { level: 2, capability: 'admin' };
    // Reference the locals so the compiler doesn't drop them as unused —
    // the ts-expect-error applies to the object literal, not the binding.
    expect([bad1, bad2, bad3, bad4]).toHaveLength(4);
  });

  it('spans exactly levels 1-5 — exhaustive switch must cover the whole union', () => {
    type Levels = RiskClassification['level'];
    const _assertLevels: Levels[] = [1, 2, 3, 4, 5];
    // Adding a 6th level to RiskClassification would require editing the
    // array above, which would then fail either here (if removed) or in
    // chunk-assembler.ts makeRisk's exhaustive switch (if added to the
    // type but not the switch).
    expect(_assertLevels).toHaveLength(5);
  });
});
