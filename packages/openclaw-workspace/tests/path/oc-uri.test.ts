/**
 * Unified `parseOcUri` / `formatOcUri` discriminated-union tests.
 */

import { describe, it, expect } from 'vitest';
import { parseOcUri, formatOcUri } from '../../src/path/oc-uri.js';
import { OcConfigUriError } from '../../src/path/oc-config-uri.js';
import { OcPathError } from '../../src/path/oc-path.js';

describe('parseOcUri / formatOcUri', () => {
  it('dispatches oc://config/... to config branch', () => {
    const r = parseOcUri('oc://config/channels/matrix/accessToken');
    expect(r.kind).toBe('config');
    if (r.kind === 'config') {
      expect(r.path).toEqual(['channels', 'matrix', 'accessToken']);
    }
  });
  it('dispatches oc://config (root) to config branch', () => {
    const r = parseOcUri('oc://config');
    expect(r.kind).toBe('config');
    if (r.kind === 'config') {
      expect(r.path).toEqual([]);
    }
  });
  it('dispatches oc://TOOLS.md/... to workspace branch', () => {
    const r = parseOcUri('oc://TOOLS.md/Tools/send-email/args_from');
    expect(r.kind).toBe('workspace');
    if (r.kind === 'workspace') {
      expect(r.path.file).toBe('TOOLS.md');
    }
  });
  it('does NOT confuse oc://configX with oc://config (file boundary check)', () => {
    // oc://configX/... is a workspace URI for a file named "configX"
    const r = parseOcUri('oc://configurable/settings');
    expect(r.kind).toBe('workspace');
    if (r.kind === 'workspace') {
      expect(r.path.file).toBe('configurable');
    }
  });
  it('round-trips workspace form via formatOcUri', () => {
    const uri = 'oc://TOOLS.md/Tools/send-email/args_from';
    const parsed = parseOcUri(uri);
    expect(formatOcUri(parsed)).toBe(uri);
  });
  it('round-trips config form via formatOcUri', () => {
    const uri = 'oc://config/channels/matrix/allowFrom/0';
    const parsed = parseOcUri(uri);
    expect(formatOcUri(parsed)).toBe(uri);
  });
  it('throws OcConfigUriError on malformed config URI', () => {
    expect(() => parseOcUri('oc://config/')).toThrow(OcConfigUriError);
  });
  it('throws OcPathError on malformed workspace URI', () => {
    expect(() => parseOcUri('not-a-uri')).toThrow(OcPathError);
  });
});
