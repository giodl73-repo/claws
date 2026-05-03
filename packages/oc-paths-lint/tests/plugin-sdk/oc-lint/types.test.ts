import { describe, expect, it } from 'vitest';
import {
  WORKSPACE_FILE_NAMES,
  LintRuleRegistrationError,
} from '../../../src/plugin-sdk/oc-lint/index.js';

describe('SDK types', () => {
  it('exports the 9 workspace file names', () => {
    expect(WORKSPACE_FILE_NAMES).toEqual([
      'AGENTS.md',
      'SOUL.md',
      'TOOLS.md',
      'IDENTITY.md',
      'USER.md',
      'HEARTBEAT.md',
      'BOOTSTRAP.md',
      'MEMORY.md',
      'SKILL.md',
    ]);
  });

  it('LintRuleRegistrationError carries the rule id + stable code', () => {
    const e = new LintRuleRegistrationError('foo/bar');
    expect(e.code).toBe('OC_LINT_DUPLICATE_RULE');
    expect(e.ruleId).toBe('foo/bar');
    expect(e.message).toContain('foo/bar');
    expect(e.name).toBe('LintRuleRegistrationError');
  });
});
