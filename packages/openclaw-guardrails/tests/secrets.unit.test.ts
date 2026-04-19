/**
 * /secrets — SecretScanner.scan + registerPattern per guardrails.md §/secrets.
 *
 * AWS / GCP / Azure / GitHub / private-key / JWT — the 6 categories the spec
 * calls out as the minimum baseline. Findings carry span / confidence / entropy.
 */

import { describe, expect, test } from 'vitest';
import {
  createSecretScanner,
  DEFAULT_PATTERNS,
  findHighEntropyTokens,
  maskSecret,
  matchPatterns,
  shannonEntropy,
} from '../src/secrets/index.js';
import type { SecretPattern } from '../src/secrets/index.js';

describe('/secrets — SecretScanner default rules', () => {
  test('AWS access key detection masks value + tags pattern + emits span/entropy', () => {
    const scanner = createSecretScanner();
    const { findings } = scanner.scan('AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\n');
    const aws = findings.find((f) => f.ruleId === 'aws-access-key');
    expect(aws).toBeDefined();
    expect(aws!.preview).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(aws!.preview.endsWith('***')).toBe(true);
    expect(aws!.span.end).toBeGreaterThan(aws!.span.start);
    expect(aws!.confidence).toBe('high');
    expect(aws!.entropy).toBeGreaterThan(0);
  });

  test('GCP API key + Azure storage key detected', () => {
    const scanner = createSecretScanner();
    const gcp = scanner.scan(
      'key = "AIzaSyA-lOREALVALUE_FAKEFAKEFAKEFAKEFAKEFAKE"\n',
    );
    expect(gcp.findings.some((f) => f.ruleId === 'gcp-api-key')).toBe(true);

    const azure = scanner.scan(
      'DefaultEndpointsProtocol=https;AccountKey=' +
        'A'.repeat(88) +
        ';EndpointSuffix=core.windows.net\n',
    );
    expect(azure.findings.some((f) => f.ruleId === 'azure-storage-key')).toBe(true);
  });

  test('GitHub personal access token matched', () => {
    const scanner = createSecretScanner();
    const { findings } = scanner.scan('GH_TOKEN=ghp_' + 'x'.repeat(40) + '\n');
    expect(findings.some((f) => f.ruleId === 'github-token')).toBe(true);
  });

  test('Private key header matched (RSA / EC / DSA / OPENSSH / PGP)', () => {
    const scanner = createSecretScanner();
    for (const kind of ['RSA', 'EC', 'DSA', 'OPENSSH', 'PGP']) {
      const { findings } = scanner.scan(`-----BEGIN ${kind} PRIVATE KEY-----\n`);
      expect(findings.some((f) => f.ruleId === 'private-key')).toBe(true);
    }
  });

  test('JWT pattern matched; DEFAULT_PATTERNS covers 6 required categories', () => {
    const scanner = createSecretScanner();
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.' + 'a'.repeat(40);
    const { findings } = scanner.scan(`token=${jwt}\n`);
    expect(findings.some((f) => f.ruleId === 'jwt')).toBe(true);

    const categories = new Set(DEFAULT_PATTERNS.map((p) => p.type));
    expect(categories.has('api-key')).toBe(true);
    expect(categories.has('token')).toBe(true);
    expect(categories.has('private-key')).toBe(true);
    expect(categories.has('jwt')).toBe(true);
    expect(categories.has('password')).toBe(true);
    expect(categories.has('connection-string')).toBe(true);
  });
});

describe('/secrets — ScanResult shape (span + confidence + entropy)', () => {
  test('scan() returns findings[] and aggregate entropy', () => {
    const scanner = createSecretScanner();
    const result = scanner.scan('hello, world');
    expect(Array.isArray(result.findings)).toBe(true);
    expect(typeof result.entropy).toBe('number');
    expect(result.entropy).toBeGreaterThan(0);
  });

  test('findings are sorted by span.start', () => {
    const scanner = createSecretScanner();
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.' + 'a'.repeat(40);
    const content = `password="first-password-val"\ntoken=${jwt}\n`;
    const { findings } = scanner.scan(content);
    for (let i = 1; i < findings.length; i++) {
      expect(findings[i]!.span.start).toBeGreaterThanOrEqual(
        findings[i - 1]!.span.start,
      );
    }
  });

  test('registerPattern adds a custom rule; duplicates throw', () => {
    const scanner = createSecretScanner();
    const custom: SecretPattern = {
      id: 'acme-token',
      label: 'ACME token',
      type: 'token',
      confidence: 'high',
      regex: /ACME-[A-Z0-9]{12}/g,
    };
    scanner.registerPattern(custom);
    const { findings } = scanner.scan('ACME-ABCDEF123456');
    expect(findings.some((f) => f.ruleId === 'acme-token')).toBe(true);

    expect(() => scanner.registerPattern(custom)).toThrow(/already registered/);
  });
});

describe('/secrets — entropy + masking + helpers (coverage fill)', () => {
  test('shannonEntropy returns 0 for empty, rises for uniform random-ish strings', () => {
    expect(shannonEntropy('')).toBe(0);
    expect(shannonEntropy('aaaa')).toBe(0);
    expect(shannonEntropy('X7p!qZ3@aB9Kl0vM')).toBeGreaterThan(3.5);
  });

  test('findHighEntropyTokens flags base64-like strings above threshold', () => {
    const tokens = findHighEntropyTokens(
      'api_key=' + 'K9nQ2aB7xZ3wY5mNpR1L6dV4tS8uJ0hG',
      4.5,
      12,
    );
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens[0]!.end).toBeGreaterThan(tokens[0]!.start);
    expect(tokens[0]!.entropy).toBeGreaterThanOrEqual(4.5);
  });

  test('maskSecret preserves first 4 chars + ***, falls back to **** for short', () => {
    expect(maskSecret('short')).toBe('shor***');
    expect(maskSecret('abc')).toBe('****');
    expect(maskSecret('AKIAIOSFODNN7EXAMPLE')).toBe('AKIA***');
  });

  test('matchPatterns returns spans + confidence per match', () => {
    const matches = matchPatterns('AWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE');
    const aws = matches.find((m) => m.patternId === 'aws-access-key');
    expect(aws).toBeDefined();
    expect(aws!.confidence).toBe('high');
    expect(aws!.end).toBeGreaterThan(aws!.start);
  });
});
