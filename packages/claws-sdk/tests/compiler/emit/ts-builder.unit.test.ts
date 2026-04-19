/**
 * L0: ts-builder unit tests.
 *
 * Verifies each AST factory helper emits syntactically valid TypeScript
 * and that the printed output contains the semantic contracts callers
 * depend on. These tests intentionally match on substrings and regex,
 * not exact byte formatting, so a typescript printer upgrade does not
 * break them.
 */

import { describe, it, expect } from 'vitest';
import ts from 'typescript';
import {
  arrayLit,
  arrayType,
  asConstSatisfies,
  binary,
  bool,
  booleanType,
  call,
  constDecl,
  createSourceFile,
  defaultImport,
  discriminatedUnion,
  exportDefaultObject,
  exportedAsyncFunction,
  exportedFunction,
  exprStmt,
  id,
  ifStmt,
  jsonExpr,
  localFunction,
  namedImport,
  newExpr,
  newMapOfStringTo,
  newSetLiteral,
  newSetOfString,
  notExpr,
  nullLit,
  num,
  numberType,
  objectLit,
  param,
  printStatements,
  printWithMarker,
  promiseType,
  propAccess,
  readonlyMapType,
  readonlySetOfStringType,
  returnStmt,
  str,
  stringLiteralUnion,
  stringOrNull,
  stringOrNullish,
  stringType,
  templateStr,
  ternary,
  tupleLiteral,
  typeAlias,
  typeLiteral,
  typedConst,
  typeofExpr,
  unknownType,
  voidType,
} from '#src/compiler/emit/ts-builder.js';

describe('ts-builder printing', () => {
  it('printStatements ends with a trailing newline', () => {
    const stmt = typedConst(
      'X',
      numberType(),
      ts.factory.createNumericLiteral(1),
    );
    const out = printStatements([stmt]);
    expect(out.endsWith('\n')).toBe(true);
  });

  it('printStatements on an empty statement list still ends with a newline', () => {
    // Forces the non-newline branch of the printer → append fallback.
    const out = printStatements([]);
    expect(out.endsWith('\n')).toBe(true);
  });

  it('printWithMarker prepends "// marker\\n" on line 1', () => {
    const stmt = typedConst(
      'X',
      numberType(),
      ts.factory.createNumericLiteral(1),
    );
    const out = printWithMarker('hello:v1', [stmt]);
    expect(out.split('\n')[0]).toBe('// hello:v1');
  });
});

describe('ts-builder json literals', () => {
  it('jsonExpr handles strings, numbers, booleans, null', () => {
    const outStr = printStatements([
      typedConst(
        'S',
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        jsonExpr('abc'),
      ),
    ]);
    expect(outStr).toContain('"abc"');

    const outNum = printStatements([
      typedConst('N', numberType(), jsonExpr(42)),
    ]);
    expect(outNum).toContain('42');

    const outBool = printStatements([
      typedConst('B', booleanType(), jsonExpr(true)),
    ]);
    expect(outBool).toContain('true');

    const outNull = printStatements([
      typedConst(
        'X',
        ts.factory.createLiteralTypeNode(ts.factory.createNull()),
        jsonExpr(null),
      ),
    ]);
    expect(outNull).toContain('null');

    const outFalse = printStatements([
      typedConst('B2', booleanType(), jsonExpr(false)),
    ]);
    expect(outFalse).toContain('false');
  });

  it('jsonExpr emits negative numbers as unary minus expressions', () => {
    const out = printStatements([
      typedConst('N', numberType(), jsonExpr(-7)),
    ]);
    expect(out).toContain('-7');
  });

  it('jsonExpr handles arrays and nested objects', () => {
    const out = printStatements([
      typedConst(
        'O',
        ts.factory.createTypeReferenceNode('Record', [
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
        ]),
        jsonExpr({ a: [1, 2], b: { c: 'x' } }),
      ),
    ]);
    expect(out).toMatch(/"a":\s*\[\s*1,\s*2\s*\]/);
    expect(out).toMatch(/"b":\s*\{/);
    expect(out).toMatch(/"c":\s*"x"/);
  });
});

describe('ts-builder Map/Set constructors', () => {
  it('newMapOfStringTo emits a typed Map with tuple entries', () => {
    const expr = newMapOfStringTo(numberType(), [
      ['a', ts.factory.createNumericLiteral(1)],
      ['b', ts.factory.createNumericLiteral(2)],
    ]);
    const out = printStatements([
      typedConst('M', readonlyMapType(numberType()), expr),
    ]);
    expect(out).toMatch(/new Map<string,\s*number>/);
    expect(out).toContain('["a", 1]');
    expect(out).toContain('["b", 2]');
  });

  it('newMapOfStringTo with zero entries preserves generic args', () => {
    const expr = newMapOfStringTo(numberType(), []);
    const out = printStatements([
      typedConst('M', readonlyMapType(numberType()), expr),
    ]);
    expect(out).toMatch(/new Map<string,\s*number>\(\s*\[\s*\]\s*\)/);
  });

  it('newSetOfString emits a typed Set with string element type', () => {
    const expr = newSetOfString(['x', 'y']);
    const out = printStatements([
      typedConst('S', readonlySetOfStringType(), expr),
    ]);
    expect(out).toMatch(/new Set<string>/);
    expect(out).toContain('"x"');
    expect(out).toContain('"y"');
  });

  it('newSetLiteral emits an untyped Set for inside-Map use', () => {
    const expr = newSetLiteral(['a']);
    const out = printStatements([
      typedConst('X', readonlySetOfStringType(), expr),
    ]);
    expect(out).toContain('new Set(');
    expect(out).not.toMatch(/new Set<string>/);
  });

  it('tupleLiteral produces a two-element array literal', () => {
    const arr = tupleLiteral('key', ts.factory.createNumericLiteral(9));
    const out = printStatements([
      typedConst(
        'T',
        ts.factory.createArrayTypeNode(
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword),
        ),
        arr,
      ),
    ]);
    expect(out).toContain('["key", 9]');
  });
});

describe('ts-builder type nodes', () => {
  it('stringOrNullish is `string | null | undefined`', () => {
    const out = printStatements([
      ts.factory.createFunctionDeclaration(
        undefined,
        undefined,
        'f',
        undefined,
        [param('x', stringOrNullish())],
        ts.factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
        ts.factory.createBlock([], false),
      ),
    ]);
    expect(out).toMatch(/x:\s*string\s*\|\s*null\s*\|\s*undefined/);
  });

  // CC-7 — direct semantic assertions for type-node helpers that would
  // otherwise only be transitively exercised. 100% numerical coverage via
  // helper reuse lets silent regressions (e.g. `numberType` → `bigint`,
  // `readonlyMapType` → mutable `Map`) pass unnoticed.
  it('numberType emits the `number` keyword annotation', () => {
    const out = printStatements([
      typedConst('N', numberType(), ts.factory.createNumericLiteral(1)),
    ]);
    expect(out).toMatch(/const\s+N:\s*number\s*=/);
  });

  it('booleanType emits the `boolean` keyword annotation', () => {
    const out = printStatements([
      typedConst('B', booleanType(), ts.factory.createTrue()),
    ]);
    expect(out).toMatch(/const\s+B:\s*boolean\s*=/);
  });

  it('readonlyMapType annotates as `ReadonlyMap<string, T>`', () => {
    const out = printStatements([
      typedConst(
        'M',
        readonlyMapType(numberType()),
        newMapOfStringTo(numberType(), []),
      ),
    ]);
    expect(out).toMatch(/const\s+M:\s*ReadonlyMap<string,\s*number>/);
  });

  it('readonlySetOfStringType annotates as `ReadonlySet<string>`', () => {
    const out = printStatements([
      typedConst(
        'S',
        readonlySetOfStringType(),
        newSetOfString([]),
      ),
    ]);
    expect(out).toMatch(/const\s+S:\s*ReadonlySet<string>/);
  });
});

describe('ts-builder typed declarations and parameters', () => {
  // CC-7 — direct semantic assertions for `typedConst`, `param`, and
  // `returnStmt`. Prior to this, these three helpers were only asserted
  // transitively through other tests' use of them as arguments.
  it('typedConst emits `const NAME: TYPE = INITIALIZER;`', () => {
    const out = printStatements([
      typedConst('Count', numberType(), ts.factory.createNumericLiteral(42)),
    ]);
    expect(out).toMatch(/const\s+Count:\s*number\s*=\s*42\s*;/);
  });

  it('param with returnStmt renders typed signature and return expression', () => {
    const fn = localFunction(
      'identity',
      [param('value', numberType())],
      numberType(),
      [returnStmt(ts.factory.createIdentifier('value'))],
    );
    const out = printStatements([fn]);
    // param: emits `value: number` in the signature
    expect(out).toMatch(/\(\s*value:\s*number\s*\)/);
    // returnStmt: emits `return value;` with trailing semicolon
    expect(out).toMatch(/return\s+value\s*;/);
  });
});

describe('ts-builder function declarations', () => {
  it('exportedAsyncFunction emits `export async function`', () => {
    const fn = exportedAsyncFunction(
      'run',
      [param('x', numberType())],
      ts.factory.createTypeReferenceNode('Promise', [numberType()]),
      [returnStmt(ts.factory.createIdentifier('x'))],
    );
    const out = printStatements([fn]);
    expect(out).toMatch(/export\s+async\s+function\s+run/);
    expect(out).toContain('return x;');
  });

  it('exportedFunction emits `export function` without async', () => {
    const fn = exportedFunction(
      'sum',
      [param('a', numberType()), param('b', numberType())],
      numberType(),
      [
        returnStmt(
          ts.factory.createBinaryExpression(
            ts.factory.createIdentifier('a'),
            ts.factory.createToken(ts.SyntaxKind.PlusToken),
            ts.factory.createIdentifier('b'),
          ),
        ),
      ],
    );
    const out = printStatements([fn]);
    expect(out).toMatch(/export\s+function\s+sum/);
    expect(out).not.toMatch(/export\s+async/);
    expect(out).toContain('return a + b;');
  });

  it('localFunction emits a non-exported function', () => {
    const fn = localFunction(
      'helper',
      [],
      booleanType(),
      [returnStmt(ts.factory.createTrue())],
    );
    const out = printStatements([fn]);
    expect(out).toMatch(/function\s+helper/);
    expect(out).not.toMatch(/export\s+function\s+helper/);
  });
});

describe('ts-builder control flow and exports', () => {
  it('ifStmt emits an if block with body statements', () => {
    const stmt = ifStmt(
      ts.factory.createTrue(),
      [returnStmt(ts.factory.createNumericLiteral(1))],
    );
    const out = printStatements([
      ts.factory.createFunctionDeclaration(
        undefined,
        undefined,
        'f',
        undefined,
        [],
        numberType(),
        ts.factory.createBlock(
          [stmt, returnStmt(ts.factory.createNumericLiteral(0))],
          true,
        ),
      ),
    ]);
    expect(out).toMatch(/if\s*\(true\)/);
    expect(out).toContain('return 1;');
  });

  it('exportDefaultObject emits `export default {...}`', () => {
    const stmt = exportDefaultObject([
      ['name', ts.factory.createStringLiteral('widget')],
      ['count', ts.factory.createNumericLiteral(3)],
    ]);
    const out = printStatements([stmt]);
    expect(out).toMatch(/export\s+default\s+\{/);
    expect(out).toContain('name: "widget"');
    expect(out).toContain('count: 3');
  });
});

describe('ts-builder type aliases and unions', () => {
  it('stringLiteralUnion emits `"a" | "b" | "c"`', () => {
    const out = printStatements([
      typeAlias('Mode', stringLiteralUnion(['open', 'closed']), true),
    ]);
    expect(out).toMatch(/export\s+type\s+Mode\s*=\s*"open"\s*\|\s*"closed"/);
  });

  it('stringLiteralUnion throws on empty input', () => {
    expect(() => stringLiteralUnion([])).toThrow(/at least one member/);
  });

  it('typeAlias emits `type X = Y;` without export when exported=false', () => {
    const out = printStatements([typeAlias('Local', booleanType(), false)]);
    expect(out).toMatch(/type\s+Local\s*=\s*boolean/);
    expect(out).not.toMatch(/export\s+type\s+Local/);
  });

  it('typeAlias defaults to non-exported (no `export` prefix)', () => {
    const out = printStatements([typeAlias('Default', numberType())]);
    expect(out).not.toMatch(/export\s+type\s+Default/);
  });

  it('discriminatedUnion emits a tagged union of variant object types', () => {
    const out = printStatements([
      discriminatedUnion(
        'Risk',
        'kind',
        [
          {
            discriminantValue: 'low',
            properties: [['level', numberType()]],
          },
          {
            discriminantValue: 'high',
            properties: [
              ['level', numberType()],
              ['reason', ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword)],
            ],
          },
        ],
      ),
    ]);
    expect(out).toMatch(/export\s+type\s+Risk\s*=/);
    expect(out).toContain('"low"');
    expect(out).toContain('"high"');
    expect(out).toMatch(/readonly\s+level:\s*number/);
    expect(out).toMatch(/readonly\s+reason:\s*string/);
  });

  it('discriminatedUnion throws on empty variants', () => {
    expect(() => discriminatedUnion('Empty', 'kind', [])).toThrow(
      /at least one variant/,
    );
  });
});

describe('ts-builder printer configuration contract', () => {
  // CC-8 — CL-14 §1.2 requires the singleton printer to set all three keys
  // explicitly: `newLine: LineFeed`, `removeComments: false`,
  // `omitTrailingSemicolon: false`. This behavioral test pins the contract
  // by exercising each option through observable output, so a future edit
  // that silently drops a key fails loudly here.

  it('newLine: LineFeed — output contains only LF, never CRLF', () => {
    const stmt = typedConst(
      'X',
      numberType(),
      ts.factory.createNumericLiteral(1),
    );
    const fn = localFunction(
      'f',
      [],
      numberType(),
      [returnStmt(ts.factory.createNumericLiteral(2))],
    );
    const out = printStatements([stmt, fn]);
    expect(out).toContain('\n');
    expect(out).not.toContain('\r\n');
    expect(out).not.toContain('\r');
  });

  it('removeComments: false — synthetic leading comment is preserved', () => {
    const stmt = typedConst(
      'Flagged',
      numberType(),
      ts.factory.createNumericLiteral(7),
    );
    ts.addSyntheticLeadingComment(
      stmt,
      ts.SyntaxKind.SingleLineCommentTrivia,
      ' CL-14 §1.2 comment contract',
      true,
    );
    const out = printStatements([stmt]);
    expect(out).toContain('// CL-14 §1.2 comment contract');
  });

  it('omitTrailingSemicolon: false — statements retain trailing `;`', () => {
    const stmt = typedConst(
      'Tail',
      numberType(),
      ts.factory.createNumericLiteral(3),
    );
    const out = printStatements([stmt]);
    // The const declaration must terminate in `;` — this is the canary
    // for `omitTrailingSemicolon: false`. If someone flips it to true, the
    // statement prints as `const Tail: number = 3` with no semicolon.
    expect(out).toMatch(/=\s*3\s*;/);
  });
});

describe('ts-builder ternary and satisfies', () => {
  it('ternary emits a conditional expression `a ? b : c`', () => {
    const expr = ternary(
      ts.factory.createIdentifier('x'),
      ts.factory.createNumericLiteral(1),
      ts.factory.createNumericLiteral(2),
    );
    const out = printStatements([
      typedConst('R', numberType(), expr),
    ]);
    expect(out).toMatch(/x\s*\?\s*1\s*:\s*2/);
  });

  it('asConstSatisfies emits `expr as const satisfies T`', () => {
    const expr = asConstSatisfies(
      ts.factory.createObjectLiteralExpression(
        [
          ts.factory.createPropertyAssignment(
            'tier',
            ts.factory.createStringLiteral('free'),
          ),
        ],
        false,
      ),
      ts.factory.createTypeLiteralNode([
        ts.factory.createPropertySignature(
          undefined,
          'tier',
          undefined,
          ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
        ),
      ]),
    );
    const out = printStatements([
      typedConst(
        'CONFIG',
        ts.factory.createTypeLiteralNode([
          ts.factory.createPropertySignature(
            undefined,
            'tier',
            undefined,
            ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
          ),
        ]),
        expr,
      ),
    ]);
    expect(out).toContain('as const satisfies');
    expect(out).toContain('tier: "free"');
  });
});

// ── CL-14 §3.1 sub-builder completeness ──────────────────────────────

describe('ts-builder keyword types', () => {
  it('stringType emits the `string` keyword', () => {
    const out = printStatements([typedConst('S', stringType(), str('x'))]);
    expect(out).toMatch(/:\s*string\s*=/);
  });

  it('voidType emits `void` in a return position', () => {
    const fn = exportedFunction(
      'noop',
      [],
      voidType(),
      [returnStmt(ts.factory.createVoidExpression(num(0)))],
    );
    const out = printStatements([fn]);
    expect(out).toMatch(/\):\s*void\s*\{/);
  });

  it('unknownType emits `unknown`', () => {
    const out = printStatements([
      ts.factory.createFunctionDeclaration(
        undefined, undefined, 'f', undefined,
        [param('x', unknownType())],
        voidType(),
        ts.factory.createBlock([], false),
      ),
    ]);
    expect(out).toMatch(/x:\s*unknown/);
  });

  it('stringOrNull emits `string | null` without undefined', () => {
    const out = printStatements([typedConst('X', stringOrNull(), nullLit())]);
    expect(out).toMatch(/:\s*string\s*\|\s*null\s*=/);
    expect(out).not.toMatch(/undefined/);
  });

  it('promiseType wraps its inner type in `Promise<...>`', () => {
    const out = printStatements([typedConst('P', promiseType(numberType()), id('Promise.resolve(1)'))]);
    expect(out).toContain('Promise<number>');
  });

  it('arrayType emits `T[]`', () => {
    const out = printStatements([typedConst('A', arrayType(numberType()), arrayLit([]))]);
    expect(out).toMatch(/:\s*number\[\]\s*=/);
  });
});

describe('ts-builder typeLiteral', () => {
  it('typeLiteral emits a `{ key: T; ... }` type node', () => {
    const out = printStatements([
      typedConst(
        'X',
        typeLiteral([
          { name: 'a', type: numberType() },
          { name: 'b', type: stringType() },
        ]),
        objectLit([['a', num(1)], ['b', str('x')]]),
      ),
    ]);
    expect(out).toMatch(/a:\s*number/);
    expect(out).toMatch(/b:\s*string/);
  });

  it('typeLiteral applies `readonly` when entry.readonly is true', () => {
    const out = printStatements([
      typedConst(
        'X',
        typeLiteral([{ name: 'frozen', type: numberType(), readonly: true }]),
        objectLit([['frozen', num(1)]]),
      ),
    ]);
    expect(out).toMatch(/readonly\s+frozen:\s*number/);
  });
});

describe('ts-builder expression primitives', () => {
  it('id emits a bare identifier reference', () => {
    const out = printStatements([constDecl('X', id('foo'))]);
    expect(out).toMatch(/const\s+X\s*=\s*foo/);
  });

  it('str, num, bool, nullLit emit the corresponding literals', () => {
    const outS = printStatements([constDecl('S', str('hi'))]);
    expect(outS).toContain('"hi"');
    const outN = printStatements([constDecl('N', num(3))]);
    expect(outN).toContain('3');
    const outT = printStatements([constDecl('T', bool(true))]);
    expect(outT).toContain('true');
    const outF = printStatements([constDecl('F', bool(false))]);
    expect(outF).toContain('false');
    const outNull = printStatements([constDecl('Z', nullLit())]);
    expect(outNull).toContain('null');
  });

  it('typeofExpr emits `typeof EXPR`', () => {
    const out = printStatements([constDecl('T', typeofExpr(id('x')))]);
    expect(out).toContain('typeof x');
  });

  it('notExpr emits `!EXPR`', () => {
    const out = printStatements([constDecl('B', notExpr(id('x')))]);
    expect(out).toContain('!x');
  });

  it('binary covers every BinaryOp operator', () => {
    const cases: Array<[Parameters<typeof binary>[1], string]> = [
      ['===', 'a === b'], ['==', 'a == b'],
      ['!==', 'a !== b'], ['!=', 'a != b'],
      ['<', 'a < b'], ['<=', 'a <= b'],
      ['>', 'a > b'], ['>=', 'a >= b'],
      ['+', 'a + b'],
      ['&&', 'a && b'], ['||', 'a || b'],
      ['??', 'a ?? b'],
    ];
    for (const [op, expected] of cases) {
      const out = printStatements([constDecl('R', binary(id('a'), op, id('b')))]);
      expect(out).toContain(expected);
    }
  });

  it('propAccess emits `obj.name`', () => {
    const out = printStatements([constDecl('P', propAccess(id('obj'), 'prop'))]);
    expect(out).toContain('obj.prop');
  });

  it('call emits `fn(args)`', () => {
    const out = printStatements([constDecl('C', call(id('fn'), [id('a'), num(1)]))]);
    expect(out).toMatch(/fn\(a,\s*1\)/);
  });

  it('newExpr emits `new CTOR(args)` with no type arguments', () => {
    const out = printStatements([
      constDecl('M', newExpr(id('Map'), [arrayLit([])])),
    ]);
    expect(out).toMatch(/new Map\(\s*\[\s*\]\s*\)/);
    expect(out).not.toMatch(/new Map<.*>\(/);
  });

  it('objectLit emits inline and multiline object literals', () => {
    const outFlat = printStatements([
      constDecl('O', objectLit([['a', num(1)], ['b', num(2)]])),
    ]);
    expect(outFlat).toMatch(/\{\s*a:\s*1,\s*b:\s*2\s*\}/);
    const outMulti = printStatements([
      constDecl('M', objectLit([['a', num(1)]], true)),
    ]);
    // Multiline formatting puts the property on its own line, which
    // forces a `\n` between `{` and the property.
    expect(outMulti).toMatch(/\{\s*\n\s+a:\s*1/);
  });

  it('arrayLit emits inline and multiline arrays', () => {
    const outFlat = printStatements([constDecl('A', arrayLit([num(1), num(2)]))]);
    expect(outFlat).toMatch(/\[\s*1,\s*2\s*\]/);
    const outMulti = printStatements([
      constDecl('A', arrayLit([num(1), num(2)], true)),
    ]);
    expect(outMulti).toMatch(/\[\s*\n\s+1/);
  });

  it('templateStr with zero spans degrades to a string literal', () => {
    const out = printStatements([constDecl('S', templateStr('static', []))]);
    expect(out).toContain('"static"');
  });

  it('templateStr with one span emits a template with a head and tail', () => {
    const out = printStatements([
      constDecl('S', templateStr('R', [{ expr: id('x'), text: '-end' }])),
    ]);
    expect(out).toMatch(/`R\$\{x\}-end`/);
  });

  it('templateStr with multiple spans emits middle spans', () => {
    const out = printStatements([
      constDecl(
        'S',
        templateStr('from "', [
          { expr: id('a'), text: '" to "' },
          { expr: id('b'), text: '" end' },
        ]),
      ),
    ]);
    expect(out).toMatch(/`from "\$\{a\}" to "\$\{b\}" end`/);
  });
});

describe('ts-builder statements and imports', () => {
  it('exprStmt wraps an expression as a statement', () => {
    const out = printStatements([exprStmt(call(id('log'), [str('hi')]))]);
    expect(out).toMatch(/log\("hi"\);/);
  });

  it('constDecl emits `const NAME = EXPR;` without a type annotation', () => {
    const out = printStatements([constDecl('X', num(42))]);
    expect(out).toMatch(/const\s+X\s*=\s*42/);
    expect(out).not.toMatch(/:\s*\w+\s*=/);
  });

  it('defaultImport emits `import X from "module";`', () => {
    const out = printStatements([defaultImport('ts', 'typescript')]);
    expect(out).toMatch(/import\s+ts\s+from\s+"typescript"/);
  });

  it('namedImport emits single- and multi-specifier imports', () => {
    const one = printStatements([namedImport(['foo'], 'pkg')]);
    expect(one).toMatch(/import\s+\{\s*foo\s*\}\s+from\s+"pkg"/);
    const many = printStatements([
      namedImport(['a', 'b'], 'pkg'),
    ]);
    expect(many).toMatch(/import\s+\{\s*a,\s*b\s*\}\s+from\s+"pkg"/);
  });

  it('namedImport emits aliased specifiers', () => {
    const out = printStatements([
      namedImport([{ name: 'foo', alias: 'bar' }], 'pkg'),
    ]);
    expect(out).toMatch(/import\s+\{\s*foo\s+as\s+bar\s*\}\s+from\s+"pkg"/);
  });

  it('namedImport accepts object entries without alias (alias undefined branch)', () => {
    const out = printStatements([
      namedImport([{ name: 'foo' }], 'pkg'),
    ]);
    expect(out).toMatch(/import\s+\{\s*foo\s*\}\s+from\s+"pkg"/);
    expect(out).not.toMatch(/\bas\b/);
  });

  it('namedImport with typeOnly=true emits `import type`', () => {
    const out = printStatements([namedImport(['Foo'], 'pkg', true)]);
    expect(out).toMatch(/import\s+type\s+\{\s*Foo\s*\}\s+from\s+"pkg"/);
  });
});

describe('ts-builder createSourceFile', () => {
  it('returns a SourceFile with ES2022 target and TS script kind', () => {
    const sf = createSourceFile();
    expect(sf.languageVersion).toBe(ts.ScriptTarget.ES2022);
    expect(sf.fileName).toBe('__emit__.ts');
  });

  it('accepts a custom file name', () => {
    const sf = createSourceFile('virtual.ts');
    expect(sf.fileName).toBe('virtual.ts');
  });
});
