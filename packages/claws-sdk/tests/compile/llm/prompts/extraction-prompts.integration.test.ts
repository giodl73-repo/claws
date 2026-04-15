/**
 * L1: Extraction prompts against reference workspace files.
 *
 * 4 integration tests — each prompt builder against the
 * oc-reference-workspace fixture files. Verifies that prompts
 * compose correctly with real workspace content.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSoulSystemPrompt, buildSoulUserPrompt } from '../../../../src/compile/llm/prompts/soul-extract.js';
import { buildToolsSystemPrompt, buildToolsUserPrompt } from '../../../../src/compile/llm/prompts/tools-extract.js';
import { buildAgentsSystemPrompt, buildAgentsUserPrompt } from '../../../../src/compile/llm/prompts/agents-extract.js';
import { buildSkillSystemPrompt, buildSkillUserPrompt } from '../../../../src/compile/llm/prompts/skill-extract.js';
import { parseIntentsFromResponse } from '../../../../src/compile/llm/prompts.js';

const FIXTURES = resolve(__dirname, '../../../fixtures/oc-reference-workspace');

function readFixture(relativePath: string): string {
  return readFileSync(resolve(FIXTURES, relativePath), 'utf-8');
}

describe('extraction prompts against reference workspace', () => {
  it('SOUL.md prompt composes with reference workspace SOUL.md', () => {
    const content = readFixture('SOUL.md');
    const system = buildSoulSystemPrompt();
    const user = buildSoulUserPrompt({
      source: 'SOUL.md',
      content,
      hints: {
        knownTools: [
          'web-search', 'web-scrape', 'file-read', 'file-list',
          'file-write', 'send-email', 'shell-exec',
        ],
      },
    });

    // System prompt has SOUL-specific instructions
    expect(system).toContain('SOUL.md');
    expect(system).toContain('Deny Constraints');
    expect(system).toContain('Adversarial Resistance');

    // User prompt includes full reference workspace content
    expect(user).toContain('File: SOUL.md');
    expect(user).toContain('Never access production databases');
    expect(user).toContain('Never send external communications without manager approval');
    expect(user).toContain('Never impersonate a team member');
    expect(user).toContain('Known tools: web-search');

    // Simulate a well-formed LLM response for this content
    const mockResponse = JSON.stringify([
      {
        kind: 'deny',
        target: 'production-database',
        description: 'Never access production databases',
        confidence: 0.95,
        line: 11,
        sourceText: 'Never access production databases or systems.',
      },
      {
        kind: 'deny',
        target: 'send-email',
        description: 'Never send external communications without manager approval',
        confidence: 0.95,
        line: 12,
        sourceText: 'Never send external communications without manager approval.',
      },
      {
        kind: 'deny',
        target: 'impersonation',
        description: 'Never impersonate a team member',
        confidence: 0.95,
        line: 13,
        sourceText: 'Never impersonate a team member.',
      },
      {
        kind: 'limit',
        target: 'gpt-4o',
        description: 'Model restriction — approved model',
        confidence: 0.90,
        line: 18,
        sourceText: '- gpt-4o',
      },
    ]);
    const intents = parseIntentsFromResponse(mockResponse, 'SOUL.md');
    expect(intents).toHaveLength(4);
    expect(intents.filter((i) => i.kind === 'deny')).toHaveLength(3);
    expect(intents.filter((i) => i.kind === 'limit')).toHaveLength(1);
  });

  it('TOOLS.md prompt composes with reference workspace TOOLS.md', () => {
    const content = readFixture('TOOLS.md');
    const system = buildToolsSystemPrompt();
    const user = buildToolsUserPrompt({
      source: 'TOOLS.md',
      content,
      hints: { knownAgents: ['research-agent', 'action-agent'] },
    });

    // System prompt has TOOLS-specific instructions
    expect(system).toContain('TOOLS.md');
    expect(system).toContain('Risk Labels');
    expect(system).toContain('Adversarial Resistance');

    // User prompt includes full tool declarations
    expect(user).toContain('File: TOOLS.md');
    expect(user).toContain('web-search');
    expect(user).toContain('send-email');
    expect(user).toContain('shell-exec');
    expect(user).toContain('deploy-trigger');
    expect(user).toContain('Risk: R5');
    expect(user).toContain('Known agents: research-agent, action-agent');

    // Simulate response with tool risk labels
    const mockResponse = JSON.stringify([
      {
        kind: 'label',
        target: 'web-search',
        description: 'R1 — public web search, audit-only',
        confidence: 0.95,
        line: 3,
        sourceText: '- Risk: R1',
      },
      {
        kind: 'label',
        target: 'send-email',
        description: 'R5 — send email on behalf of user',
        confidence: 0.95,
        line: 44,
        sourceText: '- Risk: R5',
      },
      {
        kind: 'elicit',
        target: 'send-email',
        description: 'Elicitation required before sending',
        confidence: 0.90,
        line: 46,
        sourceText: 'elicitation required',
      },
    ]);
    const intents = parseIntentsFromResponse(mockResponse, 'TOOLS.md');
    expect(intents).toHaveLength(3);
    expect(intents.filter((i) => i.kind === 'label')).toHaveLength(2);
    expect(intents.filter((i) => i.kind === 'elicit')).toHaveLength(1);
  });

  it('AGENTS.md prompt composes with reference workspace AGENTS.md', () => {
    const content = readFixture('AGENTS.md');
    const system = buildAgentsSystemPrompt();
    const user = buildAgentsUserPrompt({
      source: 'AGENTS.md',
      content,
      hints: {
        knownTools: ['web-search', 'file-read', 'send-email', 'deploy-trigger'],
        knownAgents: ['research-agent', 'action-agent'],
      },
    });

    // System prompt has AGENTS-specific instructions
    expect(system).toContain('AGENTS.md');
    expect(system).toContain('delegation');
    expect(system).toContain('Adversarial Resistance');

    // User prompt includes agent definitions
    expect(user).toContain('File: AGENTS.md');
    expect(user).toContain('research-agent');
    expect(user).toContain('action-agent');
    expect(user).toContain('delegates_to');
    expect(user).toContain('Known tools: web-search');
    expect(user).toContain('Known agents: research-agent, action-agent');

    // Simulate response with delegation edges and tool assignments
    const mockResponse = JSON.stringify([
      {
        kind: 'limit',
        target: 'research-agent -> action-agent',
        description: 'Delegation from research to action agent',
        confidence: 0.95,
        line: 13,
        sourceText: '- delegates_to: action-agent',
      },
      {
        kind: 'label',
        target: 'research-agent:web-search',
        description: 'Tool assignment: research-agent has web-search',
        confidence: 0.95,
        line: 8,
        sourceText: '  - web-search',
      },
      {
        kind: 'deny',
        target: 'research-agent',
        description: 'Research agent is read-only — never modifies files',
        confidence: 0.85,
        line: 5,
        sourceText: 'Read-only — never modifies files or sends communications',
      },
    ]);
    const intents = parseIntentsFromResponse(mockResponse, 'AGENTS.md');
    expect(intents).toHaveLength(3);
    expect(intents.find((i) => i.kind === 'limit')!.target).toContain('->');
    expect(intents.find((i) => i.kind === 'label')!.target).toContain(':');
  });

  it('SKILL.md prompt composes with reference workspace SKILL.md files', () => {
    const content = readFixture('skills/email-drafter/SKILL.md');
    const system = buildSkillSystemPrompt();
    const user = buildSkillUserPrompt({
      source: 'skills/email-drafter/SKILL.md',
      content,
      hints: { knownTools: ['file-read', 'send-email'] },
    });

    // System prompt has SKILL-specific instructions
    expect(system).toContain('SKILL.md');
    expect(system).toContain('YAML frontmatter');
    expect(system).toContain('Adversarial Resistance');

    // User prompt includes frontmatter + body
    expect(user).toContain('File: skills/email-drafter/SKILL.md');
    expect(user).toContain('name: email-drafter');
    expect(user).toContain('send-email');
    expect(user).toContain('audit: true');
    expect(user).toContain('approval: exec');
    expect(user).toContain('elicit: true');
    expect(user).toContain('Known tools: file-read, send-email');

    // Simulate response extracting from both frontmatter and prose
    const mockResponse = JSON.stringify([
      {
        kind: 'label',
        target: 'email-drafter:send-email',
        description: 'Tool dependency from frontmatter',
        confidence: 0.95,
        line: 6,
        sourceText: '  - send-email',
      },
      {
        kind: 'require',
        target: 'email-drafter',
        description: 'Audit logging required',
        confidence: 0.95,
        line: 8,
        sourceText: '  audit: true',
      },
      {
        kind: 'require',
        target: 'email-drafter',
        description: 'Executive approval required',
        confidence: 0.95,
        line: 9,
        sourceText: '  approval: exec',
      },
      {
        kind: 'elicit',
        target: 'email-drafter',
        description: 'User shown final draft before send (prose)',
        confidence: 0.80,
        line: 29,
        sourceText: 'The user is always shown the final draft before it is sent',
      },
      {
        kind: 'limit',
        target: 'email-drafter',
        description: 'Skill sends external communications (R5)',
        confidence: 0.85,
        line: 27,
        sourceText: 'This skill sends external communications (R5)',
      },
    ]);
    const intents = parseIntentsFromResponse(mockResponse, 'SKILL.md');
    expect(intents).toHaveLength(5);
    expect(intents.filter((i) => i.kind === 'require')).toHaveLength(2);
    expect(intents.filter((i) => i.kind === 'label')).toHaveLength(1);
    expect(intents.filter((i) => i.kind === 'elicit')).toHaveLength(1);
    expect(intents.filter((i) => i.kind === 'limit')).toHaveLength(1);
  });
});
