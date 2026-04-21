/**
 * Promote draft-to-current — snapshot-switch lifecycle end-to-end.
 *
 * Lives in the SC-03 neighborhood per pulse 45 plan. Materializes the three
 * snapshot-promotion invariants:
 *   1. `harness.promote('snap-002')` completes without throwing.
 *   2. `harness.getCurrentSnapshotId()` reflects the new id afterward.
 *   3. `onSnapshotPromoted` fires end-to-end on every registered provider.
 * Per pulse-45 deliverable D5.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { startHarness, type Harness } from './_lib/start-harness.ts';

const live: Harness[] = [];
afterEach(async () => {
  while (live.length > 0) {
    const h = live.pop()!;
    await h.shutdown();
  }
});

describe('promote-draft-to-current (snapshot-switch lifecycle)', () => {
  it('harness.promote("snap-002") lifecycle completes', async () => {
    const harness = await startHarness({ fixture: 'allow-r1-public' });
    live.push(harness);

    await expect(harness.promote('snap-002')).resolves.toBeUndefined();
  });

  it('harness.getCurrentSnapshotId() returns "snap-002" after promote', async () => {
    const harness = await startHarness({
      fixture: 'allow-r1-public',
      scenarioId: 'promote-id',
    });
    live.push(harness);

    expect(harness.getCurrentSnapshotId()).toBe('snap-001');
    await harness.promote('snap-002');
    expect(harness.getCurrentSnapshotId()).toBe('snap-002');
  });

  it('onSnapshotPromoted fires end-to-end on all registered providers', async () => {
    const harness = await startHarness({
      fixture: 'allow-r1-public',
      scenarioId: 'promote-fanout',
    });
    live.push(harness);

    expect(harness.onSnapshotPromotedFanout()).toEqual([]);
    await harness.promote('snap-002');
    const fanout = harness.onSnapshotPromotedFanout();
    // Each registered provider's onSnapshotPromoted hook ran at least once.
    expect(fanout.length).toBeGreaterThan(0);
    expect(fanout).toContain('provider-allow-r1-public');
  });
});
