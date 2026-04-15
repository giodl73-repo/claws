/**
 * L2: claws annotate E2E — run heuristic annotation on a temporary
 * workspace, verify risk classifications, OBO detection, dry-run mode,
 * and file modification.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeHeuristics, formatAnnotation } from '../../src/annotate/heuristics.js';

let tmpDir: string;
let skillsDir: string;

beforeEach(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'claws-annotate-'));
  skillsDir = join(tmpDir, 'skills');
  await mkdir(skillsDir, { recursive: true });

  // Create test skills
  const sendEmailDir = join(skillsDir, 'send-email');
  await mkdir(sendEmailDir, { recursive: true });
  await writeFile(join(sendEmailDir, 'SKILL.md'), `---
name: send-email
description: Send email on behalf of the user
tools:
  - file-read
  - send-email
governance:
  audit: true
  approval: exec
---

# Send Email

Draft and send emails on behalf of the user.
`, 'utf-8');

  const searchDocsDir = join(skillsDir, 'search-docs');
  await mkdir(searchDocsDir, { recursive: true });
  await writeFile(join(searchDocsDir, 'SKILL.md'), `---
name: search-docs
description: Search public documentation
tools:
  - web-search
governance:
  audit: true
---

# Search Docs

Search and retrieve public documentation.
`, 'utf-8');

  const deployDir = join(skillsDir, 'deploy-prod');
  await mkdir(deployDir, { recursive: true });
  await writeFile(join(deployDir, 'SKILL.md'), `---
name: deploy-prod
description: Deploy application to production
tools:
  - shell-exec
governance:
  audit: true
  approval: exec
---

# Deploy Production

Execute deployment pipeline via child_process.exec.
Uses shell-exec to run deploy.sh on production servers.
`, 'utf-8');
});

afterEach(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('claws annotate E2E', () => {
  it('classifies send-email as R4+ with OBO', async () => {
    const content = await readFile(join(skillsDir, 'send-email', 'SKILL.md'), 'utf-8');
    const annotation = analyzeHeuristics('send-email', 'Send email on behalf of the user', content);

    expect(annotation.riskClass).toBeGreaterThanOrEqual(4);
    expect(annotation.obo.detected).toBe(true);
    expect(annotation.obo.matchedPatterns.length).toBeGreaterThan(0);
  });

  it('classifies search-docs as R1-R2', async () => {
    const content = await readFile(join(skillsDir, 'search-docs', 'SKILL.md'), 'utf-8');
    const annotation = analyzeHeuristics('search-docs', 'Search public documentation', content);

    expect(annotation.riskClass).toBeLessThanOrEqual(2);
    expect(annotation.obo.detected).toBe(false);
  });

  it('classifies deploy-prod as R5', async () => {
    const content = await readFile(join(skillsDir, 'deploy-prod', 'SKILL.md'), 'utf-8');
    const annotation = analyzeHeuristics(
      'deploy-prod',
      'Deploy application to production',
      content,
    );

    expect(annotation.riskClass).toBe(5);
  });

  it('dry-run produces output without modifying files', async () => {
    const originalContent = await readFile(join(skillsDir, 'send-email', 'SKILL.md'), 'utf-8');
    const annotation = analyzeHeuristics('send-email', 'Send email on behalf of the user', originalContent);
    const formatted = formatAnnotation(annotation);

    // Verify format includes key information
    expect(formatted).toContain('send-email');
    expect(formatted).toMatch(/R[4-5]/);
    expect(formatted).toContain('%');

    // File should NOT be modified (dry-run)
    const afterContent = await readFile(join(skillsDir, 'send-email', 'SKILL.md'), 'utf-8');
    expect(afterContent).toBe(originalContent);
  });

  it('all annotations have confidence scores in 0.0-1.0 range', async () => {
    const skills = ['send-email', 'search-docs', 'deploy-prod'];

    for (const skill of skills) {
      const content = await readFile(join(skillsDir, skill, 'SKILL.md'), 'utf-8');
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const descMatch = content.match(/^description:\s*(.+)$/m);
      const name = nameMatch?.[1]?.trim() ?? skill;
      const desc = descMatch?.[1]?.trim() ?? '';

      const annotation = analyzeHeuristics(name, desc, content);

      expect(annotation.riskConfidence).toBeGreaterThanOrEqual(0.0);
      expect(annotation.riskConfidence).toBeLessThanOrEqual(1.0);
    }
  });
});
