/**
 * L0: IDENTITY.md intent extraction unit tests.
 *
 * Tests:
 * 1. Full IDENTITY.md with all sections
 * 2. Auth method detection: SSO, certificate, token, basic, none
 * 3. Attestation level parsing: L0–L4 and fallback
 * 4. Missing sections default to "unknown"
 * 5. Trust Level vs Trust section heading variants
 */

import { describe, it, expect } from 'vitest';
import { extractIdentityIntents } from '../../../src/compile/intent/identity-intent.js';
import type { FileEntryPresent } from '../../../src/compile/types.js';

function makeEntry(content: string): FileEntryPresent {
  return {
    status: 'present',
    source: 'IDENTITY.md',
    content,
    provenance: {
      source: 'IDENTITY.md',
      sourceType: 'filesystem',
      contentHash: 'test-hash',
      readAt: '2026-04-12T00:00:00Z',
      rawSize: content.length,
    },
  };
}

describe('extractIdentityIntents', () => {
  it('extracts all fields from a complete IDENTITY.md', () => {
    const entry = makeEntry(
      '# Identity\n\n' +
      '## Organization\n\nAcme Corp\n\n' +
      '## Team\n\nPlatform Engineering\n\n' +
      '## Trust Level\n\nL3 — Full production access\n\n' +
      'Auth via SSO with Okta SAML.\n',
    );
    const result = extractIdentityIntents(entry);

    expect(result.source).toBe('IDENTITY.md');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.intents).toHaveLength(1);

    const intent = result.intents[0]!;
    expect(intent.organization).toBe('Acme Corp');
    expect(intent.team).toBe('Platform Engineering');
    expect(intent.attestationLevel).toBe('L3');
    expect(intent.authMethod).toBe('sso');
  });

  it('detects SSO auth method from SAML keyword', () => {
    const entry = makeEntry('## Organization\n\nX\n\n## Team\n\nY\n\nUses SAML federation.\n');
    const result = extractIdentityIntents(entry);
    expect(result.intents[0]!.authMethod).toBe('sso');
  });

  it('detects certificate auth method', () => {
    const entry = makeEntry('## Organization\n\nX\n\n## Team\n\nY\n\nAuthentication via mTLS certificates.\n');
    const result = extractIdentityIntents(entry);
    expect(result.intents[0]!.authMethod).toBe('certificate');
  });

  it('detects token auth method from JWT keyword', () => {
    const entry = makeEntry('## Organization\n\nX\n\n## Team\n\nY\n\nUses JWT bearer tokens.\n');
    const result = extractIdentityIntents(entry);
    expect(result.intents[0]!.authMethod).toBe('token');
  });

  it('detects basic auth method', () => {
    const entry = makeEntry('## Organization\n\nX\n\n## Team\n\nY\n\nBasic password authentication.\n');
    const result = extractIdentityIntents(entry);
    expect(result.intents[0]!.authMethod).toBe('basic');
  });

  it('defaults to none when no auth keywords found', () => {
    const entry = makeEntry('## Organization\n\nX\n\n## Team\n\nY\n\nNo specific auth.\n');
    const result = extractIdentityIntents(entry);
    expect(result.intents[0]!.authMethod).toBe('none');
  });

  it('parses attestation levels L0 through L4', () => {
    for (let level = 0; level <= 4; level++) {
      const entry = makeEntry(`## Trust Level\n\nL${level} clearance\n`);
      const result = extractIdentityIntents(entry);
      expect(result.intents[0]!.attestationLevel).toBe(`L${level}`);
    }
  });

  it('defaults to L0 when no attestation level found', () => {
    const entry = makeEntry('## Trust Level\n\nNo specific level.\n');
    const result = extractIdentityIntents(entry);
    expect(result.intents[0]!.attestationLevel).toBe('L0');
  });

  it('defaults to "unknown" when Organization or Team sections are missing', () => {
    const entry = makeEntry('# Identity\n\nSome content without sections.\n');
    const result = extractIdentityIntents(entry);

    expect(result.intents).toHaveLength(1);
    expect(result.intents[0]!.organization).toBe('unknown');
    expect(result.intents[0]!.team).toBe('unknown');
  });

  it('falls back to ## Trust section when ## Trust Level is missing', () => {
    const entry = makeEntry(
      '## Organization\n\nX\n\n## Team\n\nY\n\n## Trust\n\nL2 internal access\n',
    );
    const result = extractIdentityIntents(entry);
    expect(result.intents[0]!.attestationLevel).toBe('L2');
  });

  it('stops section content at next ## heading', () => {
    const entry = makeEntry(
      '## Organization\n\nFirst Org\n\n## Team\n\nAlpha Squad\n\n## Trust Level\n\nL1\n',
    );
    const result = extractIdentityIntents(entry);
    expect(result.intents[0]!.organization).toBe('First Org');
    expect(result.intents[0]!.team).toBe('Alpha Squad');
  });
});
