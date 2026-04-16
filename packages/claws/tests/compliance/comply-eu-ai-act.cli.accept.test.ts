/**
 * L3: CLI acceptance — `claws comply eu-ai-act` command end-to-end.
 *
 * Runs the real claws binary as a subprocess on an initialized workspace.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { claws, initTempWorkspace } from '../accept/helpers.js';

describe('claws comply eu-ai-act', () => {
  let cleanup: () => void;

  afterEach(() => cleanup?.());

  it('produces JSON output with risk classification and article evaluations', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    // Inject EU AI Act config into claws.json
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
    expect(output.length).toBeGreaterThan(0);
    const assessment = JSON.parse(output) as Record<string, unknown>;

    expect(assessment['version']).toBe('1.0.0');
    expect(assessment['riskTier']).toBe('high');
    expect(assessment['annexIIICategory']).toBe('essential-services');
    expect(assessment['blocked']).toBe(false);

    const article13 = assessment['article13'] as Record<string, unknown>;
    expect(article13['status']).toBe('pass');

    const article14 = assessment['article14'] as Record<string, unknown>;
    expect(article14['status']).toBe('pass');

    const obligations = assessment['obligationChecklist'] as Array<Record<string, unknown>>;
    expect(obligations.length).toBe(7);
  });

  it('produces human-readable output without --json', async () => {
    const ws = await initTempWorkspace();
    cleanup = ws.cleanup;

    const r = await claws(['comply', 'eu-ai-act'], {
      cwd: ws.dir,
      timeout: 60_000,
    });

    expect(r.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    expect(r.stdout).toContain('EU AI Act Assessment Report');
    expect(r.stdout).toContain('Risk tier:');
    expect(r.stdout).toContain('Article 13');
    expect(r.stdout).toContain('Article 14');
  });
});
