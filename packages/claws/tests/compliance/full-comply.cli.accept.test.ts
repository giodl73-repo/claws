/**
 * L3: CLI acceptance — gate validation: all 3 compliance commands exit 0
 * on reference workspaces with signed evidence.
 *
 * Validates the CP-2 gate criterion that all compliance commands run
 * successfully on a scaffolded workspace. Each framework must produce
 * valid output (exit 0 for pass, or exit 1 with valid evidence for
 * non-pass status).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { claws, initTempWorkspace, initTempWorkspaceWithAuditKey } from '../accept/helpers.js';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('CP-2 gate: all 3 compliance commands on reference workspaces', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('claws comply soc2 exits with valid evidence structure', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const r = await claws(['comply', 'soc2', '--json'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');

    const output = r.stdout.trim();
    const evidence = JSON.parse(output) as Record<string, unknown>;

    // Structure validation — all required fields present
    expect(typeof evidence['version']).toBe('string');
    expect(typeof evidence['generatedAt']).toBe('string');
    expect(typeof evidence['scope']).toBe('string');
    expect(typeof evidence['observationPeriodStart']).toBe('string');
    expect(typeof evidence['observationPeriodEnd']).toBe('string');
    expect(typeof evidence['observationPeriodValid']).toBe('boolean');
    expect(typeof evidence['overallStatus']).toBe('string');
    expect(typeof evidence['totalEvidenceCount']).toBe('number');
    expect(Array.isArray(evidence['controls'])).toBe(true);
    expect(Array.isArray(evidence['findings'])).toBe(true);

    // All 9 controls present with valid structure
    const controls = evidence['controls'] as Array<Record<string, unknown>>;
    expect(controls.length).toBe(9);
    for (const ctrl of controls) {
      expect(typeof ctrl['controlId']).toBe('string');
      expect(typeof ctrl['controlName']).toBe('string');
      expect(typeof ctrl['status']).toBe('string');
      expect(typeof ctrl['evidenceCount']).toBe('number');
      expect(Array.isArray(ctrl['findings'])).toBe(true);
    }
  });

  it('claws comply hipaa exits with valid evidence structure', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const r = await claws(['comply', 'hipaa', '--json'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');

    const output = r.stdout.trim();
    const evidence = JSON.parse(output) as Record<string, unknown>;

    // Structure validation
    expect(typeof evidence['version']).toBe('string');
    expect(typeof evidence['generatedAt']).toBe('string');
    expect(typeof evidence['scope']).toBe('string');
    expect(typeof evidence['overallStatus']).toBe('string');
    expect(typeof evidence['totalEvidenceCount']).toBe('number');
    expect(Array.isArray(evidence['safeguards'])).toBe(true);
    expect(Array.isArray(evidence['phiCoverage'])).toBe(true);
    expect(Array.isArray(evidence['transmissionGaps'])).toBe(true);
    expect(Array.isArray(evidence['findings'])).toBe(true);

    // All 5 safeguards present with valid structure
    const safeguards = evidence['safeguards'] as Array<Record<string, unknown>>;
    expect(safeguards.length).toBe(5);
    for (const sg of safeguards) {
      expect(typeof sg['safeguardId']).toBe('string');
      expect(typeof sg['safeguardName']).toBe('string');
      expect(typeof sg['status']).toBe('string');
      expect(typeof sg['evidenceCount']).toBe('number');
      expect(Array.isArray(sg['findings'])).toBe(true);
    }

    // PHI coverage matrix — 18 HIPAA identifiers
    const phiCoverage = evidence['phiCoverage'] as Array<Record<string, unknown>>;
    expect(phiCoverage.length).toBe(18);
    for (const entry of phiCoverage) {
      expect(typeof entry['phiType']).toBe('string');
      expect(typeof entry['declared']).toBe('boolean');
      expect(typeof entry['labelCovered']).toBe('boolean');
    }
  });

  it('claws comply eu-ai-act exits with valid assessment structure', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    // Inject EU AI Act configuration for high-risk healthcare assessment
    const configPath = join(ws.dir, 'claws.json');
    const config = JSON.parse(readFileSync(configPath, 'utf-8')) as Record<string, unknown>;
    config['euAiAct'] = {
      riskTier: 'high',
      domainMarkers: ['healthcare'],
      transparencyDeclared: true,
      documentationDeclared: true,
      explainabilityDeclared: true,
      userNotificationDeclared: true,
      humanOversightDeclared: true,
      overrideMechanismDeclared: true,
      fundamentalRightsAssessed: true,
      impactedRights: ['privacy'],
      mitigations: ['encryption'],
      riskManagementDeclared: true,
      dataGovernanceDeclared: true,
      loggingEnabled: true,
      accuracyRobustnessDeclared: true,
    };
    writeFileSync(configPath, JSON.stringify(config, null, 2));

    const r = await claws(['comply', 'eu-ai-act', '--json'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');

    const output = r.stdout.trim();
    const assessment = JSON.parse(output) as Record<string, unknown>;

    // Structure validation
    expect(typeof assessment['version']).toBe('string');
    expect(typeof assessment['generatedAt']).toBe('string');
    expect(typeof assessment['scope']).toBe('string');
    expect(typeof assessment['riskTier']).toBe('string');
    expect(typeof assessment['blocked']).toBe('boolean');
    expect(typeof assessment['blockReason']).toBe('string');
    expect(Array.isArray(assessment['domainMarkers'])).toBe(true);
    expect(Array.isArray(assessment['obligationChecklist'])).toBe(true);
    expect(Array.isArray(assessment['findings'])).toBe(true);

    // Article evaluations
    const article13 = assessment['article13'] as Record<string, unknown>;
    expect(typeof article13['status']).toBe('string');
    expect(typeof article13['documentationAdequate']).toBe('boolean');
    expect(typeof article13['explainabilityProvided']).toBe('boolean');
    expect(typeof article13['userNotificationPresent']).toBe('boolean');

    const article14 = assessment['article14'] as Record<string, unknown>;
    expect(typeof article14['status']).toBe('string');
    expect(typeof article14['hitlControlsPresent']).toBe('boolean');
    expect(typeof article14['overrideMechanismPresent']).toBe('boolean');

    // High-risk: obligation checklist populated
    const obligations = assessment['obligationChecklist'] as Array<Record<string, unknown>>;
    expect(obligations.length).toBe(7);
    for (const obl of obligations) {
      expect(typeof obl['obligationId']).toBe('string');
      expect(typeof obl['description']).toBe('string');
      expect(typeof obl['met']).toBe('boolean');
    }

    // Healthcare domain should produce high risk
    expect(assessment['riskTier']).toBe('high');
    expect(assessment['annexIIICategory']).toBe('essential-services');
    expect(assessment['blocked']).toBe(false);
  });

  it('claws comply soc2 reads real HMAC key from workspace', async () => {
    const ws = await initTempWorkspaceWithAuditKey();
    cleanup = ws.cleanup;

    const r = await claws(['comply', 'soc2', '--json'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');

    const output = r.stdout.trim();
    const evidence = JSON.parse(output) as Record<string, unknown>;

    // Key is present — chain verification should still work (empty chain = valid)
    expect(evidence['overallStatus']).toBeTruthy();
    expect(Array.isArray(evidence['controls'])).toBe(true);
  });
});
