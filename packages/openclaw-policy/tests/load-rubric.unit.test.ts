import { describe, it, expect } from 'vitest';

import { loadRubric, parseRubricYaml, BUILT_IN_RUBRIC_IDS, isBuiltInRubricId } from '../src/compliance/load-rubric.js';

describe('loadRubric — built-ins', () => {
  it.each(BUILT_IN_RUBRIC_IDS)('loads built-in %s rubric', async (id) => {
    const r = await loadRubric(id);
    expect(r.id).toBeTruthy();
    expect(r.requirements.length).toBeGreaterThanOrEqual(5);
  });

  it('isBuiltInRubricId returns false on unknown ids', () => {
    expect(isBuiltInRubricId('not-a-framework')).toBe(false);
  });

  it('throws on unknown built-in id passed as string', async () => {
    await expect(loadRubric('bogus' as never)).rejects.toThrow(/unknown built-in rubric/);
  });

  it('accepts a pre-parsed Rubric object and passes through', async () => {
    const r = await loadRubric({ id: 'x', version: '1', framework: 'X', requirements: [] });
    expect(r.id).toBe('x');
  });
});

describe('parseRubricYaml', () => {
  it('parses id, version, framework and requirements list', () => {
    const yaml = `
id: demo
version: "2.0"
framework: Demo
requirements:
  - id: R1
    title: First
    kind: static
    predicate: has-deny-rules
    description: first desc
  - id: R2
    title: Second
    kind: structural
    predicate: audit-tamper-seal-present
`;
    const r = parseRubricYaml(yaml);
    expect(r.id).toBe('demo');
    expect(r.version).toBe('2.0');
    expect(r.framework).toBe('Demo');
    expect(r.requirements).toHaveLength(2);
    expect(r.requirements[0]!.id).toBe('R1');
    expect(r.requirements[0]!.description).toBe('first desc');
    expect(r.requirements[1]!.kind).toBe('structural');
  });

  // --- parseKeyValue branch coverage (post-refactor, 2026-04-19) --------
  // Exercise the non-matching paths that the regex→string-ops refactor
  // in parseKeyValue() introduced. Each path returns null silently, so
  // we observe it via a YAML where the bad line is skipped and the
  // following valid line still parses.

  it('parseKeyValue: lines with no colon are skipped', () => {
    const yaml = 'justatoken\nid: demo\nversion: "1"\nframework: X\nrequirements:\n  - id: R1\n    title: t\n    kind: static\n    predicate: p\n';
    const r = parseRubricYaml(yaml);
    expect(r.id).toBe('demo');
  });

  it('parseKeyValue: keys starting with digit are skipped (bad first char)', () => {
    const yaml = '1bad: value\nid: demo\nversion: "1"\nframework: X\nrequirements:\n  - id: R1\n    title: t\n    kind: static\n    predicate: p\n';
    const r = parseRubricYaml(yaml);
    expect(r.id).toBe('demo');
  });

  it('parseKeyValue: keys starting with hyphen are skipped', () => {
    // Leading `-` at col 0 (not a list item, no indent). parseKeyValue
    // rejects because first char fails the letter/underscore test.
    const yaml = '-bad: value\nid: demo\nversion: "1"\nframework: X\nrequirements:\n  - id: R1\n    title: t\n    kind: static\n    predicate: p\n';
    const r = parseRubricYaml(yaml);
    expect(r.id).toBe('demo');
  });

  it('parseKeyValue: keys with invalid chars in tail are skipped', () => {
    // `foo.bar` — `.` fails the [\w-] test on the non-first char.
    const yaml = 'foo.bar: value\nid: demo\nversion: "1"\nframework: X\nrequirements:\n  - id: R1\n    title: t\n    kind: static\n    predicate: p\n';
    const r = parseRubricYaml(yaml);
    expect(r.id).toBe('demo');
  });

  it('parseKeyValue: colon at position 0 is skipped', () => {
    const yaml = ': value-without-key\nid: demo\nversion: "1"\nframework: X\nrequirements:\n  - id: R1\n    title: t\n    kind: static\n    predicate: p\n';
    const r = parseRubricYaml(yaml);
    expect(r.id).toBe('demo');
  });

  it('parseKeyValue: keys with uppercase and digits and hyphens are accepted', () => {
    const yaml = 'id: ABC-123\nversion: "1"\nframework: X\nrequirements:\n  - id: R1\n    title: t\n    kind: static\n    predicate: p\n';
    const r = parseRubricYaml(yaml);
    expect(r.id).toBe('ABC-123');
  });

  it('parseKeyValue: assignField (inside requirement block) skips malformed lines', () => {
    // Second requirement has a malformed line inside it ("bogus") that
    // parseKeyValue rejects; the valid fields around it still apply.
    const yaml = 'id: demo\nversion: "1"\nframework: X\nrequirements:\n  - id: R1\n    title: t1\n    bogus\n    kind: static\n    predicate: p\n  - id: R2\n    title: t2\n    kind: structural\n    predicate: q\n';
    const r = parseRubricYaml(yaml);
    expect(r.requirements).toHaveLength(2);
    expect(r.requirements[0]!.id).toBe('R1');
    expect(r.requirements[0]!.title).toBe('t1');
    expect(r.requirements[1]!.id).toBe('R2');
  });
});
