import { describe, it, expect } from 'vitest';
import {
  validateLayerConfig,
  type LayerConfigValid,
} from '#harness/config-validator.ts';
import { AuditChainWriter, AuditChainReader } from '#harness/audit-chain.ts';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function makeChainFile(): string {
  const d = mkdtempSync(join(tmpdir(), 'layer-off-int-'));
  return join(d, 'chain.jsonl');
}

describe('layer-off combinations (harness control surface)', () => {
  it('track:disabled + no providers: no snap interactions required, validator accepts', () => {
    const result = validateLayerConfig({
      layerId: 'L0',
      track: 'disabled',
      decide: false,
      enforceReview: false,
    });
    expect(result.ok).toBe(true);
    const valid = result as LayerConfigValid;
    expect(valid.config.track).toBe('disabled');
    expect(valid.skipCompanionCheck).toBe(true);
    // With track:disabled the audit chain stays empty — scenario writer emits
    // nothing and the reader returns no entries.
    const filePath = makeChainFile();
    new AuditChainWriter({ filePath });
    const reader = new AuditChainReader({ filePath });
    expect(reader.all()).toHaveLength(0);
  });

  it('enforceReview:false: validator returns skipCompanionCheck=true (no ApprovalEntry required)', () => {
    const result = validateLayerConfig({
      layerId: 'L2',
      track: 'advisory',
      decide: true,
      enforceReview: false,
      providers: ['alice'],
    });
    expect(result.ok).toBe(true);
    const valid = result as LayerConfigValid;
    expect(valid.skipCompanionCheck).toBe(true);

    const filePath = makeChainFile();
    const w = new AuditChainWriter({ filePath, clock: () => 0 });
    w.appendProducer({
      policyArtifactSha256: 'sha256:' + 'a'.repeat(64),
      generatedAt: '2024-01-01T00:00:00.000Z',
      scope: '@openclaw',
      producerVersion: '1.0.0',
    });
    // decision=allow so the review-approval invariant doesn't apply.
    w.appendDecision({
      correlationId: 'no-companion',
      snapshotId: 'snap-1',
      policyArtifactSha256: 'sha256:' + 'a'.repeat(64),
      tool: 'read',
      decision: 'allow',
      declaredTier: 'R1',
      effectiveTier: 'R1',
    });
    const reader = new AuditChainReader({ filePath });
    expect(reader.all()).toHaveLength(2);
  });

  it('decide:true + track:disabled: validator accepts the decide-without-track combo', () => {
    const result = validateLayerConfig({
      layerId: 'L3',
      track: 'disabled',
      decide: true,
      enforceReview: true,
      providers: ['bob'],
    });
    expect(result.ok).toBe(true);
    const valid = result as LayerConfigValid;
    expect(valid.config.decide).toBe(true);
    expect(valid.config.track).toBe('disabled');
  });

  it('all-layers-on: every layer accepted with providers declared', () => {
    for (const layerId of ['L0', 'L1', 'L2', 'L3', 'L4']) {
      const result = validateLayerConfig({
        layerId,
        track: 'enforced',
        decide: true,
        enforceReview: true,
        providers: ['alice', 'bob'],
      });
      expect(result.ok).toBe(true);
    }
  });
});
