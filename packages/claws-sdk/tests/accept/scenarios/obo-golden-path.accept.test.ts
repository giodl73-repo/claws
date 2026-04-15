/**
 * L3 acceptance test: OBO golden path.
 *
 * Cross-cutting scenario validating OBO (on-behalf-of) detection flows
 * through the entire skill lifecycle: scaffold detects OBO-suggestive
 * names, annotate confirms the classification, and metadata is consistent
 * across both stages.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { scaffoldSkill } from '@bic/claws-sdk/scaffold';
import type { ScaffoldResult } from '@bic/claws-sdk/scaffold';
import { analyzeHeuristics, detectObo } from '@bic/claws-sdk/annotate';

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'claws-obo-accept-'));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

async function writeConfig(dir: string, trustTier: number): Promise<void> {
  await writeFile(
    join(dir, 'claws.json'),
    JSON.stringify({ trustTier }),
    'utf-8',
  );
}

describe('OBO golden path — scaffold → annotate → publish', () => {
  // ── Scaffold: OBO-positive skill ────────────────────────────────────

  it('scaffold "send-email": OBO hint injected in generated handler', async () => {
    await writeConfig(tempDir, 3);

    const result = await scaffoldSkill(tempDir, 'send-email', { tier: 'typed' });

    expect(result.oboDetected).toBe(true);
    expect(result.oboHints.length).toBeGreaterThan(0);

    // Handler file should contain OBO comment block
    const handler = await readFile(join(result.skillDir, 'handler.ts'), 'utf-8');
    expect(handler).toContain('// OBO:');
  });

  // ── Scaffold: OBO-negative skill ────────────────────────────────────

  it('scaffold "search-docs": no OBO hint (negative case)', async () => {
    await writeConfig(tempDir, 3);

    const result = await scaffoldSkill(tempDir, 'search-docs', { tier: 'typed' });

    expect(result.oboDetected).toBe(false);
    expect(result.oboHints).toHaveLength(0);

    // Handler should NOT contain OBO comment block
    const handler = await readFile(join(result.skillDir, 'handler.ts'), 'utf-8');
    expect(handler).not.toContain('// OBO:');
  });

  // ── Annotate: OBO-positive skill ────────────────────────────────────

  it('annotate "send-email": R4+ risk classification', () => {
    const annotation = analyzeHeuristics(
      'send-email',
      'Send an email on behalf of the user',
      'import { sendEmail } from "mail-sdk";\nawait client.sendEmail({ to, body });',
    );

    expect(annotation.riskClass).toBeGreaterThanOrEqual(4);
  });

  it('annotate "send-email": OBO boundary detected with confidence > 0', () => {
    const oboResult = detectObo(
      'send-email',
      'Send an email on behalf of the user',
    );

    expect(oboResult.detected).toBe(true);
    expect(oboResult.confidence).toBeGreaterThan(0);
    expect(oboResult.matchedPatterns.length).toBeGreaterThan(0);
  });

  // ── Annotate: OBO-negative skill ────────────────────────────────────

  it('annotate "search-docs": R1-R2 risk, no OBO detected', () => {
    const annotation = analyzeHeuristics(
      'search-docs',
      'Search documentation for relevant articles',
      'const results = await index.search(query);',
    );

    expect(annotation.riskClass).toBeLessThanOrEqual(2);
    expect(annotation.obo.detected).toBe(false);
  });

  // ── Full path: scaffold → annotate → metadata consistency ───────────

  it('full path: scaffold "send-email" → annotate → R4+ OBO true → consistent metadata', async () => {
    await writeConfig(tempDir, 4);

    // Step 1: Scaffold — keyword detection (send, email → OBO)
    const scaffoldResult: ScaffoldResult = await scaffoldSkill(
      tempDir, 'send-email', { tier: 'verified' },
    );

    expect(scaffoldResult.oboDetected).toBe(true);

    // Step 2: Read scaffolded handler source
    const handlerSource = await readFile(
      join(scaffoldResult.skillDir, 'handler.ts'),
      'utf-8',
    );
    expect(handlerSource).toContain('// OBO:');

    // Step 3: Run annotate heuristics with OBO-suggestive description
    // (annotate uses semantic OBO patterns — "on behalf of", "as user", etc.)
    const annotation = analyzeHeuristics(
      'send-email',
      'Send an email on behalf of the user',
      handlerSource,
    );

    // Step 4: Verify risk is R4+
    expect(annotation.riskClass).toBeGreaterThanOrEqual(4);

    // Step 5: Verify OBO detected by annotate (semantic pattern match)
    expect(annotation.obo.detected).toBe(true);

    // Step 6: Cross-check — both scaffold and annotate agree OBO is present
    expect(scaffoldResult.oboDetected).toBe(annotation.obo.detected);

    // Step 7: Verify OBO metadata would persist in frontmatter
    expect(annotation.obo.confidence).toBeGreaterThan(0);
    expect(annotation.obo.matchedPatterns.length).toBeGreaterThan(0);
  });
});
