/**
 * Tests for the 3 SKILL.md workspace lint rules.
 */

import { describe, expect, it } from 'vitest';
import { parse } from '../../../src/ast/parse.js';
import { lintWorkspace } from '../../../src/lint/workspace.js';
import type { DiscoveredWorkspaceFile } from '../../../src/staging/discover.js';
import type { WorkspaceContext } from '../../../src/lint/workspace-types.js';

function skillFile(raw: string, relPath: string): DiscoveredWorkspaceFile {
  const { ast, diagnostics } = parse('skills', raw);
  return { relPath, kind: 'skills', raw, ast, diagnostics };
}

function ctx(files: DiscoveredWorkspaceFile[]): WorkspaceContext {
  return { files };
}

describe('OC_SKILL_NAME_MISMATCH (#69475)', () => {
  it('fires when frontmatter name does not match parent dir', () => {
    const raw = `---
name: wrong-name
description: A skill
---
body
`;
    const file = skillFile(raw, 'skills/email-drafter/SKILL.md');
    const findings = lintWorkspace(ctx([file]));
    const f = findings.find((x) => x.code === 'OC_SKILL_NAME_MISMATCH');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('warn');
    expect(f!.suggestion).toBe('email-drafter');
    expect(f!.message).toContain("'wrong-name'");
  });

  it('does NOT fire when frontmatter name matches parent dir', () => {
    const raw = `---
name: email-drafter
description: A skill
---
body
`;
    const file = skillFile(raw, 'skills/email-drafter/SKILL.md');
    const findings = lintWorkspace(ctx([file]));
    expect(findings.find((x) => x.code === 'OC_SKILL_NAME_MISMATCH')).toBeUndefined();
  });

  it('does NOT fire when name is missing (separate concern)', () => {
    const raw = `---
description: only desc
---
body
`;
    const file = skillFile(raw, 'skills/email-drafter/SKILL.md');
    const findings = lintWorkspace(ctx([file]));
    expect(findings.find((x) => x.code === 'OC_SKILL_NAME_MISMATCH')).toBeUndefined();
  });

  it('does NOT fire on a top-level SKILL.md (no parent dir to compare)', () => {
    const raw = `---
name: anything
description: x
---
body
`;
    const file = skillFile(raw, 'SKILL.md');
    const findings = lintWorkspace(ctx([file]));
    expect(findings.find((x) => x.code === 'OC_SKILL_NAME_MISMATCH')).toBeUndefined();
  });
});

describe('OC_SKILL_TOO_LONG (#50972)', () => {
  it('fires when SKILL.md exceeds 500 lines', () => {
    const fm = `---\nname: x\ndescription: y\n---\n`;
    const body = 'body line\n'.repeat(550);
    const file = skillFile(fm + body, 'skills/x/SKILL.md');
    const findings = lintWorkspace(ctx([file]));
    const f = findings.find((x) => x.code === 'OC_SKILL_TOO_LONG');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('note');
  });

  it('does NOT fire on a normal-length SKILL.md', () => {
    const fm = `---\nname: x\ndescription: y\n---\n`;
    const body = 'body\n'.repeat(50);
    const file = skillFile(fm + body, 'skills/x/SKILL.md');
    const findings = lintWorkspace(ctx([file]));
    expect(findings.find((x) => x.code === 'OC_SKILL_TOO_LONG')).toBeUndefined();
  });
});

describe('OC_SKILL_DEAD_PATH (#57143)', () => {
  it('fires on /data/.clawdbot/ path in body', () => {
    const raw = `---
name: x
description: y
---
Run script at /data/.clawdbot/run.sh
`;
    const file = skillFile(raw, 'skills/x/SKILL.md');
    const findings = lintWorkspace(ctx([file]));
    const f = findings.find((x) => x.code === 'OC_SKILL_DEAD_PATH');
    expect(f).toBeDefined();
    expect(f!.severity).toBe('note');
  });

  it('fires on /Users/<user>/ absolute path', () => {
    const raw = `---
name: x
description: y
---
/Users/giodl/myproject/file.txt
`;
    const file = skillFile(raw, 'skills/x/SKILL.md');
    const findings = lintWorkspace(ctx([file]));
    expect(findings.find((x) => x.code === 'OC_SKILL_DEAD_PATH')).toBeDefined();
  });

  it('does NOT fire on relative paths or ~/.openclaw references', () => {
    const raw = `---
name: x
description: y
---
Reads from ~/.openclaw/state and ./local-config.json
`;
    const file = skillFile(raw, 'skills/x/SKILL.md');
    const findings = lintWorkspace(ctx([file]));
    expect(findings.find((x) => x.code === 'OC_SKILL_DEAD_PATH')).toBeUndefined();
  });
});
