/**
 * L1 integration tests for governance templates.
 *
 * 4 tests — init --template on empty workspace for each template.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { initWorkspace, TemplateNotFoundError } from '@bic/claws-sdk/init';
import { CLAWS_SIDECAR_LAYOUT, CLAWS_CONFIG_FILE } from '@bic/claws-sdk/types';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-tpl-int-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('init --template integration', () => {
  it('minimal template creates claws.json with trust tier only, no policy files', async () => {
    const result = await initWorkspace(tempDir, { template: 'minimal' });

    expect(result.exitCode).toBe(0);
    expect(result.templateApplied).toBe('minimal');
    expect(result.policyFiles).toHaveLength(0);

    // claws.json has the template field
    const configRaw = await readFile(join(tempDir, CLAWS_CONFIG_FILE), 'utf-8');
    const config = JSON.parse(configRaw);
    expect(config.template).toBe('minimal');
    expect(config.trustTier).toBe(2);

    // policies directory exists but is empty
    const policiesDir = join(tempDir, CLAWS_SIDECAR_LAYOUT.policies);
    const s = await stat(policiesDir);
    expect(s.isDirectory()).toBe(true);
    const files = await readdir(policiesDir);
    expect(files).toHaveLength(0);
  });

  it('soc2 template creates claws.json with soc2 config and 5 policy files', async () => {
    await writeFile(join(tempDir, 'package.json'), '{}', 'utf-8');
    const result = await initWorkspace(tempDir, { template: 'soc2' });

    expect(result.exitCode).toBe(0);
    expect(result.templateApplied).toBe('soc2');
    expect(result.policyFiles).toHaveLength(5);

    // claws.json has template field
    const configRaw = await readFile(join(tempDir, CLAWS_CONFIG_FILE), 'utf-8');
    const config = JSON.parse(configRaw);
    expect(config.template).toBe('soc2');

    // All 5 policy files exist in .claws/policies/
    const policiesDir = join(tempDir, CLAWS_SIDECAR_LAYOUT.policies);
    const files = await readdir(policiesDir);
    expect(files).toHaveLength(5);
    expect(files).toContain('require_section.yaml');
    expect(files).toContain('tool_blocklist.yaml');
    expect(files).toContain('trust_tier_gate.yaml');
    expect(files).toContain('pii_detection.yaml');
    expect(files).toContain('budget_ceiling.yaml');

    // Each file is valid YAML-ish (starts with comment, has policy: key)
    for (const f of files) {
      const content = await readFile(join(policiesDir, f), 'utf-8');
      expect(content).toMatch(/^#/);
      expect(content).toContain('policy:');
    }
  });

  it('hipaa template creates HIPAA-specific policies with PHI detection and data labeling', async () => {
    const result = await initWorkspace(tempDir, { template: 'hipaa' });

    expect(result.exitCode).toBe(0);
    expect(result.templateApplied).toBe('hipaa');
    expect(result.policyFiles).toHaveLength(4);

    const policiesDir = join(tempDir, CLAWS_SIDECAR_LAYOUT.policies);
    const files = await readdir(policiesDir);
    expect(files).toHaveLength(4);
    expect(files).toContain('data_labeling_mandatory.yaml');
    expect(files).toContain('phi_detection.yaml');
    expect(files).toContain('audit_mandatory.yaml');
    expect(files).toContain('access_control.yaml');

    // PHI detection content has HIPAA identifiers
    const phiContent = await readFile(join(policiesDir, 'phi_detection.yaml'), 'utf-8');
    expect(phiContent).toContain('framework: hipaa');
    expect(phiContent).toContain('HIPAA identifier');

    // Data labeling has required controls
    const labelContent = await readFile(join(policiesDir, 'data_labeling_mandatory.yaml'), 'utf-8');
    expect(labelContent).toContain('encryption_at_rest');
    expect(labelContent).toContain('phi');
  });

  it('eu-ai-act template creates EU AI Act policies with risk classification and oversight', async () => {
    const result = await initWorkspace(tempDir, { template: 'eu-ai-act' });

    expect(result.exitCode).toBe(0);
    expect(result.templateApplied).toBe('eu-ai-act');
    expect(result.policyFiles).toHaveLength(3);

    const policiesDir = join(tempDir, CLAWS_SIDECAR_LAYOUT.policies);
    const files = await readdir(policiesDir);
    expect(files).toHaveLength(3);
    expect(files).toContain('risk_classification_mandatory.yaml');
    expect(files).toContain('human_oversight_gates.yaml');
    expect(files).toContain('transparency.yaml');

    // Risk classification has Article 6 categories
    const riskContent = await readFile(join(policiesDir, 'risk_classification_mandatory.yaml'), 'utf-8');
    expect(riskContent).toContain('high-risk');
    expect(riskContent).toContain('unacceptable');
    expect(riskContent).toContain('framework: eu-ai-act');

    // Human oversight has Article 14 gates
    const oversightContent = await readFile(join(policiesDir, 'human_oversight_gates.yaml'), 'utf-8');
    expect(oversightContent).toContain('require_human_approval');
  });

  it('unknown template throws TemplateNotFoundError', async () => {
    await expect(
      initWorkspace(tempDir, { template: 'nonexistent' }),
    ).rejects.toThrow(TemplateNotFoundError);
  });
});
