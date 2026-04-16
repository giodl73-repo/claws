/**
 * L0: comply command — SOC2 and HIPAA evidence wiring, JSON/text output, error paths.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ── SDK mocks ───────────────────────────────────────────────────────────────

const mockVerifyChainIntegrity = vi.fn();

vi.mock('@bic/claws-sdk/audit', () => ({
  verifyChainIntegrity: (...args: unknown[]) => mockVerifyChainIntegrity(...args),
}));

const mockBuildSOC2Evidence = vi.fn();
const mockBuildHIPAAEvidence = vi.fn();

vi.mock('@bic/claws-sdk/compliance', () => ({
  buildSOC2Evidence: (...args: unknown[]) => mockBuildSOC2Evidence(...args),
  buildHIPAAEvidence: (...args: unknown[]) => mockBuildHIPAAEvidence(...args),
}));

// ── FS mocks ────────────────────────────────────────────────────────────────

const mockReadFile = vi.fn();

vi.mock('node:fs/promises', () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

// ── Imports (after mocks) ───────────────────────────────────────────────────

import { runComplySOC2, runComplyHIPAA } from '../../src/commands/comply.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function resetMocks() {
  vi.restoreAllMocks();
  mockVerifyChainIntegrity.mockReset();
  mockBuildSOC2Evidence.mockReset();
  mockBuildHIPAAEvidence.mockReset();
  mockReadFile.mockReset();
}

/** Minimal SOC2 evidence with overallStatus = 'pass'. */
function makeSOC2Evidence(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    scope: '/ws',
    observationPeriodStart: '2025-07-01T00:00:00.000Z',
    observationPeriodEnd: '2026-01-01T00:00:00.000Z',
    observationPeriodValid: true,
    controls: [
      { controlId: 'CC6.1', controlName: 'Logical Access', status: 'pass', evidenceCount: 5, findings: [] },
    ],
    findings: [],
    overallStatus: 'pass',
    totalEvidenceCount: 5,
    ...overrides,
  };
}

/** Minimal HIPAA evidence with overallStatus = 'pass'. */
function makeHIPAAEvidence(overrides: Record<string, unknown> = {}) {
  return {
    version: '1.0.0',
    generatedAt: '2026-01-01T00:00:00.000Z',
    scope: '/ws',
    safeguards: [
      { safeguardId: '164.312(a)(1)', safeguardName: 'Access Control', status: 'pass', evidenceCount: 3, findings: [] },
    ],
    phiCoverage: [
      { phiType: 'name', declared: true, labelCovered: true, coveringLabels: ['PII_NAME'] },
    ],
    transmissionGaps: [],
    findings: [],
    overallStatus: 'pass',
    totalEvidenceCount: 3,
    ...overrides,
  };
}

/** Minimal chain verify result. */
const CHAIN_VERIFY_OK = { valid: true, breaks: [], repaired: false };

// ── SOC2 tests ──────────────────────────────────────────────────────────────

describe('claws comply soc2', () => {
  afterEach(() => resetMocks());

  it('returns 0 and outputs JSON on pass with --json', async () => {
    // Empty chain (no entries), no key needed
    mockReadFile.mockRejectedValue(new Error('ENOENT'));  // chain + key reads fail
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildSOC2Evidence.mockReturnValue(makeSOC2Evidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplySOC2('/ws', { json: true });
      expect(code).toBe(0);
      expect(mockBuildSOC2Evidence).toHaveBeenCalledOnce();
      expect(logSpy).toHaveBeenCalledOnce();
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.overallStatus).toBe('pass');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs human-readable text on pass without --json', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildSOC2Evidence.mockReturnValue(makeSOC2Evidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplySOC2('/ws', { json: false });
      expect(code).toBe(0);
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('SOC2 Type II Evidence Report'))).toBe(true);
      expect(lines.some((l) => l.includes('PASS'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 when evidence overallStatus is fail', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildSOC2Evidence.mockReturnValue(makeSOC2Evidence({ overallStatus: 'fail' }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplySOC2('/ws', { json: true });
      expect(code).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 when evidence overallStatus is partial', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildSOC2Evidence.mockReturnValue(makeSOC2Evidence({ overallStatus: 'partial' }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplySOC2('/ws', { json: false });
      expect(code).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('reads chain entries from disk and verifies with key', async () => {
    const chainLine = JSON.stringify({ eventType: 'AUDIT', timestamp: '2025-10-01T00:00:00Z', target: 'x' });
    const hexKey = 'a'.repeat(64);

    // Call order: chain.jsonl, governance-ir.json, hmac.key
    mockReadFile
      .mockResolvedValueOnce(chainLine)             // chain.jsonl
      .mockRejectedValueOnce(new Error('ENOENT'))   // governance-ir.json
      .mockResolvedValueOnce(hexKey);               // hmac.key

    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildSOC2Evidence.mockReturnValue(makeSOC2Evidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplySOC2('/ws', { json: true });
      expect(code).toBe(0);
      expect(mockVerifyChainIntegrity).toHaveBeenCalledWith(
        [JSON.parse(chainLine)],
        expect.any(Buffer),
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it('passes observation period options to evidence builder', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildSOC2Evidence.mockReturnValue(makeSOC2Evidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplySOC2('/ws', {
        json: true,
        observationStart: '2025-06-01T00:00:00Z',
        observationEnd: '2026-01-01T00:00:00Z',
      });
      const call = mockBuildSOC2Evidence.mock.calls[0][0];
      expect(call.observationStart).toBe('2025-06-01T00:00:00Z');
      expect(call.observationEnd).toBe('2026-01-01T00:00:00Z');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('renders top-level findings in text mode', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildSOC2Evidence.mockReturnValue(makeSOC2Evidence({
      findings: [{ id: 'F1', controlId: 'CC6.1', severity: 'high', title: 'Missing access log', description: '', remediation: '' }],
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplySOC2('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('[HIGH]'))).toBe(true);
      expect(lines.some((l) => l.includes('Missing access log'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('reads GovAnalysis from governance-ir.json when present', async () => {
    const govIr = JSON.stringify({
      analysis: {
        violations: [{ id: 'V1' }],
        warnings: [],
        enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] },
        reclassificationTable: [],
        effectiveR5Count: { derived: 1, overridden: 0, total: 1 },
      },
    });

    // chain.jsonl fails, key fails, governance-ir.json succeeds
    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT'))  // chain.jsonl
      .mockResolvedValueOnce(govIr);                // governance-ir.json

    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildSOC2Evidence.mockReturnValue(makeSOC2Evidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplySOC2('/ws', { json: true });
      const call = mockBuildSOC2Evidence.mock.calls[0][0];
      expect(call.analysis.violations).toHaveLength(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('falls back to empty analysis when governance-ir.json has no analysis field', async () => {
    const govIr = JSON.stringify({ notAnalysis: true });

    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT'))  // chain.jsonl
      .mockResolvedValueOnce(govIr);                // governance-ir.json — no analysis key

    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildSOC2Evidence.mockReturnValue(makeSOC2Evidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplySOC2('/ws', { json: true });
      const call = mockBuildSOC2Evidence.mock.calls[0][0];
      expect(call.analysis.violations).toHaveLength(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('reads chain with empty lines and filters them out', async () => {
    const chainContent = `${JSON.stringify({ eventType: 'AUDIT', timestamp: '2025-10-01T00:00:00Z', target: 'x' })}\n\n${JSON.stringify({ eventType: 'AUDIT', timestamp: '2025-10-02T00:00:00Z', target: 'y' })}\n`;
    const hexKey = 'c'.repeat(64);

    mockReadFile
      .mockResolvedValueOnce(chainContent)          // chain.jsonl (with blank line)
      .mockRejectedValueOnce(new Error('ENOENT'))   // governance-ir.json
      .mockResolvedValueOnce(hexKey);               // hmac.key

    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildSOC2Evidence.mockReturnValue(makeSOC2Evidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplySOC2('/ws', { json: true });
      const call = mockBuildSOC2Evidence.mock.calls[0][0];
      expect(call.chainEntries).toHaveLength(2);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('succeeds with empty chain when key file is present (no-entries key-present branch)', async () => {
    const hexKey = 'd'.repeat(64);

    // chain.jsonl fails (empty chain), governance-ir.json fails, hmac.key succeeds
    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT'))  // chain.jsonl
      .mockRejectedValueOnce(new Error('ENOENT'))  // governance-ir.json
      .mockResolvedValueOnce(hexKey);               // hmac.key — succeeds even with empty chain

    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildSOC2Evidence.mockReturnValue(makeSOC2Evidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplySOC2('/ws', { json: true });
      expect(code).toBe(0);
      // verifyChainIntegrity called with empty array and actual key
      expect(mockVerifyChainIntegrity).toHaveBeenCalledWith([], expect.any(Buffer));
    } finally {
      logSpy.mockRestore();
    }
  });

  it('renders FAIL and PARTIAL controls in text mode', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildSOC2Evidence.mockReturnValue(makeSOC2Evidence({
      controls: [
        { controlId: 'CC6.1', controlName: 'Logical Access', status: 'fail', evidenceCount: 0, findings: [] },
        { controlId: 'CC7.1', controlName: 'Change Management', status: 'partial', evidenceCount: 2, findings: [{ id: 'F1' }] },
      ],
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplySOC2('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('FAIL'))).toBe(true);
      expect(lines.some((l) => l.includes('PARTIAL'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });
});

// ── HIPAA tests ─────────────────────────────────────────────────────────────

describe('claws comply hipaa', () => {
  afterEach(() => resetMocks());

  it('returns 0 and outputs JSON on pass with --json', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplyHIPAA('/ws', { json: true });
      expect(code).toBe(0);
      expect(mockBuildHIPAAEvidence).toHaveBeenCalledOnce();
      const output = JSON.parse(logSpy.mock.calls[0][0] as string);
      expect(output.overallStatus).toBe('pass');
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 0 and outputs human-readable text on pass without --json', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplyHIPAA('/ws', { json: false });
      expect(code).toBe(0);
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('HIPAA Security Rule Evidence Report'))).toBe(true);
      expect(lines.some((l) => l.includes('PASS'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('returns 1 when evidence overallStatus is fail', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence({ overallStatus: 'fail' }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplyHIPAA('/ws', { json: true });
      expect(code).toBe(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('prints PHI coverage and safeguards in text mode', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyHIPAA('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('Safeguards:'))).toBe(true);
      expect(lines.some((l) => l.includes('PHI Coverage:'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('renders transmission gaps in text mode', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence({
      transmissionGaps: [
        { toolName: 'slack', destination: 'api.slack.com', hasEncryption: false, hasIntegrity: false },
      ],
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyHIPAA('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('Transmission Gaps:'))).toBe(true);
      expect(lines.some((l) => l.includes('slack'))).toBe(true);
      expect(lines.some((l) => l.includes('encryption: NO'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('renders top-level findings in text mode', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence({
      findings: [{ id: 'H1', controlId: 'SG1', severity: 'critical', title: 'Missing encryption', description: '', remediation: '' }],
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyHIPAA('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('[CRITICAL]'))).toBe(true);
      expect(lines.some((l) => l.includes('Missing encryption'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('reads declared PHI types and external transmissions from governance IR', async () => {
    const govIr = JSON.stringify({
      analysis: {
        violations: [], warnings: [],
        enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] },
        reclassificationTable: [],
        effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
      },
      hipaa: {
        declaredPHITypes: [{ type: 'name', identifierStandard: 'HIPAA-18' }],
        externalTransmissions: [{ toolName: 'slack', destination: 'api.slack.com' }],
      },
    });

    // chain.jsonl fails (empty chain), governance-ir.json succeeds for all 3 reads
    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT'))  // chain.jsonl
      .mockResolvedValueOnce(govIr)                 // governance-ir.json (analysis)
      .mockResolvedValueOnce(govIr)                 // governance-ir.json (PHI types)
      .mockResolvedValueOnce(govIr);                // governance-ir.json (transmissions)

    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyHIPAA('/ws', { json: true });
      const call = mockBuildHIPAAEvidence.mock.calls[0][0];
      expect(call.declaredPHITypes).toHaveLength(1);
      expect(call.externalTransmissions).toHaveLength(1);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('reads chain entries and verifies with key when chain is non-empty', async () => {
    const chainLine = JSON.stringify({ eventType: 'AUDIT', timestamp: '2025-10-01T00:00:00Z', target: 'x' });
    const hexKey = 'b'.repeat(64);

    // Call order: chain.jsonl, governance-ir.json (analysis), governance-ir.json (PHI), governance-ir.json (transmissions), hmac.key
    mockReadFile
      .mockResolvedValueOnce(chainLine)             // chain.jsonl
      .mockRejectedValueOnce(new Error('ENOENT'))   // governance-ir.json (analysis)
      .mockRejectedValueOnce(new Error('ENOENT'))   // governance-ir.json (PHI types)
      .mockRejectedValueOnce(new Error('ENOENT'))   // governance-ir.json (transmissions)
      .mockResolvedValueOnce(hexKey);               // hmac.key

    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplyHIPAA('/ws', { json: true });
      expect(code).toBe(0);
      expect(mockVerifyChainIntegrity).toHaveBeenCalledWith(
        [JSON.parse(chainLine)],
        expect.any(Buffer),
      );
    } finally {
      logSpy.mockRestore();
    }
  });

  it('falls back to empty analysis when governance-ir has no analysis field', async () => {
    const govIr = JSON.stringify({ notAnalysis: true });

    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT'))  // chain.jsonl
      .mockResolvedValueOnce(govIr)                 // governance-ir.json (analysis — no analysis key)
      .mockRejectedValueOnce(new Error('ENOENT'))   // governance-ir.json (PHI types)
      .mockRejectedValueOnce(new Error('ENOENT'));   // governance-ir.json (transmissions)

    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyHIPAA('/ws', { json: true });
      const call = mockBuildHIPAAEvidence.mock.calls[0][0];
      expect(call.analysis.violations).toHaveLength(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('falls back to empty when hipaa field is present but has no arrays', async () => {
    const govIr = JSON.stringify({
      analysis: {
        violations: [], warnings: [],
        enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] },
        reclassificationTable: [],
        effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
      },
      hipaa: { notAnArray: true },
    });

    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT'))  // chain.jsonl
      .mockResolvedValueOnce(govIr)                 // governance-ir.json (analysis)
      .mockResolvedValueOnce(govIr)                 // governance-ir.json (PHI types — hipaa present but no declaredPHITypes)
      .mockResolvedValueOnce(govIr);                // governance-ir.json (transmissions — hipaa present but no externalTransmissions)

    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyHIPAA('/ws', { json: true });
      const call = mockBuildHIPAAEvidence.mock.calls[0][0];
      expect(call.declaredPHITypes).toHaveLength(0);
      expect(call.externalTransmissions).toHaveLength(0);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('succeeds with empty chain when key file is present (empty-chain key-present branch)', async () => {
    const hexKey = 'e'.repeat(64);

    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT'))  // chain.jsonl
      .mockRejectedValueOnce(new Error('ENOENT'))  // governance-ir.json (analysis)
      .mockRejectedValueOnce(new Error('ENOENT'))  // governance-ir.json (PHI)
      .mockRejectedValueOnce(new Error('ENOENT'))  // governance-ir.json (transmissions)
      .mockResolvedValueOnce(hexKey);               // hmac.key — succeeds

    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const code = await runComplyHIPAA('/ws', { json: true });
      expect(code).toBe(0);
      expect(mockVerifyChainIntegrity).toHaveBeenCalledWith([], expect.any(Buffer));
    } finally {
      logSpy.mockRestore();
    }
  });

  it('renders FAIL and PARTIAL safeguards in text mode', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence({
      safeguards: [
        { safeguardId: '164.312(a)(1)', safeguardName: 'Access Control', status: 'fail', evidenceCount: 0, findings: [] },
        { safeguardId: '164.312(b)', safeguardName: 'Audit Controls', status: 'partial', evidenceCount: 1, findings: [{ id: 'F1' }] },
      ],
    }));

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyHIPAA('/ws', { json: false });
      const lines = logSpy.mock.calls.map((c) => String(c[0]));
      expect(lines.some((l) => l.includes('FAIL'))).toBe(true);
      expect(lines.some((l) => l.includes('PARTIAL'))).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });

  it('renders governance-ir with hipaa field but no hipaa object', async () => {
    const govIr = JSON.stringify({
      analysis: {
        violations: [], warnings: [],
        enforcementPlan: { blockedTools: [], requiredApprovals: [], auditOnlyRules: [], channelRedactions: [], ruleSuppressions: [] },
        reclassificationTable: [],
        effectiveR5Count: { derived: 0, overridden: 0, total: 0 },
      },
      hipaa: 'not-an-object',
    });

    mockReadFile
      .mockRejectedValueOnce(new Error('ENOENT'))  // chain.jsonl
      .mockResolvedValueOnce(govIr)                 // governance-ir.json (analysis)
      .mockResolvedValueOnce(govIr)                 // governance-ir.json (PHI types — hipaa is string, not object)
      .mockResolvedValueOnce(govIr);                // governance-ir.json (transmissions — same)

    mockVerifyChainIntegrity.mockReturnValue(CHAIN_VERIFY_OK);
    mockBuildHIPAAEvidence.mockReturnValue(makeHIPAAEvidence());

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await runComplyHIPAA('/ws', { json: true });
      const call = mockBuildHIPAAEvidence.mock.calls[0][0];
      expect(call.declaredPHITypes).toHaveLength(0);
      expect(call.externalTransmissions).toHaveLength(0);
    } finally {
      logSpy.mockRestore();
    }
  });
});
