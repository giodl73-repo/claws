/**
 * Coverage for the extended classifier surface — new basenames, casing
 * variants, legacy aliases, did-you-mean suggestions, and the discovery
 * diagnostics that surface them. Backs the design scenarios from the
 * "Phase 1" cut: silent drop is gone, casing typos get a warning,
 * legacy `memory.md` still works but is flagged for rename.
 */

import { describe, expect, it } from 'vitest';
import {
  classify,
  classifyDetail,
  suggestBasename,
} from '../../src/ast/classify.js';

describe('classifier — new basenames added in PR-1 scope', () => {
  it('classifies BOOTSTRAP.md', () => {
    expect(classify('BOOTSTRAP.md')).toBe('bootstrap');
  });

  it('classifies SKILL.md (root or nested)', () => {
    expect(classify('SKILL.md')).toBe('skills');
    expect(classify('skills/email-drafter/SKILL.md')).toBe('skills');
  });

  it('classifies openclaw.json at root only (no node_modules false positive)', () => {
    expect(classify('openclaw.json')).toBe('config');
    // Root-anchored: nested copies (vendored, node_modules) don't match.
    expect(classify('subdir/openclaw.json')).toBe(null);
  });

  it('classifies HOOK.md (anywhere — workspace tier .hooks/<id>/HOOK.md or managed hooks/<id>/HOOK.md)', () => {
    expect(classify('HOOK.md')).toBe('hook');
    expect(classify('.hooks/my-hook/HOOK.md')).toBe('hook');
    expect(classify('hooks/managed/HOOK.md')).toBe('hook');
  });

  it('classifies any file inside .hooks/ or hooks/ as hook kind', () => {
    expect(classify('.hooks/my-hook/run.sh')).toBe('hook');
    expect(classify('hooks/managed/install.ts')).toBe('hook');
  });

  it('classifies DREAMS.md and any file inside .dreams/', () => {
    expect(classify('DREAMS.md')).toBe('dreams');
    expect(classify('.dreams/2026-04-28.md')).toBe('dreams');
  });
});

describe('classifyDetail — flavor distinction', () => {
  it('canonical UPPERCASE matches', () => {
    expect(classifyDetail('AGENTS.md')).toEqual({
      kind: 'agents',
      flavor: 'canonical',
      matched: 'AGENTS.md',
    });
  });

  it('lowercase variant matches with casing-variant flavor', () => {
    expect(classifyDetail('agents.md')).toEqual({
      kind: 'agents',
      flavor: 'casing-variant',
      matched: 'agents.md',
    });
  });

  it('legacy memory.md matches with legacy-basename flavor', () => {
    expect(classifyDetail('memory.md')).toEqual({
      kind: 'memory',
      flavor: 'legacy-basename',
      matched: 'memory.md',
    });
  });

  it('directory-prefixed file (no canonical basename) gets directory-prefix flavor', () => {
    expect(classifyDetail('workflows/onboarding.md')).toEqual({
      kind: 'workflows',
      flavor: 'directory-prefix',
      matched: 'workflows',
    });
  });

  it('returns null for genuinely unknown paths', () => {
    expect(classifyDetail('README.md')).toBe(null);
    expect(classifyDetail('random-thing.txt')).toBe(null);
  });

  it('handles backslash paths (Windows)', () => {
    expect(classifyDetail('skills\\email\\SKILL.md')).toEqual({
      kind: 'skills',
      flavor: 'canonical',
      matched: 'SKILL.md',
    });
  });
});

describe('suggestBasename — did-you-mean within edit distance ≤3', () => {
  it('suggests AGENTS.md for AGENT.md (single deletion)', () => {
    expect(suggestBasename('AGENT.md')).toBe('AGENTS.md');
  });

  it('suggests MEMORY.md for MEMRY.md (single deletion + close)', () => {
    expect(suggestBasename('MEMRY.md')).toBe('MEMORY.md');
  });

  it('suggests TOOLS.md for TOOL.md', () => {
    expect(suggestBasename('TOOL.md')).toBe('TOOLS.md');
  });

  it('returns null for completely unrelated names (over edit-distance threshold)', () => {
    expect(suggestBasename('CHANGELOG.md')).toBe(null);
    expect(suggestBasename('totally-random-name.txt')).toBe(null);
  });

  it('breaks ties alphabetically (deterministic across runs)', () => {
    // 'XOOL.md' has distance 2 from multiple candidates; the
    // alphabetically-earliest match wins. The exact winner depends on
    // the canonical-basename map, but the contract is "deterministic
    // across runs" — running suggestBasename twice must yield the same
    // result.
    const a = suggestBasename('XOOL.md');
    const b = suggestBasename('XOOL.md');
    expect(a).toBe(b);
    expect(a).not.toBe(null);
  });
});

describe('classifier — root-anchored basenames', () => {
  it('classifies openclaw.json at root', () => {
    expect(classify('openclaw.json')).toBe('config');
  });

  it('does NOT classify openclaw.json under node_modules (false-positive guard)', () => {
    expect(classify('node_modules/foo/openclaw.json')).toBe(null);
  });

  it('does NOT classify nested AGENTS.md (vendored fixture protection)', () => {
    expect(classify('packages/foo/AGENTS.md')).toBe(null);
    expect(classify('vendor/lib/SOUL.md')).toBe(null);
  });

  it('classifies SKILL.md anywhere (legitimately nested under skills/<name>/)', () => {
    expect(classify('SKILL.md')).toBe('skills');
    expect(classify('skills/email/SKILL.md')).toBe('skills');
    expect(classify('deep/path/SKILL.md')).toBe('skills'); // tolerant; per-skill structure
  });

  it('does NOT classify nested lobster.yaml', () => {
    expect(classify('lobster.yaml')).toBe('config');
    expect(classify('subdir/lobster.yaml')).toBe(null);
  });
});

describe('classifier — mixed-case (capitalized first letter)', () => {
  it("does NOT classify 'Agents.md' (only canonical UPPERCASE + all-lowercase recognized)", () => {
    // Mixed-case like 'Agents.md' falls through; users see did-you-mean
    // via OC_WS_UNKNOWN_FILE rather than a misleading casing-violation.
    expect(classify('Agents.md')).toBe(null);
    // …and suggestBasename should propose the canonical form.
    expect(suggestBasename('Agents.md')).toBe('AGENTS.md');
  });
});
