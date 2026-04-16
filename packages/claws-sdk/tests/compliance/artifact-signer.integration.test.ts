/**
 * L1: ArtifactSigner integration -- cross-module signing of compliance evidence.
 *
 * Tests:
 * 1. Sign SOC2 evidence + verify signature
 * 2. Sign with Ed25519 + counter-sign with RFC 3161
 */

import { describe, it, expect } from 'vitest';
import { randomBytes } from 'node:crypto';
import { AuditChain } from '../../src/audit/chain.js';
import { buildSOC2Evidence } from '../../src/compliance/soc2.js';
import {
  generateSigningKeyPair,
  signEd25519,
  signHmac256,
  verifyEd25519,
  verifyHmac256,
  hashEvidence,
  buildTimestampRequest,
  validateTsaUrl,
} from '../../src/compliance/artifact-signer.js';
import type { GovAnalysis } from '../../src/ir/gov-analysis.js';
import type { AuditEntry } from '../../src/audit/types.js';

/**
 * Build a minimal audit chain with events for SOC2 controls.
 */
function buildTestAuditChain(): AuditChain {
  const key = randomBytes(32);
  const chain = new AuditChain(key);

  const events: Array<{ eventType: string; ruleId: string; day: number }> = [
    { eventType: 'TOOL_CALL', ruleId: 'G-PERM-01', day: 1 },
    { eventType: 'CREDENTIAL_CHECK', ruleId: 'G-ELICIT-01', day: 2 },
    { eventType: 'CLASSIFICATION', ruleId: 'G-CLASS-01', day: 3 },
    { eventType: 'SUPPLY_CHAIN_CHECK', ruleId: 'G-SUPPLY-01', day: 4 },
    { eventType: 'DATA_FLOW', ruleId: 'G-DATA-01', day: 5 },
    { eventType: 'INPUT_VALIDATION', ruleId: 'G-INPUT-01', day: 6 },
    { eventType: 'CONTEXT_CHECK', ruleId: 'G-CONTEXT-01', day: 7 },
    { eventType: 'BOUND_CHECK', ruleId: 'G-BOUND-01', day: 8 },
    { eventType: 'A2A_DELEGATION', ruleId: 'G-A2A-01', day: 9 },
  ];

  for (const evt of events) {
    const entry: AuditEntry = {
      timestamp: `2025-10-${String(evt.day).padStart(2, '0')}T10:00:00Z`,
      eventType: evt.eventType,
      actor: 'agent-1',
      target: 'test-target',
      action: 'invoke',
      outcome: 'allow',
      ruleId: evt.ruleId,
      severity: 3,
      policyVersion: '1.0.0',
    };
    chain.append(entry);
  }

  return chain;
}

function makeCleanAnalysis(): GovAnalysis {
  return {
    violations: [],
    warnings: [],
    enforcementPlan: {
      blockedTools: [],
      requiredApprovals: [],
      auditOnlyRules: [],
      channelRedactions: [],
      ruleSuppressions: [],
    },
    reclassificationTable: [],
    effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
  };
}

describe('Sign SOC2 evidence + verify signature', () => {
  it('Ed25519: builds SOC2 evidence, signs it, and verifies the signature', () => {
    // Build SOC2 evidence from audit chain
    const chain = buildTestAuditChain();
    const entries = chain.read();
    const verifyResult = chain.verify();
    expect(verifyResult.valid).toBe(true);

    const evidence = buildSOC2Evidence({
      scope: '/test/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-04-01T00:00:00Z',
      observationEnd: '2025-11-01T00:00:00Z',
    });

    expect(evidence.overallStatus).toBe('pass');
    expect(evidence.controls.length).toBe(9);

    // Sign with Ed25519
    const keyPair = generateSigningKeyPair();
    const envelope = signEd25519(evidence, keyPair.privateKey, keyPair.keyId);

    expect(envelope.algorithm).toBe('ed25519');
    expect(envelope.evidenceHash).toMatch(/^[0-9a-f]{64}$/);

    // Verify the signature
    expect(verifyEd25519(envelope, evidence, keyPair.publicKey)).toBe(true);

    // Tampered evidence fails verification
    const tampered = { ...evidence, overallStatus: 'fail' as const };
    expect(verifyEd25519(envelope, tampered, keyPair.publicKey)).toBe(false);
  });

  it('HMAC-SHA256: builds SOC2 evidence, signs it, and verifies the signature', () => {
    const chain = buildTestAuditChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    const evidence = buildSOC2Evidence({
      scope: '/test/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-04-01T00:00:00Z',
      observationEnd: '2025-11-01T00:00:00Z',
    });

    // Sign with HMAC-SHA256
    const secret = randomBytes(32);
    const envelope = signHmac256(evidence, secret, 'hmac-dev-key');

    expect(envelope.algorithm).toBe('hmac-sha256');

    // Verify the signature
    expect(verifyHmac256(envelope, evidence, secret)).toBe(true);

    // Wrong secret fails
    const wrongSecret = randomBytes(32);
    expect(verifyHmac256(envelope, evidence, wrongSecret)).toBe(false);
  });
});

describe('Sign with Ed25519 + counter-sign with RFC 3161', () => {
  it('signs evidence with Ed25519 and prepares RFC 3161 timestamp request', () => {
    // Build SOC2 evidence
    const chain = buildTestAuditChain();
    const entries = chain.read();
    const verifyResult = chain.verify();

    const evidence = buildSOC2Evidence({
      scope: '/test/workspace',
      analysis: makeCleanAnalysis(),
      chainEntries: entries,
      chainVerifyResult: verifyResult,
      observationStart: '2025-04-01T00:00:00Z',
      observationEnd: '2025-11-01T00:00:00Z',
    });

    // Step 1: Sign with Ed25519
    const keyPair = generateSigningKeyPair();
    const envelope = signEd25519(evidence, keyPair.privateKey, keyPair.keyId);
    expect(verifyEd25519(envelope, evidence, keyPair.publicKey)).toBe(true);

    // Step 2: Prepare RFC 3161 timestamp request for the signed evidence hash
    const { request: tsReq, nonce } = buildTimestampRequest(envelope.evidenceHash);
    expect(Buffer.isBuffer(tsReq)).toBe(true);
    expect(tsReq[0]).toBe(0x30); // SEQUENCE
    expect(nonce.length).toBe(8);

    // The timestamp request contains the evidence hash
    const hashBytes = Buffer.from(envelope.evidenceHash, 'hex');
    expect(tsReq.includes(hashBytes)).toBe(true);

    // Validate TSA URL enforcement
    expect(() => validateTsaUrl('https://tsa.corp.com')).not.toThrow();
    expect(() => validateTsaUrl('http://insecure-tsa.com')).toThrow('must use HTTPS');

    // The evidence hash is deterministic across both Ed25519 and HMAC modes
    const evidenceHash = hashEvidence(evidence);
    expect(envelope.evidenceHash).toBe(evidenceHash);

    // Counter-sign the same evidence hash with HMAC-SHA256 for dual-mode
    const secret = randomBytes(32);
    const hmacEnvelope = signHmac256(evidence, secret, 'hmac-counter');
    expect(hmacEnvelope.evidenceHash).toBe(evidenceHash);
    expect(verifyHmac256(hmacEnvelope, evidence, secret)).toBe(true);
  });
});
