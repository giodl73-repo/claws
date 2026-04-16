/**
 * `claws comply` commands — produce compliance evidence.
 *
 * Thin CLI adapters: read audit chain, run evidence builders,
 * render results. No business logic lives here.
 *
 * @module claws-cli/commands/comply
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { CLAWS_SIDECAR_LAYOUT } from '@bic/claws-sdk/types';

/**
 * Read the HMAC audit signing key from disk.
 *
 * Reads `.claws/keys/hmac.key` (hex-encoded 32-byte key).
 * Throws a clear error if the key file is missing — the CLI must
 * never silently fall back to a zero key.
 */
async function readAuditKeyFromDisk(workspaceRoot: string): Promise<Buffer> {
  const keyPath = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.keys, 'hmac.key');
  try {
    const hex = await readFile(keyPath, 'utf-8');
    return Buffer.from(hex.trim(), 'hex');
  } catch {
    throw new Error(
      'No audit key found — run `claws init` first to generate signing keys.',
    );
  }
}
import { verifyChainIntegrity } from '@bic/claws-sdk/audit';
import type { ChainEntry, ChainVerifyResult } from '@bic/claws-sdk/audit';
import { buildSOC2Evidence, buildHIPAAEvidence } from '@bic/claws-sdk/compliance';
import type { DeclaredPHIType, ExternalTransmission } from '@bic/claws-sdk/compliance';
import type { GovAnalysis } from '@bic/claws-sdk/ir';

/**
 * Read audit chain entries from disk.
 */
async function readChainFromDisk(workspaceRoot: string): Promise<ChainEntry[]> {
  const chainPath = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.audit, 'chain.jsonl');
  try {
    const content = await readFile(chainPath, 'utf-8');
    return content
      .trim()
      .split('\n')
      .filter((l) => l.length > 0)
      .map((l) => JSON.parse(l) as ChainEntry);
  } catch {
    return [];
  }
}

/**
 * Read GovAnalysis from the compiled governance IR on disk.
 */
async function readAnalysisFromDisk(workspaceRoot: string): Promise<GovAnalysis> {
  const irPath = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.compiled, 'governance-ir.json');
  try {
    const content = await readFile(irPath, 'utf-8');
    const ir = JSON.parse(content) as Record<string, unknown>;
    if (ir['analysis'] && typeof ir['analysis'] === 'object') {
      return ir['analysis'] as GovAnalysis;
    }
  } catch {
    // Fall through to empty analysis
  }

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

/**
 * Run `claws comply soc2`.
 *
 * Reads audit chain and governance analysis from disk, builds SOC2
 * evidence, and outputs the result as JSON.
 *
 * @returns exit code (0 = pass, 1 = fail/partial)
 */
export async function runComplySOC2(
  workspaceRoot: string,
  options: {
    json: boolean;
    observationStart?: string;
    observationEnd?: string;
  },
): Promise<number> {
  const chainEntries = await readChainFromDisk(workspaceRoot);
  const analysis = await readAnalysisFromDisk(workspaceRoot);

  // Derive observation period from chain if not specified
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const observationStart = options.observationStart ?? sixMonthsAgo.toISOString();
  const observationEnd = options.observationEnd ?? now.toISOString();

  // Verify chain integrity — only read key when there are entries to verify
  // Read audit key — required when chain has entries, optional otherwise
  let chainVerifyResult: ChainVerifyResult;
  if (chainEntries.length > 0) {
    const auditKey = await readAuditKeyFromDisk(workspaceRoot);
    chainVerifyResult = verifyChainIntegrity(chainEntries, auditKey);
  } else {
    // No chain entries — try to read key for consistency, fall back gracefully
    let auditKey: Buffer;
    try {
      auditKey = await readAuditKeyFromDisk(workspaceRoot);
    } catch {
      // No key and no chain entries — workspace has no audit data yet
      auditKey = Buffer.alloc(32);
    }
    chainVerifyResult = verifyChainIntegrity([], auditKey);
  }

  const evidence = buildSOC2Evidence({
    scope: workspaceRoot,
    analysis,
    chainEntries,
    chainVerifyResult,
    observationStart,
    observationEnd,
  });

  if (options.json) {
    console.log(JSON.stringify(evidence, null, 2));
  } else {
    console.log(`SOC2 Type II Evidence Report`);
    console.log(`${'='.repeat(40)}`);
    console.log(`Scope: ${evidence.scope}`);
    console.log(`Generated: ${evidence.generatedAt}`);
    console.log(`Observation: ${evidence.observationPeriodStart} — ${evidence.observationPeriodEnd}`);
    console.log(`Observation valid: ${evidence.observationPeriodValid ? 'yes' : 'NO (< 6 months)'}`);
    console.log(`Overall: ${evidence.overallStatus.toUpperCase()}`);
    console.log(`Evidence count: ${evidence.totalEvidenceCount}`);
    console.log('');

    for (const ctrl of evidence.controls) {
      const icon = ctrl.status === 'pass' ? 'PASS' : ctrl.status === 'fail' ? 'FAIL' : 'PARTIAL';
      console.log(`  ${ctrl.controlId} ${ctrl.controlName}: ${icon} (${ctrl.evidenceCount} events, ${ctrl.findings.length} findings)`);
    }

    if (evidence.findings.length > 0) {
      console.log('');
      console.log('Top-level findings:');
      for (const f of evidence.findings) {
        console.log(`  [${f.severity.toUpperCase()}] ${f.title}`);
      }
    }
  }

  return evidence.overallStatus === 'pass' ? 0 : 1;
}

/**
 * Read declared PHI types from the HIPAA policy files on disk.
 */
async function readDeclaredPHITypes(workspaceRoot: string): Promise<DeclaredPHIType[]> {
  const policyDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.compiled);
  try {
    const content = await readFile(join(policyDir, 'governance-ir.json'), 'utf-8');
    const ir = JSON.parse(content) as Record<string, unknown>;
    if (ir['hipaa'] && typeof ir['hipaa'] === 'object') {
      const hipaa = ir['hipaa'] as Record<string, unknown>;
      if (Array.isArray(hipaa['declaredPHITypes'])) {
        return hipaa['declaredPHITypes'] as DeclaredPHIType[];
      }
    }
  } catch {
    // Fall through to empty
  }
  return [];
}

/**
 * Read external transmissions from governance IR on disk.
 */
async function readExternalTransmissions(workspaceRoot: string): Promise<ExternalTransmission[]> {
  const policyDir = join(workspaceRoot, CLAWS_SIDECAR_LAYOUT.compiled);
  try {
    const content = await readFile(join(policyDir, 'governance-ir.json'), 'utf-8');
    const ir = JSON.parse(content) as Record<string, unknown>;
    if (ir['hipaa'] && typeof ir['hipaa'] === 'object') {
      const hipaa = ir['hipaa'] as Record<string, unknown>;
      if (Array.isArray(hipaa['externalTransmissions'])) {
        return hipaa['externalTransmissions'] as ExternalTransmission[];
      }
    }
  } catch {
    // Fall through to empty
  }
  return [];
}

/**
 * Run `claws comply hipaa`.
 *
 * Reads audit chain, governance analysis, PHI declarations, and
 * external transmissions from disk. Builds HIPAA evidence and outputs
 * the result as JSON or human-readable text.
 *
 * @returns exit code (0 = pass, 1 = fail/partial)
 */
export async function runComplyHIPAA(
  workspaceRoot: string,
  options: {
    json: boolean;
  },
): Promise<number> {
  const chainEntries = await readChainFromDisk(workspaceRoot);
  const analysis = await readAnalysisFromDisk(workspaceRoot);
  const declaredPHITypes = await readDeclaredPHITypes(workspaceRoot);
  const externalTransmissions = await readExternalTransmissions(workspaceRoot);

  // Read audit key — required when chain has entries, optional otherwise
  let chainVerifyResult: ChainVerifyResult;
  if (chainEntries.length > 0) {
    const auditKey = await readAuditKeyFromDisk(workspaceRoot);
    chainVerifyResult = verifyChainIntegrity(chainEntries, auditKey);
  } else {
    let auditKey: Buffer;
    try {
      auditKey = await readAuditKeyFromDisk(workspaceRoot);
    } catch {
      auditKey = Buffer.alloc(32);
    }
    chainVerifyResult = verifyChainIntegrity([], auditKey);
  }

  const evidence = buildHIPAAEvidence({
    scope: workspaceRoot,
    analysis,
    chainEntries,
    chainVerifyResult,
    declaredPHITypes,
    externalTransmissions,
  });

  if (options.json) {
    console.log(JSON.stringify(evidence, null, 2));
  } else {
    console.log(`HIPAA Security Rule Evidence Report`);
    console.log(`${'='.repeat(40)}`);
    console.log(`Scope: ${evidence.scope}`);
    console.log(`Generated: ${evidence.generatedAt}`);
    console.log(`Overall: ${evidence.overallStatus.toUpperCase()}`);
    console.log(`Evidence count: ${evidence.totalEvidenceCount}`);
    console.log('');

    console.log('Safeguards:');
    for (const sg of evidence.safeguards) {
      const icon = sg.status === 'pass' ? 'PASS' : sg.status === 'fail' ? 'FAIL' : 'PARTIAL';
      console.log(`  ${sg.safeguardId} ${sg.safeguardName}: ${icon} (${sg.evidenceCount} events, ${sg.findings.length} findings)`);
    }

    const coveredCount = evidence.phiCoverage.filter((c) => c.labelCovered).length;
    console.log('');
    console.log(`PHI Coverage: ${coveredCount}/${evidence.phiCoverage.length} identifiers covered`);

    if (evidence.transmissionGaps.length > 0) {
      console.log('');
      console.log('Transmission Gaps:');
      for (const gap of evidence.transmissionGaps) {
        console.log(`  ${gap.toolName} -> ${gap.destination} (encryption: ${gap.hasEncryption ? 'yes' : 'NO'}, integrity: ${gap.hasIntegrity ? 'yes' : 'NO'})`);
      }
    }

    if (evidence.findings.length > 0) {
      console.log('');
      console.log('Top-level findings:');
      for (const f of evidence.findings) {
        console.log(`  [${f.severity.toUpperCase()}] ${f.title}`);
      }
    }
  }

  return evidence.overallStatus === 'pass' ? 0 : 1;
}
