import { describe, it, expect } from 'vitest';
import {
  emitPluginCode,
  verifyNoForbiddenImports,
} from '../src/emit/emit-plugin.js';
import { waffles } from './helpers/fixture.js';

describe('emit-plugin — branch coverage', () => {
  it('throws when the emitted source contains a forbidden @craftworks/* reference', () => {
    const polluted =
      "import foo from '@craftworks/legacy';\nconst x = '@claws/internal';\n";
    expect(() => verifyNoForbiddenImports(polluted, '@openclaw')).toThrow(
      /forbidden/,
    );
  });

  it('reports duplicate forbidden hits as a de-duplicated list', () => {
    const polluted = "'@craftworks/a' '@craftworks/b'";
    try {
      verifyNoForbiddenImports(polluted, '@openclaw');
      throw new Error('expected throw');
    } catch (err) {
      expect(String(err)).toContain('@craftworks/');
    }
  });

  it('default scope prefix is @bic/openclaw (P57 flipped the default)', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-X' });
    expect(src).toContain("from '@bic/openclaw-policy/runtime'");
    expect(src).toContain("from '@bic/openclaw-guardrails'");
    expect(src).toContain("from '@bic/openclaw-workspace/path'");
  });

  it('embeds the policyId and snapshotId as comments', () => {
    const ir = waffles();
    const src = emitPluginCode({ ir, snapshotId: 'sha256-XYZ' });
    expect(src).toContain(`// policyId: ${ir.policyId}`);
    expect(src).toContain('// snapshotId: sha256-XYZ');
  });

  it('@bic/openclaw scope allows @bic/openclaw-* hits via whitelist', () => {
    // The bic rendering path emits `from '@bic/openclaw-policy/runtime'` (hyphen
    // form — flat package names). The scan should not treat those as forbidden.
    const bic = emitPluginCode({
      ir: waffles(),
      snapshotId: 'sha256-X',
      scopePrefix: '@bic/openclaw',
    });
    expect(() => verifyNoForbiddenImports(bic, '@bic/openclaw')).not.toThrow();
  });

  it('emitted plugin includes runtime ABI symbol imports', () => {
    const src = emitPluginCode({ ir: waffles(), snapshotId: 'sha256-X' });
    expect(src).toContain('issueHandle');
    expect(src).toContain('propagatedSensitivity');
    expect(src).toContain('matchDenyRules');
  });

  it('@bic scope still rejects raw @craftworks hits (whitelist context mismatch)', () => {
    // @craftworks/ is never a valid @bic/openclaw- neighbor — the allow-list
    // must still flag it even when scope === '@bic/openclaw'.
    const polluted = "import x from '@craftworks/legacy';\n";
    expect(() => verifyNoForbiddenImports(polluted, '@bic/openclaw')).toThrow(
      /forbidden/,
    );
  });

  it('unknown scope treats every hit as forbidden (allow-list is null)', () => {
    const polluted = "import x from '@claws/internal';\n";
    expect(() => verifyNoForbiddenImports(polluted, 'unknown-scope')).toThrow(
      /forbidden/,
    );
  });
});
