/**
 * L0: SKILL.md scenario parser — extracts given/when/then test cases.
 */

import { describe, it, expect } from 'vitest';
import { parseScenarios } from '../../src/scenario/parser.js';

const SKILL_MD = `# my-skill

A test skill.

## Scenarios

### Happy path
- Given: user is authenticated
- When: user requests data
- Then: returns the data

### Error case
- Given: user is not authenticated
- When: user requests data
- Then: fails with authentication error

## Other Section

This should not be parsed.
`;

describe('parseScenarios', () => {
  it('extracts scenario sections with given/when/then structure', () => {
    const scenarios = parseScenarios(SKILL_MD);

    expect(scenarios).toHaveLength(2);
    expect(scenarios[0]!.name).toBe('Happy path');
    expect(scenarios[0]!.given).toBe('user is authenticated');
    expect(scenarios[0]!.when).toBe('user requests data');
    expect(scenarios[0]!.then).toBe('returns the data');
  });

  it('parses multiple scenarios correctly', () => {
    const scenarios = parseScenarios(SKILL_MD);

    expect(scenarios[1]!.name).toBe('Error case');
    expect(scenarios[1]!.given).toBe('user is not authenticated');
    expect(scenarios[1]!.when).toBe('user requests data');
    expect(scenarios[1]!.then).toBe('fails with authentication error');
  });

  it('returns empty array when no ## Scenarios section exists', () => {
    const content = '# my-skill\n\nJust a description.\n';
    const scenarios = parseScenarios(content);
    expect(scenarios).toHaveLength(0);
  });

  it('handles scenarios without given/when/then gracefully', () => {
    const content = '## Scenarios\n\n### Incomplete\nSome text without structure.\n';
    const scenarios = parseScenarios(content);
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0]!.name).toBe('Incomplete');
    expect(scenarios[0]!.given).toBe('');
    expect(scenarios[0]!.when).toBe('');
    expect(scenarios[0]!.then).toBe('');
  });
});
