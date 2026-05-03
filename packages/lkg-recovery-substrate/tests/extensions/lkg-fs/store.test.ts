/**
 * FsLKGStore lifecycle tests — promote / observe / recover with real
 * filesystem fixtures.
 */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  FsLKGStore,
  InMemoryAuditSink,
  InMemoryRecoveryNoticeSink,
} from '../../../src/extensions/lkg-fs/index.js';
import type { LKGTracker } from '../../../src/plugin-sdk/lkg/types.js';

interface JsonContent {
  readonly version: number;
  readonly entries: Record<string, string>;
}

const jsonTracker = (path: string): LKGTracker<JsonContent> => ({
  path,
  parse: (raw) => JSON.parse(raw) as JsonContent,
  validate: (parsed) => {
    if (parsed.version !== 1) {
      return {
        valid: false,
        issues: [{ path: 'version', message: 'expected version 1', code: 'BAD_VERSION' }],
      };
    }
    return { valid: true, issues: [] };
  },
});

function writeJson(path: string, content: unknown): void {
  writeFileSync(path, JSON.stringify(content) + '\n', 'utf-8');
}

function makeStore(): {
  store: FsLKGStore;
  audit: InMemoryAuditSink;
  notices: InMemoryRecoveryNoticeSink;
  workspaceDir: string;
  filePath: string;
} {
  const workspaceDir = mkdtempSync(join(tmpdir(), 'lkg-fs-test-'));
  const audit = new InMemoryAuditSink();
  const notices = new InMemoryRecoveryNoticeSink();
  const store = new FsLKGStore({
    root: workspaceDir,
    auditSink: audit,
    recoveryNoticeSink: notices,
  });
  const filePath = join(workspaceDir, 'config.json');
  return { store, audit, notices, workspaceDir, filePath };
}

describe('FsLKGStore — lifecycle', () => {
  let ctx: ReturnType<typeof makeStore>;
  beforeEach(() => {
    ctx = makeStore();
  });

  it('S-01 first-time observe of valid bytes → outcome promoted', async () => {
    writeJson(ctx.filePath, { version: 1, entries: { a: '1' } });
    ctx.store.register(jsonTracker(ctx.filePath));
    const obs = await ctx.store.observe(ctx.filePath);
    expect(obs.outcome).toBe('promoted');
    if (obs.outcome === 'promoted') {
      expect(obs.fingerprint.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(obs.fingerprint.fsStat).toBeDefined();
    }
  });

  it('S-02 re-observe unchanged bytes → outcome valid (not promoted twice)', async () => {
    writeJson(ctx.filePath, { version: 1 });
    ctx.store.register(jsonTracker(ctx.filePath));
    await ctx.store.observe(ctx.filePath);
    const obs = await ctx.store.observe(ctx.filePath);
    expect(obs.outcome).toBe('valid');
  });

  it('S-03 observe valid → .lkg companion file written', async () => {
    writeJson(ctx.filePath, { version: 1 });
    ctx.store.register(jsonTracker(ctx.filePath));
    await ctx.store.observe(ctx.filePath);
    const lkgPath = ctx.filePath + '.lkg';
    expect(readFileSync(lkgPath, 'utf-8')).toBe(readFileSync(ctx.filePath, 'utf-8'));
  });

  it('S-04 observe invalid bytes WITH a prior LKG → outcome recovered', async () => {
    // Promote a known-good first.
    writeJson(ctx.filePath, { version: 1 });
    ctx.store.register(jsonTracker(ctx.filePath));
    await ctx.store.observe(ctx.filePath);

    // Now simulate a bad write.
    writeJson(ctx.filePath, { version: 99 });
    const obs = await ctx.store.observe(ctx.filePath);
    expect(obs.outcome).toBe('recovered');
    if (obs.outcome === 'recovered') {
      expect(obs.clobberedPath).toMatch(/\.clobbered\./);
      expect(obs.clobberedFileHash).toMatch(/^[0-9a-f]{64}$/);
      expect(obs.replacedFingerprint?.hash).toMatch(/^[0-9a-f]{64}$/);
    }
    // Active path now matches LKG content.
    const restored = JSON.parse(readFileSync(ctx.filePath, 'utf-8'));
    expect(restored.version).toBe(1);
  });

  it('S-05 recovery preserves bad bytes at .clobbered.<ts>', async () => {
    writeJson(ctx.filePath, { version: 1 });
    ctx.store.register(jsonTracker(ctx.filePath));
    await ctx.store.observe(ctx.filePath);
    writeJson(ctx.filePath, { version: 99 });
    const obs = await ctx.store.observe(ctx.filePath);
    expect(obs.outcome).toBe('recovered');
    if (obs.outcome === 'recovered') {
      const clobbered = JSON.parse(readFileSync(obs.clobberedPath, 'utf-8'));
      expect(clobbered.version).toBe(99);
    }
  });

  it('S-06 recovery enqueues a recovery notice', async () => {
    writeJson(ctx.filePath, { version: 1 });
    ctx.store.register(jsonTracker(ctx.filePath));
    await ctx.store.observe(ctx.filePath);
    writeJson(ctx.filePath, { version: 99 });
    await ctx.store.observe(ctx.filePath);
    expect(ctx.notices.size()).toBe(1);
    const drained = ctx.notices.drain();
    expect(drained[0]?.path).toBe(ctx.filePath);
    expect(drained[0]?.reason).toContain('expected version 1');
  });

  it('S-07 recovery passes actor + correlationEventId from observe options', async () => {
    writeJson(ctx.filePath, { version: 1 });
    ctx.store.register(jsonTracker(ctx.filePath));
    await ctx.store.observe(ctx.filePath);
    writeJson(ctx.filePath, { version: 99 });
    const obs = await ctx.store.observe(ctx.filePath, {
      actor: { kind: 'plugin', id: 'my-plugin' },
      correlationEventId: 'trace-xyz',
    });
    expect(obs.outcome).toBe('recovered');
    if (obs.outcome === 'recovered') {
      expect(obs.actor?.id).toBe('my-plugin');
      expect(obs.correlationEventId).toBe('trace-xyz');
    }
  });

  it('S-08 invalid bytes WITHOUT prior LKG → outcome skipped / no-lkg-available', async () => {
    writeJson(ctx.filePath, { version: 99 });
    ctx.store.register(jsonTracker(ctx.filePath));
    const obs = await ctx.store.observe(ctx.filePath);
    expect(obs.outcome).toBe('skipped');
    if (obs.outcome === 'skipped') {
      expect(obs.reason).toBe('no-lkg-available');
    }
  });

  it('S-09 tracker.shouldRecover === false → outcome skipped / plugin-local-invalidity', async () => {
    writeJson(ctx.filePath, { version: 1 });
    const tracker: LKGTracker<JsonContent> = {
      ...jsonTracker(ctx.filePath),
      shouldRecover: () => false,
    };
    ctx.store.register(tracker);
    await ctx.store.observe(ctx.filePath); // promote
    writeJson(ctx.filePath, { version: 99 });
    const obs = await ctx.store.observe(ctx.filePath);
    expect(obs.outcome).toBe('skipped');
    if (obs.outcome === 'skipped') {
      expect(obs.reason).toBe('plugin-local-invalidity');
    }
  });

  it('S-10 audit sink receives a record per observation', async () => {
    writeJson(ctx.filePath, { version: 1 });
    ctx.store.register(jsonTracker(ctx.filePath));
    await ctx.store.observe(ctx.filePath); // promoted
    await ctx.store.observe(ctx.filePath); // valid
    writeJson(ctx.filePath, { version: 99 });
    await ctx.store.observe(ctx.filePath); // recovered

    const records = ctx.audit.list();
    expect(records.length).toBe(3);
    expect(records.map((r) => r.outcome)).toEqual(['promoted', 'valid', 'recovered']);
  });

  it('S-11 readLastKnownGood returns the promoted bytes', async () => {
    writeJson(ctx.filePath, { version: 1 });
    ctx.store.register(jsonTracker(ctx.filePath));
    await ctx.store.observe(ctx.filePath);
    const lkgBytes = await ctx.store.readLastKnownGood(ctx.filePath);
    const text = Buffer.from(lkgBytes).toString('utf-8');
    expect(JSON.parse(text).version).toBe(1);
  });

  it('S-12 getEntry returns null pre-observation; populated post-promote', async () => {
    writeJson(ctx.filePath, { version: 1 });
    ctx.store.register(jsonTracker(ctx.filePath));
    expect(ctx.store.getEntry(ctx.filePath)).toBeNull();
    await ctx.store.observe(ctx.filePath);
    const entry = ctx.store.getEntry(ctx.filePath);
    expect(entry?.lastPromotedGood?.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('S-13 register rejects duplicate paths with LKG_TRACKER_PATH_COLLISION', () => {
    ctx.store.register(jsonTracker(ctx.filePath));
    expect(() => ctx.store.register(jsonTracker(ctx.filePath))).toThrow(
      /LKG_TRACKER_PATH_COLLISION|already registered/,
    );
  });

  it('S-14 register rejects paths outside store root', () => {
    expect(() => ctx.store.register(jsonTracker('/etc/passwd'))).toThrow(
      /LKG_TRACKER_PATH_INVALID|outside store root/,
    );
  });

  it('S-15 observe of unregistered path throws LKG_TRACKER_PATH_INVALID', async () => {
    await expect(ctx.store.observe(ctx.filePath)).rejects.toThrow(
      /LKG_TRACKER_PATH_INVALID|no tracker registered/,
    );
  });

  it('S-16 corrupt .lkg companion → outcome failed (refuse to restore)', async () => {
    writeJson(ctx.filePath, { version: 1 });
    ctx.store.register(jsonTracker(ctx.filePath));
    await ctx.store.observe(ctx.filePath);
    // Tamper with the .lkg companion.
    writeFileSync(ctx.filePath + '.lkg', '{"version":99}\n', 'utf-8');
    writeJson(ctx.filePath, { version: 99 });
    const obs = await ctx.store.observe(ctx.filePath);
    expect(obs.outcome).toBe('failed');
    if (obs.outcome === 'failed') {
      expect(obs.reason).toContain('lkg-companion-tampered');
    }
  });
});
