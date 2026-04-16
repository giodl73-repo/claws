/**
 * L0 unit tests for maker annotate engine.
 *
 * P28: OBO detection from send-email capability, risk inference from tool
 * patterns, data label suggestion, collect-all-errors for frontmatter.
 */

import { describe, it, expect } from 'vitest';

import {
  detectOboCapabilities,
  inferRiskLevel,
  suggestDataLabels,
} from '@bic/claws-sdk/maker';
import type { MakerAnnotateResult } from '@bic/claws-sdk/maker';
import { makerAnnotate } from '../../src/maker/annotate.js';

describe('OBO detection from send-email capability', () => {
  it('detects send-email as email OBO capability', () => {
    const findings = detectOboCapabilities('send-email tool for drafting messages');
    expect(findings.length).toBeGreaterThan(0);
    const emailFinding = findings.find(f => f.type === 'email');
    expect(emailFinding).toBeDefined();
    expect(emailFinding!.pattern).toBe('send-email');
    expect(emailFinding!.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('detects post-message as social OBO capability', () => {
    const findings = detectOboCapabilities('post-message to Slack channel');
    expect(findings.length).toBeGreaterThan(0);
    const socialFinding = findings.find(f => f.type === 'social');
    expect(socialFinding).toBeDefined();
    expect(socialFinding!.pattern).toBe('post-message');
  });

  it('detects purchase as transactional OBO capability', () => {
    const findings = detectOboCapabilities('purchasing items from catalog');
    expect(findings.length).toBeGreaterThan(0);
    const transactFinding = findings.find(f => f.type === 'transact');
    expect(transactFinding).toBeDefined();
    expect(transactFinding!.pattern).toBe('purchase');
  });

  it('returns empty findings for read-only capability', () => {
    const findings = detectOboCapabilities('search-docs read-only lookup');
    expect(findings).toHaveLength(0);
  });

  it('detects submit-form as transactional OBO capability', () => {
    const findings = detectOboCapabilities('submit-form for checkout');
    const transactFinding = findings.find(f => f.type === 'transact');
    expect(transactFinding).toBeDefined();
    expect(transactFinding!.pattern).toBe('submit-form');
  });

  it('detects notification as social OBO capability', () => {
    const findings = detectOboCapabilities('send notification to team channel');
    expect(findings.some(f => f.type === 'social')).toBe(true);
  });

  it('detects payment as transactional OBO capability', () => {
    const findings = detectOboCapabilities('process payment for subscription');
    expect(findings.some(f => f.type === 'transact')).toBe(true);
  });

  it('detects mail keyword as email OBO capability', () => {
    const findings = detectOboCapabilities('check mail inbox');
    expect(findings.some(f => f.type === 'email')).toBe(true);
  });

  it('detects tweet as social OBO capability', () => {
    const findings = detectOboCapabilities('post a tweet');
    expect(findings.some(f => f.type === 'social')).toBe(true);
  });

  it('detects order as transactional OBO capability', () => {
    const findings = detectOboCapabilities('place an order for items');
    expect(findings.some(f => f.type === 'transact')).toBe(true);
  });

  it('deduplicates findings by type:label key', () => {
    const findings = detectOboCapabilities('send-email send-email send-email');
    const emailFindings = findings.filter(f => f.pattern === 'send-email');
    expect(emailFindings).toHaveLength(1);
  });
});

describe('risk inference from tool patterns', () => {
  it('infers R4 for send-email pattern', () => {
    const risk = inferRiskLevel('send-email tool sends emails to users');
    expect(risk).toBe(4);
  });

  it('infers R5 for shell exec pattern', () => {
    const risk = inferRiskLevel('child_process.exec("npm install")');
    expect(risk).toBe(5);
  });

  it('infers R2 for file read pattern', () => {
    const risk = inferRiskLevel('fs.readFile for data lookup');
    expect(risk).toBe(2);
  });

  it('infers R1 for pure read-only pattern', () => {
    const risk = inferRiskLevel('search documents and list results');
    expect(risk).toBe(1);
  });

  it('returns R1 for text with no matching patterns', () => {
    const risk = inferRiskLevel('completely unrecognized capability');
    expect(risk).toBe(1);
  });

  it('infers R4 for browser control pattern', () => {
    const risk = inferRiskLevel('browser control with puppeteer automation');
    expect(risk).toBeGreaterThanOrEqual(4);
  });

  it('infers R3 for file write pattern', () => {
    const risk = inferRiskLevel('fs.writeFile to store data');
    expect(risk).toBe(3);
  });

  it('infers R4 for delete pattern', () => {
    const risk = inferRiskLevel('delete records from database');
    expect(risk).toBe(4);
  });

  it('infers R5 for deploy pattern', () => {
    const risk = inferRiskLevel('deploy application to production');
    expect(risk).toBe(5);
  });

  it('infers R3 for update pattern', () => {
    const risk = inferRiskLevel('update configuration settings');
    expect(risk).toBeGreaterThanOrEqual(3);
  });

  it('infers R3 for create pattern', () => {
    const risk = inferRiskLevel('create new resource in API');
    expect(risk).toBe(3);
  });

  it('higher risk wins when competitive weight', () => {
    // Both search (R1) and delete (R4) present — R4 should win
    const risk = inferRiskLevel('search and delete matching files');
    expect(risk).toBeGreaterThanOrEqual(4);
  });
});

describe('data label suggestion', () => {
  it('suggests pii label from PII reference', () => {
    const labels = suggestDataLabels('handles pii customer data');
    expect(labels.some(l => l.label === 'pii')).toBe(true);
  });

  it('suggests financial label from payment reference', () => {
    const labels = suggestDataLabels('processes credit-card payment information');
    expect(labels.some(l => l.label === 'financial')).toBe(true);
  });

  it('suggests communication label from email reference', () => {
    const labels = suggestDataLabels('drafts email messages for users');
    expect(labels.some(l => l.label === 'communication')).toBe(true);
  });

  it('suggests secrets label from credential reference', () => {
    const labels = suggestDataLabels('uses api-key for authentication');
    expect(labels.some(l => l.label === 'secrets')).toBe(true);
  });

  it('returns empty for generic text', () => {
    const labels = suggestDataLabels('a simple utility tool');
    expect(labels).toHaveLength(0);
  });

  it('deduplicates labels', () => {
    const labels = suggestDataLabels('email e-mail email');
    const commLabels = labels.filter(l => l.label === 'communication');
    expect(commLabels).toHaveLength(1);
  });

  it('suggests health label from HIPAA reference', () => {
    const labels = suggestDataLabels('handles HIPAA protected health information');
    expect(labels.some(l => l.label === 'health')).toBe(true);
  });

  it('suggests file-access label from readFile reference', () => {
    const labels = suggestDataLabels('uses readFile to load configuration');
    expect(labels.some(l => l.label === 'file-access')).toBe(true);
  });

  it('suggests web-session label from browser/cookie reference', () => {
    const labels = suggestDataLabels('manages browser cookie session data');
    expect(labels.some(l => l.label === 'web-session')).toBe(true);
  });
});

describe('OBO detection fallback to annotate engine', () => {
  it('detects OBO from description via annotate engine when no capability patterns match', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'claws-annotate-fallback-'));
    try {
      // Use a description with "on behalf of" which triggers detectObo
      // but no capability patterns like send-email/post-message
      await writeFile(join(dir, 'SKILL.md'), [
        '---',
        'name: proxy-agent',
        'description: Acts on behalf of the user to manage tasks',
        '---',
        '',
        '# Proxy Agent',
        '',
        'This agent acts on behalf of the user.',
      ].join('\n'), 'utf-8');

      await writeFile(join(dir, 'handler.ts'), [
        'export async function handler() {',
        '  // proxy implementation',
        '}',
      ].join('\n'), 'utf-8');

      const result = await makerAnnotate({ skillDir: dir });

      // Should detect OBO via annotate engine fallback (on behalf of)
      expect(result.oboFindings.length).toBeGreaterThan(0);
      // The general type is assigned when fallback triggers
      expect(result.oboFindings.some(f => f.type === 'general')).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('annotate with missing description field', () => {
  it('handles SKILL.md with no description field', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'claws-annotate-nodesc-'));
    try {
      await writeFile(join(dir, 'SKILL.md'), [
        '---',
        'name: no-desc-skill',
        '---',
        '',
        '# No Description Skill',
      ].join('\n'), 'utf-8');

      await writeFile(join(dir, 'handler.ts'), [
        'export async function handler() {',
        '  return "ok";',
        '}',
      ].join('\n'), 'utf-8');

      const result = await makerAnnotate({ skillDir: dir });

      // Should not crash — description ?? '' handles it
      expect(result.name).toBe('no-desc-skill');
      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.suggestedTier).toBe('TYPED');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('collect-all-errors for frontmatter', () => {
  it('produces multiple diagnostics in a single pass', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'claws-annotate-collect-'));
    try {
      // Write a skill with multiple analyzable aspects
      await writeFile(join(dir, 'SKILL.md'), [
        '---',
        'name: send-invoice',
        'description: Send invoices via email with payment data',
        'tools:',
        '  - send-email',
        '  - fetch',
        '---',
        '',
        '# Send Invoice',
        'Handles PII and financial data.',
      ].join('\n'), 'utf-8');

      await writeFile(join(dir, 'handler.ts'), [
        'export async function handler() {',
        '  await fetch("https://api.example.com/send");',
        '}',
      ].join('\n'), 'utf-8');

      const result = await makerAnnotate({ skillDir: dir });

      // Should have multiple diagnostics (obo, risk, data-label, decorator)
      expect(result.diagnostics.length).toBeGreaterThan(3);

      // Should have diagnostics from different sources
      const sources = new Set(result.diagnostics.map(d => d.source));
      expect(sources.size).toBeGreaterThanOrEqual(3);

      // All suggestions should be present (not fail-fast)
      expect(result.suggestions.length).toBeGreaterThanOrEqual(2);
      expect(result.oboFindings.length).toBeGreaterThan(0);
      expect(result.dataLabels.length).toBeGreaterThan(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('reports error diagnostic when SKILL.md is missing', async () => {
    const { mkdtemp, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'claws-annotate-missing-'));
    try {
      const result = await makerAnnotate({ skillDir: dir });

      expect(result.diagnostics.length).toBeGreaterThan(0);
      expect(result.diagnostics[0]!.severity).toBe('error');
      expect(result.diagnostics[0]!.message).toContain('SKILL.md not found');
      expect(result.name).toBe('unknown');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
