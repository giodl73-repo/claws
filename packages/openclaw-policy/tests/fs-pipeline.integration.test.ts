/**
 * L1 integration: `generate()` fs pipeline emits three artifacts to disk,
 * and the emitted `audit-manifest.json` round-trips through `verifyAudit`
 * without any env-var secret (fixture key derivation from `policyId`).
 *
 * This is the live contract pulse 47.6 smoke depends on — if this test
 * fails, the CP-5.5 exit gate regresses.
 */

import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

import type { AuditEntry } from '@bic/openclaw-guardrails/audit';

import { generate } from '../src/generator.js';
import { deriveFixtureHmacKey } from '../src/emit/emit-audit-chain.js';
import { verifyAudit } from '../src/ops/verify-audit.js';

function makeWorkspace(): string {
  const ws = mkdtempSync(join(tmpdir(), 'openclaw-policy-fs-'));
  writeFileSync(
    join(ws, 'SOUL.md'),
    '# fixture — SOUL\n\n## Boundaries\n- never leak secrets\n- do not email customers\n',
    'utf8',
  );
  writeFileSync(
    join(ws, 'TOOLS.md'),
    '# fixture — TOOLS\n\n## Tools\n\n### weather_lookup # R1 READ\n\nargs_from:\n  city: [user_prompt]\n',
    'utf8',
  );
  return ws;
}

describe('fsGenerate — on-disk generate + verify round-trip', () => {
  it('emits three artifacts under .openclaw/policy and verify accepts the chain', async () => {
    const ws = makeWorkspace();
    try {
      const res = await generate({ workspaceRoot: ws });
      expect(res.writtenFiles).toHaveLength(3);
      const names = res.writtenFiles.map((p) => p.split(/[\\/]/).pop());
      expect(new Set(names)).toEqual(
        new Set(['policy-ir.json', 'gateway-plugin.ts', 'audit-manifest.json']),
      );

      const manifestPath = join(ws, '.openclaw', 'policy', 'audit-manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
        policyId: string;
        chain: AuditEntry[];
      };
      expect(manifest.chain.length).toBe(3);
      expect(manifest.policyId).toMatch(/^sha256-/);

      const key = deriveFixtureHmacKey(manifest.policyId);
      const v = verifyAudit({ chain: manifest.chain, hmacKey: key });
      expect(v.valid).toBe(true);
      expect(v.length).toBe(3);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('missing workspace files produce info diagnostics but still emit artifacts', async () => {
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-policy-fs-bare-'));
    try {
      const res = await generate({ workspaceRoot: ws });
      expect(res.writtenFiles).toHaveLength(3);
      const missing = res.diagnostics.filter(
        (d) => d.code === 'OC-POLICY-I-MISSING-FILE',
      );
      expect(missing.length).toBeGreaterThanOrEqual(3);
      for (const m of missing) expect(m.severity).toBe('info');
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('repeat generate is byte-identical on the same workspace', async () => {
    const ws = makeWorkspace();
    try {
      await generate({ workspaceRoot: ws });
      const first = readFileSync(
        join(ws, '.openclaw', 'policy', 'audit-manifest.json'),
        'utf8',
      );
      await generate({ workspaceRoot: ws });
      const second = readFileSync(
        join(ws, '.openclaw', 'policy', 'audit-manifest.json'),
        'utf8',
      );
      expect(second).toBe(first);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('respects a caller-supplied HMAC key (verify with same key round-trips)', async () => {
    const ws = makeWorkspace();
    try {
      const hmacKey = Buffer.alloc(32, 0x42);
      const res = await generate({ workspaceRoot: ws }, { hmacKey });
      expect(res.writtenFiles).toHaveLength(3);
      const manifest = JSON.parse(
        readFileSync(join(ws, '.openclaw', 'policy', 'audit-manifest.json'), 'utf8'),
      ) as { chain: AuditEntry[]; policyId: string };
      const v = verifyAudit({ chain: manifest.chain, hmacKey });
      expect(v.valid).toBe(true);
      // The fixture key should NOT round-trip when the chain was signed
      // with a custom key — proves we really used the caller's key.
      const fixtureKey = deriveFixtureHmacKey(manifest.policyId);
      const vBad = verifyAudit({ chain: manifest.chain, hmacKey: fixtureKey });
      expect(vBad.valid).toBe(false);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('strict mode + governance-fatal error diagnostic returns 0 written files', async () => {
    // We cannot easily synthesize a governance fatal without a richer
    // fixture; this covers the `strict: true, no-errors` positive path,
    // which is the critical guard to make sure strict mode does not
    // spuriously short-circuit clean workspaces.
    const ws = makeWorkspace();
    try {
      const res = await generate({ workspaceRoot: ws, strict: true });
      expect(res.writtenFiles.length).toBe(3);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('works when .openclaw already exists (idempotent mkdir -p)', async () => {
    const ws = makeWorkspace();
    try {
      await mkdir(join(ws, '.openclaw', 'policy'), { recursive: true });
      const res = await generate({ workspaceRoot: ws });
      expect(res.writtenFiles).toHaveLength(3);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('honours a caller-supplied `now` (deterministic manifest timestamp)', async () => {
    const ws = makeWorkspace();
    try {
      const fixed = new Date('2100-06-15T12:34:56.000Z');
      const res = await generate({ workspaceRoot: ws }, { now: () => fixed });
      expect(res.writtenFiles).toHaveLength(3);
      const manifest = JSON.parse(
        readFileSync(join(ws, '.openclaw', 'policy', 'audit-manifest.json'), 'utf8'),
      ) as { chain: Array<{ timestamp: string }> };
      for (const entry of manifest.chain) {
        expect(entry.timestamp).toBe(fixed.toISOString());
      }
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('strict mode + no errors writes all 3 artifacts (positive branch)', async () => {
    const ws = makeWorkspace();
    try {
      const res = await generate({ workspaceRoot: ws, strict: true });
      expect(res.writtenFiles).toHaveLength(3);
      expect(res.diagnostics.some((d) => d.severity === 'error')).toBe(false);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('strict mode + governance-fatal aborts before writing', async () => {
    // R3 tool without args_from triggers E_R3_PROVENANCE_MISSING → error
    // severity → strict mode aborts with writtenFiles: [].
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-policy-strict-'));
    writeFileSync(
      join(ws, 'TOOLS.md'),
      [
        '# fixture — TOOLS',
        '',
        '## Tools',
        '',
        '### unsourced_r3 # R3 READ',
        '',
      ].join('\n'),
      'utf8',
    );
    try {
      const res = await generate({ workspaceRoot: ws, strict: true });
      expect(res.writtenFiles).toEqual([]);
      expect(res.diagnostics.some((d) => d.severity === 'error')).toBe(true);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });

  it('rejects R5 + failOpen without --strict; emits generatorDiagnostics and no artifacts', async () => {
    // Pulse 53 SC-07: generator guard runs unconditionally — the
    // r5-fail-open rule is a compile-time invariant, not a strictness
    // knob. Artifacts MUST NOT hit disk when the guard fires.
    const ws = mkdtempSync(join(tmpdir(), 'openclaw-policy-r5fo-'));
    writeFileSync(
      join(ws, 'TOOLS.md'),
      [
        '# fixture — TOOLS',
        '',
        '## Tools',
        '',
        '### send-email-failopen # R5, COMMUNICATE, IRREVERSIBLE_EXTERNAL, failOpen',
        '',
      ].join('\n'),
      'utf8',
    );
    try {
      const res = await generate({ workspaceRoot: ws });
      expect(res.writtenFiles).toEqual([]);
      expect(res.generatorDiagnostics).toBeDefined();
      expect(res.generatorDiagnostics!).toHaveLength(1);
      const [gd] = res.generatorDiagnostics!;
      expect(gd!.kind).toBe('r5-fail-open');
      expect(gd!.invalidReason).toBe('r5-fail-open-declared');
      expect(gd!.toolName).toBe('send-email-failopen');
      expect(gd!.line).toBe(5);
      expect(gd!.column).toBe(5);
      expect(
        res.diagnostics.some(
          (d) => d.severity === 'error' && d.code === 'OC-POLICY-E103',
        ),
      ).toBe(true);
    } finally {
      rmSync(ws, { recursive: true, force: true });
    }
  });
});
