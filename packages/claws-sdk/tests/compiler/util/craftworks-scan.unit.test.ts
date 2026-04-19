/**
 * L0: craftworks-scan helper unit tests.
 *
 * Guards the canonical `@craftworks/` leak scanner used by both the
 * emit/ and codegen/ layers. The shape of this helper is part of the
 * claws graduation acceptance contract, so every case below is a
 * direct contract assertion.
 */

import { describe, it, expect } from 'vitest';
import { verifyNoCraftworksRefs } from '#src/compiler/util/craftworks-scan.js';
import * as utilBarrel from '#src/compiler/util/index.js';

describe('verifyNoCraftworksRefs', () => {
  it('returns an empty array when the content is clean', () => {
    expect(verifyNoCraftworksRefs('no references here')).toEqual([]);
  });

  it('detects a single @craftworks/* specifier', () => {
    expect(verifyNoCraftworksRefs('import X from "@craftworks/foo"')).toEqual([
      '@craftworks/foo',
    ]);
  });

  it('returns every match in source order, duplicates included', () => {
    const src =
      'import A from "@craftworks/foo"; import B from "@craftworks/bar"; import C from "@craftworks/foo";';
    expect(verifyNoCraftworksRefs(src)).toEqual([
      '@craftworks/foo',
      '@craftworks/bar',
      '@craftworks/foo',
    ]);
  });

  it('matches case-insensitively (@Craftworks, @CRAFTWORKS)', () => {
    const src = 'require("@Craftworks/Foo"); require("@CRAFTWORKS/bar");';
    const hits = verifyNoCraftworksRefs(src);
    expect(hits).toHaveLength(2);
    expect(hits[0]?.toLowerCase()).toBe('@craftworks/foo');
    expect(hits[1]?.toLowerCase()).toBe('@craftworks/bar');
  });

  it('accepts package names with digits, hyphens, and underscores', () => {
    const src =
      '@craftworks/pkg-1 and @craftworks/pkg_2 and @craftworks/abc123';
    expect(verifyNoCraftworksRefs(src)).toEqual([
      '@craftworks/pkg-1',
      '@craftworks/pkg_2',
      '@craftworks/abc123',
    ]);
  });

  it('is stateless across calls -- no lingering regex lastIndex', () => {
    const src = '@craftworks/a @craftworks/b';
    expect(verifyNoCraftworksRefs(src)).toEqual([
      '@craftworks/a',
      '@craftworks/b',
    ]);
    expect(verifyNoCraftworksRefs(src)).toEqual([
      '@craftworks/a',
      '@craftworks/b',
    ]);
  });

  it('does not match bare @craftworks (no slash)', () => {
    expect(verifyNoCraftworksRefs('the @craftworks org')).toEqual([]);
  });

  it('does not match scoped packages outside the @craftworks namespace', () => {
    expect(verifyNoCraftworksRefs('import X from "@other/foo"')).toEqual([]);
  });

  it('is re-exported from the util barrel', () => {
    expect(utilBarrel.verifyNoCraftworksRefs).toBe(verifyNoCraftworksRefs);
  });
});
