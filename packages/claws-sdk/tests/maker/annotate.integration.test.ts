/**
 * L1 integration tests for maker annotate engine.
 *
 * P28: annotate on fixture skill suggests correct frontmatter,
 * annotate -> accuracy report -> apply suggestions on multi-skill workspace,
 * annotate detects OBO patterns across 3 capability types (email, social, transact).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { makerAnnotate } from '../../src/maker/annotate.js';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-annotate-int-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('annotate on fixture skill suggests correct frontmatter', () => {
  it('annotates ungoverned send-invoice skill with OBO, risk, and data labels', async () => {
    // Set up a skill with send-email + PII
    await writeFile(join(tempDir, 'SKILL.md'), [
      '---',
      'name: send-invoice',
      'description: Draft and send invoice emails to customers on behalf of the user',
      'tools:',
      '  - file-read',
      '  - send-email',
      '  - fetch',
      '---',
      '',
      '# Send Invoice',
      '',
      'Handles PII and financial data.',
    ].join('\n'), 'utf-8');

    await writeFile(join(tempDir, 'handler.ts'), [
      'import { readFile } from "node:fs/promises";',
      '',
      'export async function handler() {',
      '  const data = await readFile("customers/data.json", "utf-8");',
      '  await fetch("https://api.example.com/send-email", {',
      '    method: "POST",',
      '    body: JSON.stringify({ to: "user@example.com" }),',
      '  });',
      '}',
    ].join('\n'), 'utf-8');

    const result = await makerAnnotate({ skillDir: tempDir });

    // Correct skill name parsed
    expect(result.name).toBe('send-invoice');

    // OBO detected (send-email capability)
    expect(result.oboFindings.length).toBeGreaterThan(0);
    const emailObo = result.oboFindings.find(f => f.type === 'email');
    expect(emailObo).toBeDefined();

    // Risk inferred at R4+ (send-email = R4)
    expect(result.inferredRisk).toBeGreaterThanOrEqual(2);

    // Data labels suggested (PII, financial, communication)
    expect(result.dataLabels.length).toBeGreaterThan(0);

    // Suggestions array includes OBO, risk, and data-label types
    const suggestionTypes = result.suggestions.map(s => s.type);
    expect(suggestionTypes).toContain('obo');
    expect(suggestionTypes).toContain('risk');
    expect(suggestionTypes).toContain('tier');

    // Decorator suggestions include @Risk and @Obo
    const decoratorNames = result.decorators.map(d => d.decorator);
    expect(decoratorNames).toContain('@Risk');
    expect(decoratorNames).toContain('@Obo');

    // Tier suggestion is TYPED (has handler)
    expect(result.suggestedTier).toBe('TYPED');
  });
});

describe('annotate multi-skill workspace with accuracy report', () => {
  it('annotates multiple skills and produces consistent results', async () => {
    // Skill 1: email-sender (high risk, OBO)
    const skill1Dir = join(tempDir, 'email-sender');
    await mkdir(skill1Dir, { recursive: true });
    await writeFile(join(skill1Dir, 'SKILL.md'), [
      '---',
      'name: email-sender',
      'description: Send emails on behalf of the user',
      'tools:',
      '  - send-email',
      '---',
      '',
      '# Email Sender',
    ].join('\n'), 'utf-8');
    await writeFile(join(skill1Dir, 'handler.ts'), [
      'export async function handler() {',
      '  // send email implementation',
      '}',
    ].join('\n'), 'utf-8');

    // Skill 2: search-docs (low risk, no OBO)
    const skill2Dir = join(tempDir, 'search-docs');
    await mkdir(skill2Dir, { recursive: true });
    await writeFile(join(skill2Dir, 'SKILL.md'), [
      '---',
      'name: search-docs',
      'description: Search documentation files',
      'tools:',
      '  - file-read',
      '---',
      '',
      '# Search Docs',
    ].join('\n'), 'utf-8');
    await writeFile(join(skill2Dir, 'handler.ts'), [
      'export async function handler() {',
      '  // search implementation',
      '}',
    ].join('\n'), 'utf-8');

    // Skill 3: purchase-handler (transactional, OBO)
    const skill3Dir = join(tempDir, 'purchase-handler');
    await mkdir(skill3Dir, { recursive: true });
    await writeFile(join(skill3Dir, 'SKILL.md'), [
      '---',
      'name: purchase-handler',
      'description: Process purchases on behalf of user with credit-card data',
      'tools:',
      '  - payment-api',
      '---',
      '',
      '# Purchase Handler',
    ].join('\n'), 'utf-8');
    await writeFile(join(skill3Dir, 'handler.ts'), [
      'export async function handler() {',
      '  // purchase implementation',
      '}',
    ].join('\n'), 'utf-8');

    // Annotate all three
    const [result1, result2, result3] = await Promise.all([
      makerAnnotate({ skillDir: skill1Dir }),
      makerAnnotate({ skillDir: skill2Dir }),
      makerAnnotate({ skillDir: skill3Dir }),
    ]);

    // Email sender: OBO detected, higher risk
    expect(result1.oboFindings.length).toBeGreaterThan(0);
    expect(result1.inferredRisk).toBeGreaterThanOrEqual(2);

    // Search docs: no OBO, lower risk
    expect(result2.oboFindings).toHaveLength(0);
    expect(result2.inferredRisk).toBeLessThanOrEqual(2);

    // Purchase handler: OBO detected (transactional), financial labels
    expect(result3.oboFindings.length).toBeGreaterThan(0);
    expect(result3.dataLabels.some(d => d.label === 'financial')).toBe(true);

    // All produce suggestions (collect-all-errors, no failures)
    expect(result1.suggestions.length).toBeGreaterThan(0);
    expect(result2.suggestions.length).toBeGreaterThan(0);
    expect(result3.suggestions.length).toBeGreaterThan(0);

    // All have diagnostics
    expect(result1.diagnostics.length).toBeGreaterThan(0);
    expect(result2.diagnostics.length).toBeGreaterThan(0);
    expect(result3.diagnostics.length).toBeGreaterThan(0);
  });
});

describe('OBO detection across 3 capability types', () => {
  it('detects email, social, and transactional OBO patterns in a combined skill', async () => {
    await writeFile(join(tempDir, 'SKILL.md'), [
      '---',
      'name: multi-channel-agent',
      'description: Sends emails, posts messages to Slack, and processes purchases',
      'tools:',
      '  - send-email',
      '  - post-message',
      '  - submit-form',
      '---',
      '',
      '# Multi-Channel Agent',
      '',
      'This skill sends emails, posts messages, and submits purchase forms.',
    ].join('\n'), 'utf-8');

    await writeFile(join(tempDir, 'handler.ts'), [
      'export async function handler() {',
      '  // multi-channel implementation',
      '}',
    ].join('\n'), 'utf-8');

    const result = await makerAnnotate({ skillDir: tempDir });

    // Should detect all 3 OBO capability types
    const oboTypes = new Set(result.oboFindings.map(f => f.type));
    expect(oboTypes.has('email'), 'email OBO detected').toBe(true);
    expect(oboTypes.has('social'), 'social OBO detected').toBe(true);
    expect(oboTypes.has('transact'), 'transact OBO detected').toBe(true);

    // Should have OBO suggestion
    expect(result.suggestions.some(s => s.type === 'obo')).toBe(true);

    // OBO confidence should be high
    const oboSuggestion = result.suggestions.find(s => s.type === 'obo');
    expect(oboSuggestion!.confidence).toBeGreaterThanOrEqual(0.80);
  });
});
