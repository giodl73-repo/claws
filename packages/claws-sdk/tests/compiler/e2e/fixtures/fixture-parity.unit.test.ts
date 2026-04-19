/**
 * L0 shape parity guard for the two canonical OC workspace fixtures.
 *
 * Two fixture trees exist in the repository:
 *   - `tests/fixtures/full-workspace/`                 -- CP-1 readers
 *   - `tests/compiler/e2e/fixtures/workspace/`         -- CP-2 pipeline
 *
 * They are independently authored for different purposes: CP-1 exercises
 * reader edge cases, CP-2 exercises the full compile pipeline end-to-end.
 * Their contents are intentionally different.
 *
 * What they MUST share is the canonical 9-file OC workspace shape:
 *   SOUL.md, TOOLS.md, AGENTS.md, MEMORY.md, IDENTITY.md, USER.md,
 *   HEARTBEAT.md, lobster.yaml, plus at least one skills/{slug}/SKILL.md.
 *
 * This guard fails only if a required top-level file disappears from one
 * tree or the skills/ subtree stops carrying a SKILL.md. It does NOT
 * enforce content parity — content drift is a feature, not a bug.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const TREE_A = resolve(__dirname, '../../../fixtures/full-workspace');
const TREE_B = resolve(__dirname, 'workspace');

const REQUIRED_TOP_LEVEL = [
  'SOUL.md',
  'TOOLS.md',
  'AGENTS.md',
  'MEMORY.md',
  'IDENTITY.md',
  'USER.md',
  'HEARTBEAT.md',
  'lobster.yaml',
] as const;

function hasAtLeastOneSkill(root: string): boolean {
  const skillsDir = join(root, 'skills');
  if (!existsSync(skillsDir)) return false;
  if (!statSync(skillsDir).isDirectory()) return false;
  for (const slug of readdirSync(skillsDir)) {
    const slugDir = join(skillsDir, slug);
    if (!statSync(slugDir).isDirectory()) continue;
    if (existsSync(join(slugDir, 'SKILL.md'))) return true;
  }
  return false;
}

describe.each([
  ['full-workspace (CP-1 readers)', TREE_A],
  ['e2e/fixtures/workspace (CP-2 pipeline)', TREE_B],
])('fixture shape — %s', (_label, root) => {
  it.each(REQUIRED_TOP_LEVEL)('has %s at the top level', (file) => {
    const path = join(root, file);
    expect(existsSync(path), `missing ${file} under ${root}`).toBe(true);
    expect(statSync(path).isFile()).toBe(true);
  });

  it('has at least one skills/{slug}/SKILL.md', () => {
    expect(hasAtLeastOneSkill(root), `no skills/*/SKILL.md under ${root}`).toBe(true);
  });
});
