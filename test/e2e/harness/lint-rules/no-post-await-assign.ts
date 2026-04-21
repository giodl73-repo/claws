/**
 * lint-rules/no-post-await-assign — AST nested-block walker (SC-05 F-02).
 *
 * Flags every assignment to a captured variable that follows an `await`
 * expression in the same function scope, **regardless of nesting depth**.
 * A top-level-only walker would pass files whose offending assignment is
 * buried inside an `if` / `try` / `for` / `while` / `switch` / block / arrow
 * / async-generator body — the nested-block-coverage conformance suite in
 * `__tests__/codegen-lint-nested-walker.unit.test.ts` locks that in.
 *
 * Why the `ts.forEachChild` spine matters (CODEGEN-L-001): any AST walker
 * that enumerates branches explicitly — "children of IfStatement are
 * thenStatement + elseStatement", and so on — must be kept in sync with
 * every new TypeScript statement kind. `ts.forEachChild` is the single
 * TypeScript-owned recursion that already covers every branch of every
 * statement kind, including kinds added in future compiler releases. Using
 * it is the cheapest way to guarantee the walker cannot silently drift out
 * of coverage when TS introduces (say) a new decorator metadata kind.
 *
 * The walker returns structured `Diagnostic[]` (file, line, snippet, depth)
 * so the consuming CP-3 gate rules can emit human-readable failures + the
 * conformance suite can assert the exact depth each violation was found at.
 *
 * @module harness/lint-rules/no-post-await-assign
 */

import ts from 'typescript';

export interface Diagnostic {
  readonly file: string;
  readonly line: number;
  readonly snippet: string;
  readonly depth: number;
}

/**
 * Walk `source` and return a diagnostic for every assignment to a captured
 * variable that appears lexically after an `await` expression in the same
 * function body. Depth is measured from the enclosing function body (depth
 * 0 == top-level statement inside the function body; depth 1 == nested one
 * branch deeper, and so on). Assignments at any depth are reported.
 */
export function lintNoPostAwaitAssign(
  file: string,
  source: string,
): Diagnostic[] {
  const sf = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.ES2022,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );
  const diagnostics: Diagnostic[] = [];

  for (const fn of iterFunctionBodies(sf)) {
    scanFunction(fn, sf, file, diagnostics);
  }

  return diagnostics;
}

// ---------------------------------------------------------------------------
// Per-function scan: learn captured identifiers, find the first `await`,
// then collect every subsequent assignment (at any depth) to those names.
// ---------------------------------------------------------------------------

/**
 * Scan a single function-like node. Exposed so CP-3 pulse 23 + pulse 71
 * consumers that already have a specific function node can reuse the per-
 * function walk without running `iterFunctionBodies` themselves.
 */
export function scanFunction(
  fn: FunctionLike,
  sf: ts.SourceFile,
  file: string,
  out: Diagnostic[],
): void {
  const body = fn.body;
  if (body === undefined) return;
  // Arrow-function expression bodies (`(x) => x + 1`) can still contain an
  // `await` + a captured assignment inside IIFEs or binary expressions;
  // scanning the whole body through `walk` covers both Block and Expression
  // shapes uniformly.
  const captured = collectCapturedNames(fn, body);
  const state: WalkState = {
    awaitSeen: false,
    captured,
    depth: 0,
    anchor: fn,
  };
  // Start the walk at the body's children so the function body's own Block
  // does not count toward depth. Depth 0 == a statement directly inside
  // the function body; depth 1 == one nested if/try/for/... deeper, etc.
  ts.forEachChild(body, (child) => walk(child, state, sf, file, out));
}

interface WalkState {
  awaitSeen: boolean;
  readonly captured: ReadonlySet<string>;
  depth: number;
  readonly anchor: ts.Node;
}

/**
 * Recursively walk `node` via `ts.forEachChild` so every TypeScript statement
 * kind is covered. Tracks `awaitSeen` monotonically: once any `await`
 * expression has been observed in the function body, every subsequent
 * assignment (at any depth) to a captured name is a diagnostic.
 *
 * Depth is the distance from the function body root — incremented every
 * time we descend into a block, if-branch, try-branch, for/while body,
 * switch case, or any other statement that introduces a new nested scope.
 */
function walk(
  node: ts.Node,
  state: WalkState,
  sf: ts.SourceFile,
  file: string,
  out: Diagnostic[],
): void {
  // Do not descend into nested function-like nodes — those have their own
  // captured set and their own first-await gate, handled by `iterFunctionBodies`.
  if (node !== state.anchor && isFunctionLike(node)) {
    return;
  }

  if (ts.isAwaitExpression(node)) {
    state.awaitSeen = true;
    ts.forEachChild(node, (child) => walk(child, state, sf, file, out));
    return;
  }

  if (state.awaitSeen && isCapturedAssignment(node, state.captured)) {
    out.push(toDiagnostic(node, sf, file, state.depth));
    // Fall through so nested assignments inside the assignment RHS are
    // still visited (chained assignments: `a = b = await x; ...`).
  }

  const introducesDepth = introducesNestedScope(node);
  if (introducesDepth) {
    state.depth += 1;
  }
  ts.forEachChild(node, (child) => walk(child, state, sf, file, out));
  if (introducesDepth) {
    state.depth -= 1;
  }
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------

type FunctionLike =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration
  | ts.GetAccessorDeclaration
  | ts.SetAccessorDeclaration
  | ts.ConstructorDeclaration;

function isFunctionLike(node: ts.Node): node is FunctionLike {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isConstructorDeclaration(node)
  );
}

function iterFunctionBodies(sf: ts.SourceFile): FunctionLike[] {
  const found: FunctionLike[] = [];
  const visit = (node: ts.Node): void => {
    if (isFunctionLike(node)) {
      found.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function collectCapturedNames(fn: FunctionLike, body: ts.Node): Set<string> {
  const names = new Set<string>();
  // Seed with the function's own parameters — they're siblings of the
  // body, not descendants, so a body-scoped scan would miss them.
  for (const param of fn.parameters) {
    if (ts.isIdentifier(param.name)) {
      names.add(param.name.text);
    }
  }
  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      names.add(node.name.text);
    }
    if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
      names.add(node.name.text);
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(body, visit);
  return names;
}

function isCapturedAssignment(
  node: ts.Node,
  captured: ReadonlySet<string>,
): boolean {
  if (!ts.isBinaryExpression(node)) return false;
  if (node.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return false;
  const lhs = node.left;
  if (!ts.isIdentifier(lhs)) return false;
  return captured.has(lhs.text);
}

/**
 * Statement kinds that count as a nested scope step for depth-tracking.
 * One depth-unit per statement kind; the `Block` immediately inside each
 * of these (e.g. the `{ ... }` of an `if` branch or `for` body) is NOT
 * counted separately, so depth of an assignment inside `if { ... }` is 1,
 * `if { try { ... } }` is 2, `if { try { for { ... } } }` is 3, matching
 * the pulse plan's 3-level example literally.
 *
 * Recursion still delegates to `ts.forEachChild` inside `walk`, so the
 * walker descends into every branch kind TypeScript will ever add — a
 * newly-introduced statement kind would simply not contribute to depth
 * until it is added here, but it will still be visited, and a post-await
 * assignment nested inside it will still be flagged.
 */
function introducesNestedScope(node: ts.Node): boolean {
  return (
    ts.isIfStatement(node) ||
    ts.isTryStatement(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isSwitchStatement(node) ||
    ts.isLabeledStatement(node)
  );
}

function toDiagnostic(
  node: ts.Node,
  sf: ts.SourceFile,
  file: string,
  depth: number,
): Diagnostic {
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  const start = node.getStart(sf);
  const end = node.getEnd();
  const snippet = sf.text.slice(start, end).trim();
  return { file, line: line + 1, snippet, depth };
}
