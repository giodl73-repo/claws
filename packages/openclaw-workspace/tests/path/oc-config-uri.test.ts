/**
 * Unit tests for `parseOcConfigUri` / `formatOcConfigUri` / `resolveConfigUri`.
 *
 * Covers:
 * - F-88 round-trip parse + format
 * - F-89 array-index form
 * - F-90 malformed URIs throw structured `OcConfigUriError`
 * - F-95 valid path returns full record
 * - F-96 missing path returns `{found: false}` — never throws
 * - F-97 array out-of-bounds returns `{found: false}` — not exception
 */

import { describe, it, expect } from 'vitest';
import {
  parseOcConfigUri,
  formatOcConfigUri,
  resolveConfigUri,
  OcConfigUriError,
} from '../../src/path/oc-config-uri.js';

describe('parseOcConfigUri / formatOcConfigUri', () => {
  it('round-trips a typical channels/matrix path (F-88)', () => {
    const uri = 'oc://config/channels/matrix/accessToken';
    const parsed = parseOcConfigUri(uri);
    expect(parsed.path).toEqual(['channels', 'matrix', 'accessToken']);
    expect(formatOcConfigUri(parsed.path)).toBe(uri);
  });
  it('parses array-index form correctly (F-89)', () => {
    const uri = 'oc://config/channels/matrix/allowFrom/0';
    const parsed = parseOcConfigUri(uri);
    expect(parsed.path).toEqual(['channels', 'matrix', 'allowFrom', 0]);
    // Numeric segment serializes back as integer string
    expect(formatOcConfigUri(parsed.path)).toBe(uri);
  });
  it('parses empty config root', () => {
    const parsed = parseOcConfigUri('oc://config');
    expect(parsed.path).toEqual([]);
    expect(formatOcConfigUri([])).toBe('oc://config');
  });
  it('throws OcConfigUriError on bad scheme (F-90)', () => {
    expect(() => parseOcConfigUri('http://config/x')).toThrow(OcConfigUriError);
  });
  it('throws OcConfigUriError on trailing slash (F-90)', () => {
    expect(() => parseOcConfigUri('oc://config/')).toThrow(OcConfigUriError);
  });
  it('throws OcConfigUriError on empty segment (F-90)', () => {
    expect(() => parseOcConfigUri('oc://config//double-slash')).toThrow(OcConfigUriError);
  });
  it('encodes/decodes percent-encoded segments', () => {
    const uri = formatOcConfigUri(['weird key', 'with spaces']);
    expect(uri).toBe('oc://config/weird%20key/with%20spaces');
    expect(parseOcConfigUri(uri).path).toEqual(['weird key', 'with spaces']);
  });
});

describe('resolveConfigUri', () => {
  const sampleConfig = {
    version: '2026.4.28',
    channels: {
      matrix: {
        homeserver: 'https://matrix.example.com',
        accessToken: 'syt_secret',
        allowFrom: ['user-a', 'user-b', 'user-c'],
      },
    },
  };

  it('returns full record for valid leaf path (F-95)', () => {
    const r = resolveConfigUri('oc://config/channels/matrix/accessToken', sampleConfig);
    expect(r.found).toBe(true);
    if (r.found) {
      expect(r.value).toBe('syt_secret');
      expect(r.leafKey).toBe('accessToken');
      expect(r.parentNode).toBe(sampleConfig.channels.matrix);
    }
  });

  it('returns full record for valid array-index path', () => {
    const r = resolveConfigUri('oc://config/channels/matrix/allowFrom/1', sampleConfig);
    expect(r.found).toBe(true);
    if (r.found) {
      expect(r.value).toBe('user-b');
      expect(r.leafKey).toBe(1);
      expect(r.parentNode).toBe(sampleConfig.channels.matrix.allowFrom);
    }
  });

  it('returns {found: false} for missing object path — never throws (F-96)', () => {
    const r = resolveConfigUri('oc://config/channels/slack/accessToken', sampleConfig);
    expect(r.found).toBe(false);
  });

  it('returns {found: false} for missing leaf key — never throws (F-96)', () => {
    const r = resolveConfigUri('oc://config/channels/matrix/nonexistent', sampleConfig);
    expect(r.found).toBe(false);
  });

  it('returns {found: false} for array out-of-bounds — not exception (F-97)', () => {
    const r = resolveConfigUri('oc://config/channels/matrix/allowFrom/99', sampleConfig);
    expect(r.found).toBe(false);
  });

  it('returns {found: false} for negative array index', () => {
    const r = resolveConfigUri('oc://config/channels/matrix/allowFrom/-1', sampleConfig);
    // Note: parseOcConfigUri encodes only non-negative integers as numbers;
    // "-1" stays as a string "-1" segment, which doesn't match the array.
    expect(r.found).toBe(false);
  });

  it('returns {found: false} for path traversing through null value', () => {
    const cfg = { channels: { matrix: null } } as unknown;
    const r = resolveConfigUri('oc://config/channels/matrix/accessToken', cfg);
    expect(r.found).toBe(false);
  });

  it('returns {found: false} for empty config root URI', () => {
    const r = resolveConfigUri('oc://config', sampleConfig);
    // Root-level has no leaf to address.
    expect(r.found).toBe(false);
  });

  it('throws OcConfigUriError on malformed URI (F-90 propagation)', () => {
    expect(() => resolveConfigUri('oc://config/', sampleConfig)).toThrow(OcConfigUriError);
  });
});
