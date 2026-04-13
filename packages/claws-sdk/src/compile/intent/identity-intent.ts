/**
 * IDENTITY.md intent extraction — auth method and attestation level.
 *
 * Extracts organization, team, auth method, and trust/attestation level
 * from IDENTITY.md content.
 *
 * @module claws-sdk/compile/intent/identity-intent
 */

import type {
  FileEntryPresent,
  IdentityIntent,
  AuthMethod,
  AttestationLevel,
  IntentResult,
} from '../types.js';

/**
 * Parse attestation level from a trust level line.
 */
function parseAttestationLevel(text: string): AttestationLevel {
  const match = /L([0-4])/i.exec(text);
  if (match) {
    return `L${match[1]}` as AttestationLevel;
  }
  return 'L0';
}

/**
 * Parse auth method from identity content.
 */
function parseAuthMethod(content: string): AuthMethod {
  const lower = content.toLowerCase();

  if (/\b(sso|single\s+sign[- ]on|saml|oidc)\b/.test(lower)) return 'sso';
  if (/\b(certificate|cert|mtls|mutual\s+tls)\b/.test(lower)) return 'certificate';
  if (/\b(token|jwt|bearer|api[- ]key)\b/.test(lower)) return 'token';
  if (/\b(basic|password|user\s*name)\b/.test(lower)) return 'basic';
  return 'none';
}

/**
 * Extract a section value from markdown content.
 *
 * Finds "## SectionName" and returns the non-empty content below it.
 */
function extractSection(lines: readonly string[], sectionName: string): string {
  let inSection = false;
  const content: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^##\s/.test(trimmed)) {
      if (inSection) break; // Next section
      if (trimmed.toLowerCase().includes(sectionName.toLowerCase())) {
        inSection = true;
      }
      continue;
    }

    if (inSection && trimmed.length > 0) {
      content.push(trimmed);
    }
  }

  return content.join(' ').trim();
}

/**
 * Extract identity intent from an IDENTITY.md file entry.
 */
export function extractIdentityIntents(entry: FileEntryPresent): IntentResult<IdentityIntent> {
  const lines = entry.content.split('\n');

  const organization = extractSection(lines, 'Organization') || 'unknown';
  const team = extractSection(lines, 'Team') || 'unknown';
  const trustText = extractSection(lines, 'Trust Level') || extractSection(lines, 'Trust') || '';
  const attestationLevel = parseAttestationLevel(trustText);
  const authMethod = parseAuthMethod(entry.content);

  const intent: IdentityIntent = {
    organization,
    team,
    authMethod,
    attestationLevel,
  };

  return {
    source: entry.source,
    intents: [intent],
    diagnostics: [],
  };
}
