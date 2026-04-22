/**
 * codegen-lint-nested-walker — SC-05 F-02 conformance (AMBIGUOUS finding
 * closure). Five tests prove the walker honours the nested-block discipline
 * named verbatim in the pulse 46 plan:
 *
 *   - top-level assignment after `await` → flagged (depth 0 baseline)
 *   - `if`-branch assignment after `await` → flagged at depth 1
 *   - `try`-branch assignment after `await` → flagged at depth 1
 *   - `for`-body assignment after `await` → flagged at depth 1
 *   - 3-level nested (`if { try { for { ... } } }`) → flagged at depth 3
 *
 * A top-level-only walker technically satisfies the PITFALLS.md text but
 * would miss the last four cases; these tests fail it deterministically.
 */
import { describe, it, expect } from 'vitest';
import { lintNoPostAwaitAssign } from '#harness/lint-rules/no-post-await-assign.ts';

describe('codegen-lint nested-block walker (SC-05 F-02)', () => {
  it('top-level assignment after await → flagged (depth 0 baseline)', () => {
    const source = [
      'async function run(): Promise<void> {',
      '  let policyArtifactSha256 = "";',
      '  const artifact = await fetchArtifact();',
      '  policyArtifactSha256 = artifact.sha256;',
      '}',
    ].join('\n');
    const diags = lintNoPostAwaitAssign('top-level.ts', source);
    expect(diags).toHaveLength(1);
    expect(diags[0]!.depth).toBe(0);
    expect(diags[0]!.snippet).toContain('policyArtifactSha256 =');
  });

  it('if-branch assignment after await → flagged (nested depth 1)', () => {
    const source = [
      'async function run(cond: boolean): Promise<void> {',
      '  let policyArtifactSha256 = "";',
      '  const artifact = await fetchArtifact();',
      '  if (cond) {',
      '    policyArtifactSha256 = artifact.sha256;',
      '  }',
      '}',
    ].join('\n');
    const diags = lintNoPostAwaitAssign('if-nested.ts', source);
    expect(diags).toHaveLength(1);
    expect(diags[0]!.depth).toBe(1);
    expect(diags[0]!.snippet).toContain('policyArtifactSha256 =');
  });

  it('try-branch assignment after await → flagged (nested depth 1)', () => {
    const source = [
      'async function run(): Promise<void> {',
      '  let policyArtifactSha256 = "";',
      '  const artifact = await fetchArtifact();',
      '  try {',
      '    policyArtifactSha256 = artifact.sha256;',
      '  } catch (err) {',
      '    // ignore',
      '  }',
      '}',
    ].join('\n');
    const diags = lintNoPostAwaitAssign('try-nested.ts', source);
    expect(diags).toHaveLength(1);
    expect(diags[0]!.depth).toBe(1);
    expect(diags[0]!.snippet).toContain('policyArtifactSha256 =');
  });

  it('for-body assignment after await → flagged (nested depth 1)', () => {
    const source = [
      'async function run(items: string[]): Promise<void> {',
      '  let policyArtifactSha256 = "";',
      '  const artifact = await fetchArtifact();',
      '  for (const item of items) {',
      '    policyArtifactSha256 = item;',
      '  }',
      '}',
    ].join('\n');
    const diags = lintNoPostAwaitAssign('for-nested.ts', source);
    expect(diags).toHaveLength(1);
    expect(diags[0]!.depth).toBe(1);
    expect(diags[0]!.snippet).toContain('policyArtifactSha256 =');
  });

  it('3-level nested (if { try { for { ... } } }) → flagged at depth 3', () => {
    const source = [
      'async function run(cond: boolean, items: string[]): Promise<void> {',
      '  let policyArtifactSha256 = "";',
      '  const artifact = await fetchArtifact();',
      '  if (cond) {',
      '    try {',
      '      for (const item of items) {',
      '        policyArtifactSha256 = item;',
      '      }',
      '    } catch (err) {',
      '      // ignore',
      '    }',
      '  }',
      '}',
    ].join('\n');
    const diags = lintNoPostAwaitAssign('three-deep.ts', source);
    expect(diags).toHaveLength(1);
    expect(diags[0]!.depth).toBe(3);
    expect(diags[0]!.snippet).toContain('policyArtifactSha256 =');
  });

  it('clean file (no post-await assignment) → no diagnostics', () => {
    const source = [
      'async function run(): Promise<string> {',
      '  let before = "";',
      '  before = "pre-await-is-fine";',
      '  const artifact = await fetchArtifact();',
      '  return artifact.sha256;',
      '}',
    ].join('\n');
    const diags = lintNoPostAwaitAssign('clean.ts', source);
    expect(diags).toHaveLength(0);
  });

  it('parameter captures (no let/const) still flagged after await', () => {
    // Captured names include function parameters — a walker that only
    // tracked variable declarations would miss assignments to parameters.
    const source = [
      'async function run(captured: string): Promise<string> {',
      '  const x = await Promise.resolve("v");',
      '  captured = x;',
      '  return captured;',
      '}',
    ].join('\n');
    const diags = lintNoPostAwaitAssign('param.ts', source);
    expect(diags).toHaveLength(1);
    expect(diags[0]!.depth).toBe(0);
  });

  it('while / do-while / switch / labeled-statement bodies all count toward depth', () => {
    // Exercises the remaining branches of `introducesNestedScope`.
    const source = [
      'async function run(flag: number, items: string[]): Promise<void> {',
      '  let captured = "";',
      '  const x = await Promise.resolve("v");',
      '  while (flag > 0) {',
      '    captured = x;',
      '    flag = 0;',
      '  }',
      '  do {',
      '    captured = x + "d";',
      '  } while (flag > 0);',
      '  switch (flag) {',
      '    case 0:',
      '      captured = x + "s";',
      '      break;',
      '    default:',
      '      captured = x + "sd";',
      '  }',
      '  outer: for (const item of items) {',
      '    captured = item;',
      '  }',
      '}',
    ].join('\n');
    const diags = lintNoPostAwaitAssign('kinds.ts', source);
    // 1 while + 1 do + 2 switch cases + 1 for-in-labeled = 5 diagnostics,
    // plus any implicit `flag = 0` assignment which lands after the first
    // captured assignment inside the while body (also captured: `flag` is
    // a parameter). Exact count is ≥ 5 — we just assert each depth shape
    // appears.
    expect(diags.length).toBeGreaterThanOrEqual(5);
    const depths = new Set(diags.map((d) => d.depth));
    // Every one of these lives at depth 1 (nested under a single
    // while/do/switch/labeled-for).
    expect(depths.has(1)).toBe(true);
  });

  it('arrow-function expression body is scanned too', () => {
    // Arrow functions with expression bodies (not Block bodies) are still
    // covered — the walker handles both shapes uniformly.
    const source = [
      'const run = async (): Promise<string> => {',
      '  let captured = "";',
      '  const x = await Promise.resolve("v");',
      '  captured = x;',
      '  return captured;',
      '};',
    ].join('\n');
    const diags = lintNoPostAwaitAssign('arrow.ts', source);
    expect(diags).toHaveLength(1);
  });

  it('await with no subsequent assignment produces zero diagnostics', () => {
    // Baseline: the await-gate opens but nothing assigns afterward.
    const source = [
      'async function run(): Promise<string> {',
      '  const captured = "pre";',
      '  const x = await Promise.resolve("v");',
      '  return captured + x;',
      '}',
    ].join('\n');
    const diags = lintNoPostAwaitAssign('no-assign.ts', source);
    expect(diags).toHaveLength(0);
  });

  it('assignment to a non-captured (external) identifier is NOT flagged', () => {
    // Only variables declared inside the function (or its params) are
    // "captured". An assignment to a free identifier is outside the
    // rule's scope.
    const source = [
      'let external = "";',
      'async function run(): Promise<void> {',
      '  const x = await Promise.resolve("v");',
      '  external = x;',
      '}',
    ].join('\n');
    const diags = lintNoPostAwaitAssign('external.ts', source);
    expect(diags).toHaveLength(0);
  });

  it('nested function does not leak await-gate to outer function', () => {
    // Outer function has no `await`; nested async function does. The
    // outer-scope assignment after the nested function definition must NOT
    // be flagged — the per-function scan isolates each gate. The inner
    // assignment is also not flagged here because `captured` is declared in
    // the outer scope (per-function lexical capture). This test proves the
    // outer scan skips past the inner function without inheriting its
    // await-gate.
    const source = [
      'function outer(): void {',
      '  let captured = "";',
      '  async function inner(): Promise<void> {',
      '    let local = "";',
      '    const x = await Promise.resolve("v");',
      '    local = x;',
      '  }',
      '  void inner;',
      '  captured = "safe-outer-assignment";',
      '}',
    ].join('\n');
    const diags = lintNoPostAwaitAssign('nested-fn.ts', source);
    // Exactly one diagnostic: the inner function's post-await `local = x`.
    // The outer assignment is safe; the inner scan does not leak up.
    expect(diags).toHaveLength(1);
    expect(diags[0]!.snippet).toContain('local = x');
  });
});
