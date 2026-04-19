/**
 * ts-builder — claws emitter AST helper.
 *
 * Public subpath: `@bic/claws-sdk/compiler/emit/ts-builder` (post-Horus rename;
 * currently `@bic/claws-sdk/compiler/emit/ts-builder`).
 *
 * Intended audience: claws-internal emitters (free-tier OC + Claude Code) and
 * paid-tier emitter packages (Bedrock, CrewAI, LangGraph, Cursor, Copilot) in
 * @bic/claws-sdk per CL-13's package split. NOT a general-purpose TypeScript
 * AST library for consumer code.
 *
 * Every generated .ts file passes through this module, which constructs a
 * `ts.SourceFile` from typed IR shapes and serializes it via a singleton
 * printer. Template-string concatenation has no tsc-strict round-trip
 * validation, is fragile to refactoring, and is not the real-codegen moat.
 * See `feedback_codegen_quality_bar.md`.
 *
 * API stability: NOT under the stability guarantees of the public compile()
 * surface. Breaking changes to this module between minor versions of
 * claws-compiler are permitted with release notes (CL-14 §3.2).
 *
 * @module claws-sdk/compiler/emit/ts-builder
 */

import ts from 'typescript';

// ── Printer ───────────────────────────────────────────────────────────

/**
 * Deterministic line-feed printer shared across every emit. Comments
 * in the AST are preserved; trailing newline handling is the caller's
 * responsibility via `printWithMarker`.
 */
const PRINTER = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: false,
  // Pin the option explicitly — a future TS default flip to true would
  // silently change output and break byte-identical determinism. CL-14
  // §1.2 requires all three printer keys to be set.
  omitTrailingSemicolon: false,
});

/**
 * Internal blank `ts.SourceFile` builder used by the printer. Public
 * callers should use `createSourceFile` below.
 */
function emptySourceFile(): ts.SourceFile {
  return ts.createSourceFile(
    '__emit__.ts',
    '',
    ts.ScriptTarget.ES2022,
    false,
    ts.ScriptKind.TS,
  );
}

/**
 * Print a sequence of statements as a single `.ts` source string. A
 * trailing newline is appended so the output matches conventional file
 * format.
 */
export function printStatements(statements: readonly ts.Statement[]): string {
  const source = ts.factory.updateSourceFile(emptySourceFile(), statements);
  const body = PRINTER.printFile(source);
  return body.endsWith('\n') ? body : `${body}\n`;
}

/**
 * Print a source file with a single-line `// marker` prepended. The
 * marker is emitted outside the AST because AST-level leading comments
 * on the first statement are finicky across printer versions. This also
 * guarantees `firstLine === `// ${marker}`` regardless of AST content.
 */
export function printWithMarker(
  marker: string,
  statements: readonly ts.Statement[],
): string {
  return `// ${marker}\n${printStatements(statements)}`;
}

// ── Expression helpers ────────────────────────────────────────────────

/**
 * Build a JSON-like literal value as a `ts.Expression`. Supports
 * strings, numbers, booleans, null, arrays, and plain object literals.
 * Arbitrary nesting is allowed.
 */
export type JsonLike =
  | string
  | number
  | boolean
  | null
  | readonly JsonLike[]
  | { readonly [key: string]: JsonLike };

export function jsonExpr(value: JsonLike): ts.Expression {
  if (value === null) return ts.factory.createNull();
  if (typeof value === 'string') return ts.factory.createStringLiteral(value);
  if (typeof value === 'number') {
    return value < 0
      ? ts.factory.createPrefixUnaryExpression(
          ts.SyntaxKind.MinusToken,
          ts.factory.createNumericLiteral(-value),
        )
      : ts.factory.createNumericLiteral(value);
  }
  if (typeof value === 'boolean') {
    return value ? ts.factory.createTrue() : ts.factory.createFalse();
  }
  if (Array.isArray(value)) {
    return ts.factory.createArrayLiteralExpression(
      value.map((v) => jsonExpr(v as JsonLike)),
      false,
    );
  }
  const obj = value as { readonly [key: string]: JsonLike };
  const props: ts.ObjectLiteralElementLike[] = [];
  for (const key of Object.keys(obj)) {
    props.push(
      ts.factory.createPropertyAssignment(
        ts.factory.createStringLiteral(key),
        jsonExpr(obj[key]!),
      ),
    );
  }
  return ts.factory.createObjectLiteralExpression(props, true);
}

/**
 * A `[key, value]` tuple literal for Map-constructor arrays. Used for
 * `RISK_MAP` and similar lookup tables.
 */
export function tupleLiteral(
  key: string,
  value: ts.Expression,
): ts.ArrayLiteralExpression {
  return ts.factory.createArrayLiteralExpression(
    [ts.factory.createStringLiteral(key), value],
    false,
  );
}

/**
 * Build a `new Map<string, T>([[k, v], ...])` expression from tuples.
 *
 * The generic type arguments are emitted so downstream consumers get
 * full tsc-strict type inference on `.get()` / `.set()`.
 */
export function newMapOfStringTo(
  valueType: ts.TypeNode,
  entries: ReadonlyArray<readonly [string, ts.Expression]>,
): ts.Expression {
  const tuples = entries.map(([k, v]) => tupleLiteral(k, v));
  return ts.factory.createNewExpression(
    ts.factory.createIdentifier('Map'),
    [ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword), valueType],
    [ts.factory.createArrayLiteralExpression(tuples, tuples.length > 0)],
  );
}

/**
 * Build a `new Set<string>([...])` expression. When `values` is empty,
 * the resulting literal still includes the generic type argument for
 * downstream inference.
 */
export function newSetOfString(values: readonly string[]): ts.Expression {
  return ts.factory.createNewExpression(
    ts.factory.createIdentifier('Set'),
    [ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)],
    [
      ts.factory.createArrayLiteralExpression(
        values.map((v) => ts.factory.createStringLiteral(v)),
        false,
      ),
    ],
  );
}

/**
 * Build a `new Set([...])` without a type argument — used when the
 * containing `new Map` already declares the Set's element type via its
 * value type parameter.
 */
export function newSetLiteral(values: readonly string[]): ts.Expression {
  return ts.factory.createNewExpression(
    ts.factory.createIdentifier('Set'),
    undefined,
    [
      ts.factory.createArrayLiteralExpression(
        values.map((v) => ts.factory.createStringLiteral(v)),
        false,
      ),
    ],
  );
}

// ── Type nodes ────────────────────────────────────────────────────────

/** `ReadonlyMap<string, T>` reference. */
export function readonlyMapType(valueType: ts.TypeNode): ts.TypeNode {
  return ts.factory.createTypeReferenceNode('ReadonlyMap', [
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    valueType,
  ]);
}

/** `ReadonlySet<string>` reference. */
export function readonlySetOfStringType(): ts.TypeNode {
  return ts.factory.createTypeReferenceNode('ReadonlySet', [
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
  ]);
}

/** `number` keyword. */
export function numberType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
}

/** `string | null | undefined` union. */
export function stringOrNullish(): ts.TypeNode {
  return ts.factory.createUnionTypeNode([
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
    ts.factory.createLiteralTypeNode(ts.factory.createNull()),
    ts.factory.createKeywordTypeNode(ts.SyntaxKind.UndefinedKeyword),
  ]);
}

/** `boolean` keyword. */
export function booleanType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
}

/** `string` keyword. */
export function stringType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
}

/** `void` keyword. */
export function voidType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
}

/** `unknown` keyword. */
export function unknownType(): ts.TypeNode {
  return ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
}

/**
 * `string | null` union — the common "nullable string" shape used in
 * handler return types (e.g. `blockReason: string | null`).
 */
export function stringOrNull(): ts.TypeNode {
  return ts.factory.createUnionTypeNode([
    stringType(),
    ts.factory.createLiteralTypeNode(ts.factory.createNull()),
  ]);
}

/** `Promise<T>` type reference. */
export function promiseType(inner: ts.TypeNode): ts.TypeNode {
  return ts.factory.createTypeReferenceNode('Promise', [inner]);
}

/** `T[]` / array type reference. */
export function arrayType(element: ts.TypeNode): ts.TypeNode {
  return ts.factory.createArrayTypeNode(element);
}

/**
 * A `{ key: T; ... }` type-literal node. Entries are emitted in order.
 * Property signatures are mutable-by-default — pass `readonly: true` on
 * a per-entry basis if `readonly` is required.
 */
export interface TypeLiteralEntry {
  readonly name: string;
  readonly type: ts.TypeNode;
  readonly readonly?: boolean;
}

export function typeLiteral(
  entries: readonly TypeLiteralEntry[],
): ts.TypeNode {
  return ts.factory.createTypeLiteralNode(
    entries.map((e) =>
      ts.factory.createPropertySignature(
        e.readonly === true
          ? [ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword)]
          : undefined,
        e.name,
        undefined,
        e.type,
      ),
    ),
  );
}

/**
 * String-literal-union type node, e.g. `'a' | 'b' | 'c'`.
 *
 * Empty input is rejected — a zero-member union is `never`, almost
 * always a codegen bug. Callers that mean `never` should build it
 * explicitly.
 */
export function stringLiteralUnion(members: readonly string[]): ts.TypeNode {
  if (members.length === 0) {
    throw new Error('stringLiteralUnion requires at least one member');
  }
  return ts.factory.createUnionTypeNode(
    members.map((m) =>
      ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral(m)),
    ),
  );
}

/**
 * Named type-alias declaration: `export type NAME = TYPE;` (or local
 * when `exported` is false).
 */
export function typeAlias(
  name: string,
  typeNode: ts.TypeNode,
  exported: boolean = false,
): ts.Statement {
  return ts.factory.createTypeAliasDeclaration(
    exported
      ? [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)]
      : undefined,
    name,
    undefined,
    typeNode,
  );
}

/**
 * Discriminated-union type alias from variant object shapes. Each
 * variant is described by the discriminant value and a map of
 * additional property → type node. The discriminant property name is
 * shared across variants.
 *
 * Emits:
 *   export type Name =
 *     | { kind: 'a'; <variantA props> }
 *     | { kind: 'b'; <variantB props> };
 */
export interface DiscriminatedVariant {
  readonly discriminantValue: string;
  readonly properties: ReadonlyArray<readonly [string, ts.TypeNode]>;
}

export function discriminatedUnion(
  name: string,
  discriminant: string,
  variants: readonly DiscriminatedVariant[],
  exported: boolean = true,
): ts.Statement {
  if (variants.length === 0) {
    throw new Error('discriminatedUnion requires at least one variant');
  }
  const variantTypes = variants.map((v) => {
    const members: ts.TypeElement[] = [
      ts.factory.createPropertySignature(
        [ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword)],
        discriminant,
        undefined,
        ts.factory.createLiteralTypeNode(
          ts.factory.createStringLiteral(v.discriminantValue),
        ),
      ),
    ];
    for (const [key, typeNode] of v.properties) {
      members.push(
        ts.factory.createPropertySignature(
          [ts.factory.createToken(ts.SyntaxKind.ReadonlyKeyword)],
          key,
          undefined,
          typeNode,
        ),
      );
    }
    return ts.factory.createTypeLiteralNode(members);
  });
  return typeAlias(
    name,
    ts.factory.createUnionTypeNode(variantTypes),
    exported,
  );
}

// ── Expression helpers: ternary and satisfies ────────────────────────

/**
 * Ternary conditional expression: `COND ? THEN : ELSE`.
 */
export function ternary(
  cond: ts.Expression,
  thenExpr: ts.Expression,
  elseExpr: ts.Expression,
): ts.Expression {
  return ts.factory.createConditionalExpression(
    cond,
    ts.factory.createToken(ts.SyntaxKind.QuestionToken),
    thenExpr,
    ts.factory.createToken(ts.SyntaxKind.ColonToken),
    elseExpr,
  );
}

/**
 * `EXPR as const satisfies TYPE` — the idiom for pinning a literal
 * value's inferred type to an exact constant while asserting assignment
 * compatibility with a nominal type. Used in OC's fail-mode table and
 * anywhere paid-tier emitters build lookup tables with narrow values.
 */
export function asConstSatisfies(
  expr: ts.Expression,
  typeNode: ts.TypeNode,
): ts.Expression {
  const asConst = ts.factory.createAsExpression(
    expr,
    ts.factory.createTypeReferenceNode('const', undefined),
  );
  return ts.factory.createSatisfiesExpression(asConst, typeNode);
}

// ── Statement helpers ─────────────────────────────────────────────────

/**
 * `const NAME: TYPE = EXPR;` top-level typed declaration.
 */
export function typedConst(
  name: string,
  typeNode: ts.TypeNode,
  initializer: ts.Expression,
): ts.Statement {
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          name,
          undefined,
          typeNode,
          initializer,
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );
}

/**
 * `export default { ... };` object literal.
 */
export function exportDefaultObject(
  properties: ReadonlyArray<readonly [string, ts.Expression]>,
): ts.Statement {
  const objProps = properties.map(([k, v]) =>
    ts.factory.createPropertyAssignment(
      ts.factory.createIdentifier(k),
      v,
    ),
  );
  return ts.factory.createExportAssignment(
    undefined,
    false,
    ts.factory.createObjectLiteralExpression(objProps, true),
  );
}

/**
 * `export async function NAME(params): RET { BODY }` declaration.
 */
export function exportedAsyncFunction(
  name: string,
  parameters: readonly ts.ParameterDeclaration[],
  returnType: ts.TypeNode,
  body: readonly ts.Statement[],
): ts.Statement {
  return ts.factory.createFunctionDeclaration(
    [
      ts.factory.createToken(ts.SyntaxKind.ExportKeyword),
      ts.factory.createToken(ts.SyntaxKind.AsyncKeyword),
    ],
    undefined,
    name,
    undefined,
    parameters,
    returnType,
    ts.factory.createBlock(body, true),
  );
}

/**
 * `export function NAME(params): RET { BODY }` declaration.
 */
export function exportedFunction(
  name: string,
  parameters: readonly ts.ParameterDeclaration[],
  returnType: ts.TypeNode,
  body: readonly ts.Statement[],
): ts.Statement {
  return ts.factory.createFunctionDeclaration(
    [ts.factory.createToken(ts.SyntaxKind.ExportKeyword)],
    undefined,
    name,
    undefined,
    parameters,
    returnType,
    ts.factory.createBlock(body, true),
  );
}

/**
 * `function NAME(params): RET { BODY }` declaration (not exported).
 */
export function localFunction(
  name: string,
  parameters: readonly ts.ParameterDeclaration[],
  returnType: ts.TypeNode,
  body: readonly ts.Statement[],
): ts.Statement {
  return ts.factory.createFunctionDeclaration(
    undefined,
    undefined,
    name,
    undefined,
    parameters,
    returnType,
    ts.factory.createBlock(body, true),
  );
}

/**
 * A single parameter declaration: `name: type`.
 */
export function param(name: string, typeNode: ts.TypeNode): ts.ParameterDeclaration {
  return ts.factory.createParameterDeclaration(
    undefined,
    undefined,
    name,
    undefined,
    typeNode,
    undefined,
  );
}

/**
 * `return EXPR;` statement.
 */
export function returnStmt(expr: ts.Expression): ts.Statement {
  return ts.factory.createReturnStatement(expr);
}

/**
 * `if (COND) { THEN }` (no else).
 */
export function ifStmt(
  condition: ts.Expression,
  thenStatements: readonly ts.Statement[],
): ts.Statement {
  return ts.factory.createIfStatement(
    condition,
    ts.factory.createBlock(thenStatements, true),
    undefined,
  );
}

// ── Expression primitives ─────────────────────────────────────────────

/** `NAME` identifier expression. */
export function id(name: string): ts.Identifier {
  return ts.factory.createIdentifier(name);
}

/** `"..."` string literal. */
export function str(value: string): ts.Expression {
  return ts.factory.createStringLiteral(value);
}

/** Numeric literal. Callers should handle negatives via `jsonExpr`. */
export function num(value: number): ts.Expression {
  return ts.factory.createNumericLiteral(value);
}

/** `true` / `false` boolean literal. */
export function bool(value: boolean): ts.Expression {
  return value ? ts.factory.createTrue() : ts.factory.createFalse();
}

/** `null` literal. */
export function nullLit(): ts.Expression {
  return ts.factory.createNull();
}

/** `typeof EXPR` expression. */
export function typeofExpr(expr: ts.Expression): ts.Expression {
  return ts.factory.createTypeOfExpression(expr);
}

/** `!EXPR` logical-not expression. */
export function notExpr(expr: ts.Expression): ts.Expression {
  return ts.factory.createPrefixUnaryExpression(
    ts.SyntaxKind.ExclamationToken,
    expr,
  );
}

/**
 * Named binary operators used by the emit path. Each keyword maps to
 * the corresponding `ts.SyntaxKind` token internally so callers don't
 * pass raw syntax-kind constants.
 */
export type BinaryOp =
  | '==='
  | '=='
  | '!=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | '+'
  | '&&'
  | '||'
  | '??';

const BINARY_OPS: Record<BinaryOp, ts.BinaryOperator> = {
  '===': ts.SyntaxKind.EqualsEqualsEqualsToken,
  '==': ts.SyntaxKind.EqualsEqualsToken,
  '!==': ts.SyntaxKind.ExclamationEqualsEqualsToken,
  '!=': ts.SyntaxKind.ExclamationEqualsToken,
  '<': ts.SyntaxKind.LessThanToken,
  '<=': ts.SyntaxKind.LessThanEqualsToken,
  '>': ts.SyntaxKind.GreaterThanToken,
  '>=': ts.SyntaxKind.GreaterThanEqualsToken,
  '+': ts.SyntaxKind.PlusToken,
  '&&': ts.SyntaxKind.AmpersandAmpersandToken,
  '||': ts.SyntaxKind.BarBarToken,
  '??': ts.SyntaxKind.QuestionQuestionToken,
};

/** `LEFT OP RIGHT` binary expression. */
export function binary(
  left: ts.Expression,
  op: BinaryOp,
  right: ts.Expression,
): ts.Expression {
  return ts.factory.createBinaryExpression(left, BINARY_OPS[op], right);
}

/** `OBJ.NAME` property-access expression. */
export function propAccess(obj: ts.Expression, name: string): ts.Expression {
  return ts.factory.createPropertyAccessExpression(obj, name);
}

/** `FN(...ARGS)` call expression. */
export function call(
  callee: ts.Expression,
  args: readonly ts.Expression[],
): ts.Expression {
  return ts.factory.createCallExpression(callee, undefined, args);
}

/**
 * `{ KEY: VALUE, ... }` object-literal expression with one property per
 * entry. When `multiline` is true, the printer formats each property on
 * its own line.
 */
export function objectLit(
  entries: ReadonlyArray<readonly [string, ts.Expression]>,
  multiline: boolean = false,
): ts.Expression {
  return ts.factory.createObjectLiteralExpression(
    entries.map(([k, v]) => ts.factory.createPropertyAssignment(k, v)),
    multiline,
  );
}

/** `[ELT, ELT, ...]` array-literal expression. */
export function arrayLit(
  elements: readonly ts.Expression[],
  multiline: boolean = false,
): ts.Expression {
  return ts.factory.createArrayLiteralExpression(elements, multiline);
}

/**
 * Template-string expression: `HEAD${SPAN0_EXPR}MIDDLE${SPAN1_EXPR}TAIL`.
 *
 * The caller supplies the head text, a list of `{ expr, text }` spans
 * where `text` follows the expression, and the final tail text. When
 * there's only one span, `text` is the tail.
 */
export interface TemplateSpan {
  readonly expr: ts.Expression;
  readonly text: string;
}

export function templateStr(
  head: string,
  spans: readonly TemplateSpan[],
): ts.Expression {
  if (spans.length === 0) {
    return ts.factory.createStringLiteral(head);
  }
  const built: ts.TemplateSpan[] = spans.map((s, i) => {
    const isLast = i === spans.length - 1;
    return ts.factory.createTemplateSpan(
      s.expr,
      isLast
        ? ts.factory.createTemplateTail(s.text)
        : ts.factory.createTemplateMiddle(s.text),
    );
  });
  return ts.factory.createTemplateExpression(
    ts.factory.createTemplateHead(head),
    built,
  );
}

/** `new CTOR(...ARGS)` expression without type arguments. */
export function newExpr(
  ctor: ts.Expression,
  args: readonly ts.Expression[],
): ts.Expression {
  return ts.factory.createNewExpression(ctor, undefined, args);
}

// ── Statement primitives ──────────────────────────────────────────────

/** `EXPR;` expression statement. */
export function exprStmt(expr: ts.Expression): ts.Statement {
  return ts.factory.createExpressionStatement(expr);
}

/** `const NAME = INIT;` — without a type annotation. */
export function constDecl(
  name: string,
  initializer: ts.Expression,
): ts.Statement {
  return ts.factory.createVariableStatement(
    undefined,
    ts.factory.createVariableDeclarationList(
      [
        ts.factory.createVariableDeclaration(
          name,
          undefined,
          undefined,
          initializer,
        ),
      ],
      ts.NodeFlags.Const,
    ),
  );
}

// ── Imports ───────────────────────────────────────────────────────────

/**
 * `import NAME from 'MODULE';` — default-specifier import.
 */
export function defaultImport(name: string, moduleSpecifier: string): ts.Statement {
  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      false,
      ts.factory.createIdentifier(name),
      undefined,
    ),
    ts.factory.createStringLiteral(moduleSpecifier),
  );
}

/**
 * `import { a, b as c } from 'MODULE';` — named-specifier import.
 *
 * Each entry is a name or a `{ name, alias }` pair. Type-only imports
 * are supported via the `typeOnly` flag on the whole clause.
 */
export interface NamedImportEntry {
  readonly name: string;
  readonly alias?: string;
}

export function namedImport(
  entries: readonly (string | NamedImportEntry)[],
  moduleSpecifier: string,
  typeOnly: boolean = false,
): ts.Statement {
  const specifiers = entries.map((e) => {
    if (typeof e === 'string') {
      return ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(e));
    }
    return ts.factory.createImportSpecifier(
      false,
      e.alias === undefined ? undefined : ts.factory.createIdentifier(e.name),
      ts.factory.createIdentifier(e.alias ?? e.name),
    );
  });
  return ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      typeOnly,
      undefined,
      ts.factory.createNamedImports(specifiers),
    ),
    ts.factory.createStringLiteral(moduleSpecifier),
  );
}

// ── SourceFile assembly ───────────────────────────────────────────────

/**
 * Public `createSourceFile` helper. Returns a blank `ts.SourceFile` that
 * callers can feed into `ts.factory.updateSourceFile(...)` or into the
 * printer directly via `printStatements` / `printWithMarker`. The name
 * defaults to `__emit__.ts` because the source is always printed, never
 * written to this virtual path.
 *
 * Paid-tier emitters (and the free-tier OC emitter) should use this
 * helper rather than calling `ts.createSourceFile` so every emit path
 * shares the same ScriptTarget and ScriptKind (CL-14 §1.2 determinism).
 */
export function createSourceFile(fileName: string = '__emit__.ts'): ts.SourceFile {
  return ts.createSourceFile(
    fileName,
    '',
    ts.ScriptTarget.ES2022,
    false,
    ts.ScriptKind.TS,
  );
}

// ── Re-export ts for callers needing factory access directly ─────────

export { ts };
