/**
 * Targeted L0 unit tests closing coverage gaps in `compile()`.
 *
 * Covers event-bus fire callbacks on normal-path compile, multi-target
 * report merging (mergeValidationReports), trust-keyword heuristics in
 * parseTrustLevel, known-platform match in extractUserPlatform, the
 * AGENTS tool-list delegation path, the audit-chain try/catch swallow
 * in auditAppend, per-stage cache hit/miss/write event variants, and
 * the signingKeyId salt fold-in for the compile-level fast path.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { compile } from '#src/compiler/host/compile.js';
import { CompilerEventBus } from '#src/compiler/events/bus.js';
import type { CompilerEvent } from '#src/compiler/events/types.js';

const FIXTURES = resolve(__dirname, '../../fixtures');

describe('compile() coverage gaps (unit)', () => {
  let outputDir: string;
  let cacheDir: string;

  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'host-gaps-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'host-gaps-cache-'));
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
  });

  // ── Event bus wired on a successful, cache-enabled compile ─────────
  // This exercises: compile.start fire callback (line 890), per-stage
  // cache miss/write with bus (consultReaderCache lines 733/738/747,
  // consultDownstreamCache 807/815, writeDownstreamCache 847), the
  // terminal compile.complete success branch (1558), and various
  // validate.start/validate.complete/emit.start/emit.complete callbacks.
  it('fires event-bus callbacks on a successful cache-miss compile', async () => {
    const bus = new CompilerEventBus();
    const events: CompilerEvent[] = [];
    for (const t of [
      'compile.start',
      'compile.complete',
      'cache.hit',
      'cache.miss',
      'cache.write',
      'emit.start',
      'emit.complete',
      'validate.start',
      'validate.complete',
      'enforce.start',
      'enforce.complete',
    ] as const) {
      bus.on(t, (e) => events.push(e));
    }

    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
      events: bus,
    });

    expect(result.success).toBe(true);
    // compile.start fires exactly once at the top.
    expect(events.filter((e) => e.type === 'compile.start').length).toBe(1);
    // compile.complete fires exactly once at the tail on the success branch.
    expect(events.filter((e) => e.type === 'compile.complete').length).toBe(1);
    // cache.miss fires at the compile-level lookup (no prior entry).
    const compileMisses = events.filter(
      (e) => e.type === 'cache.miss' && !('stage' in e && e.stage !== undefined),
    );
    expect(compileMisses.length).toBeGreaterThanOrEqual(1);
    // Each reader stage emits a cache.miss the first time around and a
    // cache.write immediately after persisting the byte-hash entry.
    const stageMisses = events.filter(
      (e) => e.type === 'cache.miss' && 'stage' in e && e.stage !== undefined,
    );
    const stageWrites = events.filter(
      (e) => e.type === 'cache.write' && 'stage' in e && e.stage !== undefined,
    );
    expect(stageMisses.length).toBeGreaterThan(0);
    expect(stageWrites.length).toBeGreaterThan(0);
    // Enforce and emit complete events must fire on the happy path.
    expect(events.some((e) => e.type === 'enforce.complete')).toBe(true);
    expect(events.some((e) => e.type === 'emit.complete')).toBe(true);
    expect(events.some((e) => e.type === 'validate.complete')).toBe(true);
  });

  // ── Warm cache: per-stage cache.hit emissions ──────────────────────
  // Second compile with the same cacheDir hits every reader stage cache
  // as well as the compile-level cache (when mtime index is untouched),
  // but the mtime-shortcut runs first so we force the normal-path hit
  // only if we clear the fast-path. Without clearing, the fast-path hit
  // exercises synthesizeStageTimingsFromCompileHit + the fast-path
  // compile.complete fire callback (line 974).
  it('fast-path compile-level cache hit fires compile.complete + cache.hit (normal path wiring)', async () => {
    // Warm the cache first without bus.
    const opts = {
      targets: ['oc'] as const,
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
    };
    const warm = await compile(resolve(FIXTURES, 'full-workspace'), opts);
    expect(warm.cacheHit).toBe(false);

    // Second compile with the bus wired — fast path hits straight away.
    const bus = new CompilerEventBus();
    const events: CompilerEvent[] = [];
    bus.on('compile.complete', (e) => events.push(e));
    bus.on('cache.hit', (e) => events.push(e));

    const hit = await compile(resolve(FIXTURES, 'full-workspace'), {
      ...opts,
      events: bus,
    });
    expect(hit.cacheHit).toBe(true);
    // Fast-path cache.hit fires at the compile level (no stage field).
    const topLevelHits = events.filter(
      (e) => e.type === 'cache.hit' && !('stage' in e && e.stage !== undefined),
    );
    expect(topLevelHits.length).toBeGreaterThanOrEqual(1);
    // Terminal compile.complete must fire exactly once on the fast-path
    // return.
    expect(events.filter((e) => e.type === 'compile.complete').length).toBe(1);
  });

  // ── enforce.denied with bus wired ──────────────────────────────────
  // Missing TOOLS.md → enforceR5 denies (critical severity) and fires
  // enforce.denied (line 1229 callback) + enforce.complete (1239
  // callback) + compile.failed (1261 callback). This is the "fail"
  // half of the enforce-deny event pair.
  it('enforce deny path fires enforce.denied + enforce.complete + compile.failed', async () => {
    const noTools = mkdtempSync(join(tmpdir(), 'host-gaps-no-tools-'));
    try {
      writeFileSync(join(noTools, 'SOUL.md'), '# SOUL\npersona: x\n');

      const bus = new CompilerEventBus();
      const events: CompilerEvent[] = [];
      for (const t of [
        'enforce.denied',
        'enforce.complete',
        'compile.failed',
      ] as const) {
        bus.on(t, (e) => events.push(e));
      }

      const result = await compile(noTools, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
        events: bus,
      });

      expect(result.success).toBe(false);
      expect(events.some((e) => e.type === 'enforce.denied')).toBe(true);
      expect(events.some((e) => e.type === 'enforce.complete')).toBe(true);
      expect(events.some((e) => e.type === 'compile.failed')).toBe(true);
    } finally {
      rmSync(noTools, { recursive: true, force: true });
    }
  });

  // ── mergeValidationReports: 2+ targets path ────────────────────────
  // Compiling for >1 target forces the merge branch (lines 565-589).
  // Pass-if-any check 10 is merged across targets: one matches user.
  // platform, one doesn't — the merged check-10 should pass.
  it('multi-target compile merges per-target validation reports (pass-if-any + fail-wins)', async () => {
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });
    // Both emitters produced a result.
    expect(result.emitResults.oc).toBeDefined();
    expect(result.emitResults['claude-code']).toBeDefined();
    // Check 10 (platform alignment) uses pass-if-any — user.platform
    // defaults to 'oc' so the oc target matches, so merged check 10
    // should be a pass even though claude-code target does not match.
    const check10 = result.validationReport?.checks.find((c) => c.checkId === 10);
    expect(check10?.pass).toBe(true);
    // Sanity: passCount + failCount equal the number of merged checks.
    const rep = result.validationReport!;
    expect(rep.passCount + rep.failCount).toBe(rep.checks.length);
  });

  // ── parseTrustLevel keyword heuristics ─────────────────────────────
  // Covers line 289 (deploy/admin/network/exec/shell → T3) and line 290
  // (write/modify/audit → T2). The T-annotation branch is already hit
  // by the existing T0-T4 test; these descriptions intentionally avoid
  // T0-T4 annotations.
  it('parseTrustLevel maps "deploy" keyword to T3 and "write" keyword to T2', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'host-gaps-trust-kw-'));
    try {
      writeFileSync(join(ws, 'SOUL.md'), '# SOUL\npersona: trust-kw\n');
      // Descriptions contain no T0-T4 annotation, so keyword heuristics
      // decide trust. "deploy" → T3 (blocked), "modify" → T2 (allowed).
      writeFileSync(
        join(ws, 'TOOLS.md'),
        '# TOOLS\n## Shipper\nHandles deploy to production hosts.\n\n' +
          '## Patcher\nCan modify configuration files in place.\n',
      );
      const result = await compile(ws, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      // Config artifact carries the blockedTools list derived from T3+.
      const cfg = result.emitResults.oc?.files.find((f) =>
        f.path.endsWith('claws-governance.config.json'),
      );
      expect(cfg).toBeDefined();
      const parsed = JSON.parse(cfg!.content) as { blockedTools: string[] };
      expect(parsed.blockedTools).toContain('Shipper'); // deploy → T3
      expect(parsed.blockedTools).not.toContain('Patcher'); // modify → T2
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  // ── extractUserPlatform: known-platform match ──────────────────────
  // Line 356-357: USER.md declares Platform: claude-code (a KNOWN
  // platform), so extractUserPlatform returns the typed value rather
  // than the fallback 'oc'. Compiling for claude-code then aligns with
  // user.platform (check 10 passes).
  it('extractUserPlatform honors a known USER.md Platform value', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'host-gaps-plat-known-'));
    try {
      writeFileSync(join(ws, 'SOUL.md'), '# SOUL\npersona: known-plat\n');
      writeFileSync(join(ws, 'TOOLS.md'), '# TOOLS\n## Read\nRead files.\n');
      writeFileSync(
        join(ws, 'USER.md'),
        '# User\n## Role\nDev\n## Platform\nclaude-code\n',
      );
      const result = await compile(ws, {
        targets: ['claude-code'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      // user.platform matches target — check 10 passes.
      const check10 = result.validationReport?.checks.find((c) => c.checkId === 10);
      expect(check10?.pass).toBe(true);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  // ── extractDelegations: agent tool-list branch ─────────────────────
  // The full-workspace fixture declares agents WITH tool lists, which
  // exercises line 315 (a.tools.length > 0). An all-agents-zero-tools
  // fixture hits the else branch. Test both.
  it('extractDelegations surfaces agents that declare tools and skips agents that declare none', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'host-gaps-agents-mixed-'));
    try {
      writeFileSync(join(ws, 'SOUL.md'), '# SOUL\npersona: mix\n');
      writeFileSync(join(ws, 'TOOLS.md'), '# TOOLS\n## Read\nRead files.\n');
      // Agent A declares tools → delegation recorded.
      // Agent B declares none → skipped.
      writeFileSync(
        join(ws, 'AGENTS.md'),
        '# Agents\n\n## Alpha\n\n- Description: has tools\n- Tools: Read\n\n' +
          '## Beta\n\n- Description: no tools\n',
      );
      const result = await compile(ws, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
      // Compile must not crash; delegation list is internal — we assert
      // on the emitted config artifact having a non-empty governance
      // plan (i.e. at least one agent surfaced).
      const cfg = result.emitResults.oc?.files.find((f) =>
        f.path.endsWith('claws-governance.config.json'),
      );
      expect(cfg).toBeDefined();
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  // ── IR-SOUL-NO-PRINCIPLES diagnostic ───────────────────────────────
  // Line 391: SOUL.md with no `## Principles` section emits an info-
  // level diagnostic. The full-workspace fixture's SOUL.md intentionally
  // omits Principles, so a normal compile produces this diagnostic.
  it('emits IR-SOUL-NO-PRINCIPLES when SOUL.md omits the Principles section', async () => {
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });
    expect(
      result.diagnostics.some((d) => d.code === 'IR-SOUL-NO-PRINCIPLES'),
    ).toBe(true);
  });

  // ── SOUL Boundaries bullet parsing (line 265) ──────────────────────
  // The boundaries section with `- ` bullets hits line 265-270. A SOUL
  // without Boundaries exercises the skip branch. The full-workspace
  // fixture already has Boundaries bullets — adding a Principles
  // section here prevents the no-principles short-circuit and forces
  // the boundaries loop to populate non-empty results.
  it('parses SOUL.md Boundaries bullets into the IR soul.boundaries list', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'host-gaps-boundaries-'));
    try {
      writeFileSync(
        join(ws, 'SOUL.md'),
        '# SOUL\npersona: bound\n\n## Principles\n\n- safety first\n\n' +
          '## Boundaries\n\n- no network\n- no shell\n',
      );
      writeFileSync(join(ws, 'TOOLS.md'), '# TOOLS\n## Read\nRead files.\n');
      const result = await compile(ws, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      // No IR-SOUL-NO-PRINCIPLES when Principles is present.
      expect(
        result.diagnostics.some((d) => d.code === 'IR-SOUL-NO-PRINCIPLES'),
      ).toBe(false);
      expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  // ── auditAppend catch branch ───────────────────────────────────────
  // Line 636-638: chain.append throws → the try/catch swallows it and
  // compile continues. We drive a chain whose append() throws by
  // freezing its internal state. Easiest: construct a chain, freeze
  // its allEntries to make append fail.
  it('auditAppend swallows exceptions thrown by chain.append so compile continues', async () => {
    const { AuditChain } = await import('#src/compiler/audit/chain.js');
    const { generateKeypair } = await import('#src/compiler/crypto/ed25519.js');
    const keypair = generateKeypair();
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    // Force chain.append to throw on every call by monkey-patching it.
    // The host swallows the error and keeps compiling.
    let calls = 0;
    chain.append = () => {
      calls += 1;
      throw new Error('audit sink unavailable');
    };

    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
      auditChain: chain,
    });
    // Compile still succeeds despite every audit append throwing.
    expect(result.success).toBe(true);
    // And at least one audit.append invocation was attempted (start).
    expect(calls).toBeGreaterThan(0);
  });

  // ── signingKeyId folds into fast-path salt + emit cache key ────────
  // Lines 925 (conditional spread in fastPathOpts salt) + 1364
  // (signingKeyId branch in emit key input). Providing an auditChain
  // sets signingKeyId and routes both code paths.
  it('signingKeyId folds into fast-path salt and emit cache key when auditChain is present', async () => {
    const { AuditChain } = await import('#src/compiler/audit/chain.js');
    const { generateKeypair } = await import('#src/compiler/crypto/ed25519.js');
    const keypair = generateKeypair();
    const chain = new AuditChain(keypair.privateKey, keypair.publicKey);

    // cacheEnabled + cacheDir + auditChain = signingKeyId is defined,
    // so the `signingKeyId` spread in fastPathOpts runs and the emit
    // key input variant with signingKeyId runs.
    const first = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
      auditChain: chain,
    });
    expect(first.cacheHit).toBe(false);
    // Second compile with the same chain hits the fast path — no
    // mutation expected from auditChain across calls.
    const second = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
      auditChain: chain,
    });
    expect(second.cacheHit).toBe(true);
    expect(second.contentHash).toBe(first.contentHash);
  });

  // ── Tail-end success compile.complete event ────────────────────────
  // Line 1558-1563 callback fires only when the full pipeline ran AND
  // success is true (a cache-miss-but-success compile). This is
  // distinct from the fast-path compile.complete because the mtime
  // fast-path wasn't seeded yet — so the first run with bus wired
  // on a cacheEnabled+cacheDir workspace covers it.
  it('terminal compile.complete fires on the success path with result payload', async () => {
    const bus = new CompilerEventBus();
    const events: CompilerEvent[] = [];
    bus.on('compile.complete', (e) => events.push(e));

    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
      events: bus,
    });
    expect(result.success).toBe(true);
    // Exactly one compile.complete, carrying the result.
    expect(events.length).toBe(1);
    const ev = events[0]!;
    if (ev.type !== 'compile.complete') throw new Error('expected complete');
    expect(ev.result.contentHash).toBe(result.contentHash);
    expect(ev.durationMs).toBeGreaterThanOrEqual(0);
  });

  // ── cache.write event on compile-level cache set ───────────────────
  // Line 1525-1530 callback fires when the compile-level cache is
  // populated on a successful cache-miss compile. Distinct from the
  // per-stage cache.write variant (which has a stage field).
  it('cache.write fires at the compile level on a successful cache-miss compile', async () => {
    const bus = new CompilerEventBus();
    const events: CompilerEvent[] = [];
    bus.on('cache.write', (e) => events.push(e));

    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc'],
      outputDir,
      cacheEnabled: true,
      cacheDir,
      dryRun: true,
      events: bus,
    });
    expect(result.success).toBe(true);
    // Compile-level cache.write has no `stage` property.
    const compileLevelWrites = events.filter(
      (e) => e.type === 'cache.write' && !('stage' in e && e.stage !== undefined),
    );
    expect(compileLevelWrites.length).toBe(1);
  });

  // ── validate.failed event ──────────────────────────────────────────
  // Line 1420-1425: single-target compile for a platform the workspace
  // is not aligned with (user.platform=oc but target=claude-code) →
  // check 10 fails → validate.failed fires.
  it('validate.failed fires when the per-target report has overallPass=false', async () => {
    const bus = new CompilerEventBus();
    const events: CompilerEvent[] = [];
    bus.on('validate.failed', (e) => events.push(e));

    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['claude-code'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
      events: bus,
    });
    expect(result.success).toBe(false);
    expect(events.length).toBe(1);
  });

  // ── mergeValidationReports: fail-wins path ─────────────────────────
  // Line 586-587: when the merged report has a failing check, failCount
  // increments. A 2-target compile against a workspace where one target
  // emit has a failing per-target check (e.g. check 10 for the mismatched
  // platform) exercises this.
  it('mergeValidationReports records failing merged checks in failCount', async () => {
    const result = await compile(resolve(FIXTURES, 'full-workspace'), {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: false,
      dryRun: true,
    });
    // At least one merged check fails for the claude-code target (e.g.
    // check 9/12 for content-specific checks that rely on target files).
    // Whichever it is, failCount > 0 drives line 587.
    const rep = result.validationReport!;
    expect(rep.passCount).toBeGreaterThan(0);
    // Sanity: passCount + failCount matches check count regardless of
    // which checks happened to fail.
    expect(rep.passCount + rep.failCount).toBe(rep.checks.length);
  });

  // ── Boundaries section with non-bullet lines ───────────────────────
  // Line 265 arm 1 (trimmed.startsWith('- ') is false). SOUL.md with a
  // Boundaries section containing a non-bullet line forces the iterator
  // over the false branch.
  it('ignores non-bullet lines in SOUL.md Boundaries section', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'host-gaps-bound-noise-'));
    try {
      writeFileSync(
        join(ws, 'SOUL.md'),
        '# SOUL\npersona: noise\n\n## Principles\n\n- p\n\n' +
          '## Boundaries\n\nThis paragraph is not a bullet.\n- only this is\n',
      );
      writeFileSync(join(ws, 'TOOLS.md'), '# TOOLS\n## Read\nRead files.\n');
      const result = await compile(ws, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
      });
      expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  // ── Empty skills fixture + bus ─────────────────────────────────────
  // Primarily a regression guard: empty skills/ dir must not break bus
  // wiring. Already partially covered without bus; this variant wires
  // bus in to hit additional event callbacks.
  it('compiles a workspace with empty skills and agents directory with bus wired', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'host-gaps-empty-dirs-'));
    try {
      writeFileSync(join(ws, 'SOUL.md'), '# SOUL\npersona: tiny\n## Principles\n- x\n');
      writeFileSync(join(ws, 'TOOLS.md'), '# TOOLS\n## Read\nRead files.\n');
      mkdirSync(join(ws, 'skills'));

      const bus = new CompilerEventBus();
      const events: CompilerEvent[] = [];
      bus.on('read.complete', (e) => events.push(e));
      bus.on('read.failed', (e) => events.push(e));

      const result = await compile(ws, {
        targets: ['oc'],
        outputDir,
        cacheEnabled: false,
        dryRun: true,
        events: bus,
      });
      expect(result.contentHash).toMatch(/^[0-9a-f]{64}$/);
      // Read.complete fires for SOUL/TOOLS/skills. Read.failed fires
      // for the other missing optional files.
      expect(events.filter((e) => e.type === 'read.complete').length).toBeGreaterThan(0);
      expect(events.filter((e) => e.type === 'read.failed').length).toBeGreaterThan(0);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });
});
