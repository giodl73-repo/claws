/**
 * OCEmitter -- emits an OC Gateway plugin from OCWorkspaceIR + GovAnalysis.
 *
 * The output is a self-contained plugin directory with:
 *  - package.json (manifest, JSON)
 *  - claws-governance.config.json (policy config, JSON)
 *  - index.ts (plugin entrypoint, AST codegen)
 *  - handlers/before-tool-call.ts (tool gate, AST codegen)
 *  - handlers/a2a-firewall.ts (agent delegation gate, AST codegen)
 *  - handlers/elicitation-gate.ts (OBO elicitation gate, AST codegen)
 *
 * Design constraints:
 *  - Zero `@craftworks`-scoped imports in generated output
 *  - compileGuard is invoked before any content is generated
 *  - dryRun mode yields the same EmitResult without touching disk
 *  - Marker comment `// claws-governance:oc-gateway:v{version}` on line 1
 *    of every emitted TypeScript file (scenario emit-oc/S03)
 *  - TypeScript output is produced via `ts.factory` AST construction,
 *    not template-string concatenation, and passes tsc --strict.
 *
 * @module claws-sdk/compiler/emit/oc-emitter
 */

import type { OCWorkspaceIR, AgentsIR, ToolsIR } from '../ir/workspace-ir.js';
import type { GovAnalysis } from '../enforce/types.js';
import { compileGuard } from '../enforce/guard.js';
import { BaseEmitter } from './base-emitter.js';
import type {
  EmitDiagnostic,
  EmitResult,
  EmittedFile,
  EmitterOptions,
} from './types.js';
import {
  ts,
  arrayLit,
  arrayType,
  binary,
  booleanType,
  bool,
  call,
  constDecl,
  exportedAsyncFunction,
  exportedFunction,
  exprStmt,
  id,
  ifStmt,
  localFunction,
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
  ternary as ternaryExpr,
  typeLiteral,
  typedConst,
  typeofExpr,
  unknownType,
  voidType,
} from './ts-builder.js';

const DEFAULT_HOOK_TIMEOUT_MS = 5000;
const PLUGIN_RELATIVE_ROOT = 'plugins/claws-governance';

/**
 * Risk-level mapping from tool trust level.
 * TrustLevel 0-4 → risk 1-5 (unknown → 5).
 */
function trustToRisk(trustLevel: number): number {
  if (trustLevel <= 0) return 1;
  if (trustLevel >= 4) return 5;
  return trustLevel + 1;
}

/**
 * Build a `[name, risk]` tuple list from ToolsIR plus any blocked tools
 * elevated by GovAnalysis.enforcementPlan.blockedTools.
 */
function buildRiskTuples(
  tools: ToolsIR,
  analysis: GovAnalysis,
): ReadonlyArray<readonly [string, number]> {
  const riskMap = new Map<string, number>();
  for (const tool of tools.tools) {
    riskMap.set(tool.name, trustToRisk(tool.trustLevel));
  }
  for (const blocked of analysis.enforcementPlan.blockedTools) {
    riskMap.set(blocked, 5);
  }
  const tuples: Array<readonly [string, number]> = [];
  const names = Array.from(riskMap.keys()).sort();
  for (const name of names) {
    tuples.push([name, riskMap.get(name) as number] as const);
  }
  return tuples;
}

/**
 * Build delegation entries grouped by source agent. Targets are sorted
 * so output is deterministic.
 */
function buildDelegationEntries(
  agents: AgentsIR,
): ReadonlyArray<readonly [string, readonly string[]]> {
  const grouped = new Map<string, string[]>();
  for (const d of agents.delegations) {
    const existing = grouped.get(d.from);
    if (existing) existing.push(d.to);
    else grouped.set(d.from, [d.to]);
  }
  const entries: Array<readonly [string, readonly string[]]> = [];
  for (const key of Array.from(grouped.keys()).sort()) {
    const targets = grouped.get(key) as string[];
    entries.push([key, [...targets].sort()] as const);
  }
  return entries;
}

/**
 * Collect OBO-flagged tool names in sorted order.
 */
function buildOboTools(tools: ToolsIR): readonly string[] {
  const names: string[] = [];
  for (const tool of tools.tools) {
    if (tool.oboFlag) names.push(tool.name);
  }
  return names.sort();
}

/**
 * Generate the package.json manifest (JSON, not TypeScript).
 */
function generateManifest(ir: OCWorkspaceIR): string {
  const manifest = {
    name: 'claws-governance',
    version: ir.compiler.compilerVersion,
    description: 'Compiled governance enforcement plugin for OC Gateway',
    type: 'module',
    main: 'index.ts',
    engines: { node: '>=20' },
    dependencies: {},
  };
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

/**
 * Generate the policy config JSON embedded alongside handlers.
 */
function generateConfig(ir: OCWorkspaceIR, analysis: GovAnalysis): string {
  const config = {
    schemaVersion: ir.compiler.schemaVersion,
    compiler: {
      version: ir.compiler.compilerVersion,
      compiledAt: ir.compiler.compiledAt,
    },
    org: ir.identity.organization,
    team: ir.identity.team,
    blockedTools: [...analysis.enforcementPlan.blockedTools].sort(),
    requiredApprovals: [...analysis.enforcementPlan.requiredApprovals].sort(),
    auditOnlyRules: [...analysis.enforcementPlan.auditOnlyRules].sort(),
    effectiveR5Count: analysis.effectiveR5Count,
  };
  return `${JSON.stringify(config, null, 2)}\n`;
}

// ── TypeScript codegen via AST ────────────────────────────────────────

/**
 * Build the `RISK_MAP` typed-const statement used in index.ts and
 * before-tool-call.ts.
 */
function riskMapConst(
  riskTuples: ReadonlyArray<readonly [string, number]>,
): ts.Statement {
  const entries: Array<readonly [string, ts.Expression]> = riskTuples.map(
    ([name, risk]) => [name, num(risk)] as const,
  );
  return typedConst(
    'RISK_MAP',
    readonlyMapType(numberType()),
    newMapOfStringTo(numberType(), entries),
  );
}

/**
 * `function resolveFailMode(riskLevel: number): 'open' | 'closed'`
 * with body `return riskLevel <= 2 ? 'open' : 'closed';`
 */
function resolveFailModeFn(): ts.Statement {
  const returnType = stringLiteralUnion(['open', 'closed']);
  const cond = binary(id('riskLevel'), '<=', num(2));
  const body = ternaryExpr(cond, str('open'), str('closed'));
  return localFunction(
    'resolveFailMode',
    [param('riskLevel', numberType())],
    returnType,
    [returnStmt(body)],
  );
}

/**
 * Build the index.ts SourceFile.
 *
 * Structure:
 *   - marker comment (prepended by printWithMarker)
 *   - RISK_MAP const
 *   - resolveFailMode() function
 *   - export default { name, version, description, register }
 */
function generateIndex(
  ir: OCWorkspaceIR,
  riskTuples: ReadonlyArray<readonly [string, number]>,
): string {
  const version = ir.compiler.compilerVersion;
  const compiledAt = ir.compiler.compiledAt;
  const marker = `claws-governance:oc-gateway:v${version}`;

  // register(api) method body — uses RISK_MAP + resolveFailMode from
  // the surrounding module scope.
  //
  // The arrow function passed to `api.on('before_tool_call', ...)` and
  // the method declaration for `register` have no equivalent sub-builder
  // in ts-builder today — they are single-use shapes specific to the OC
  // plugin contract, so they're built via `ts.factory` inline and
  // composed from sub-builder pieces. Everything else routes through
  // ts-builder sub-builders.
  const arrowBody = [
    // const name = typeof toolName === 'string' ? toolName : null;
    constDecl(
      'name',
      ternaryExpr(
        binary(typeofExpr(id('toolName')), '===', str('string')),
        id('toolName'),
        nullLit(),
      ),
    ),
    // if (name === null) return { allowed: false, blockReason: '...' };
    ifStmt(binary(id('name'), '===', nullLit()), [
      returnStmt(
        objectLit([
          ['allowed', bool(false)],
          ['blockReason', str('Tool name is null or undefined')],
        ]),
      ),
    ]),
    // const riskLevel = RISK_MAP.get(name) ?? 5;
    constDecl(
      'riskLevel',
      binary(call(propAccess(id('RISK_MAP'), 'get'), [id('name')]), '??', num(5)),
    ),
    // return { allowed: resolveFailMode(riskLevel) === 'open', blockReason: null };
    returnStmt(
      objectLit([
        [
          'allowed',
          binary(call(id('resolveFailMode'), [id('riskLevel')]), '===', str('open')),
        ],
        ['blockReason', nullLit()],
      ]),
    ),
  ];

  const registerBody: ts.Statement[] = [
    exprStmt(
      call(propAccess(id('api'), 'on'), [
        str('before_tool_call'),
        ts.factory.createArrowFunction(
          [ts.factory.createToken(ts.SyntaxKind.AsyncKeyword)],
          undefined,
          [param('toolName', unknownType())],
          undefined,
          ts.factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
          ts.factory.createBlock(arrowBody, true),
        ),
      ]),
    ),
  ];

  // register(api: { on: (event: string, handler: (...args: unknown[]) => Promise<unknown>) => void }): void
  //
  // `createFunctionTypeNode` + rest-parameter declaration + method
  // declaration have no sub-builder equivalents in ts-builder (method
  // declarations live inside object literals and aren't a top-level
  // emit pattern), so they are built inline. Keyword types, array
  // types, and Promise types route through sub-builders.
  const handlerType = ts.factory.createFunctionTypeNode(
    undefined,
    [
      ts.factory.createParameterDeclaration(
        undefined,
        ts.factory.createToken(ts.SyntaxKind.DotDotDotToken),
        'args',
        undefined,
        arrayType(unknownType()),
        undefined,
      ),
    ],
    promiseType(unknownType()),
  );
  const apiType = typeLiteral([
    {
      name: 'on',
      type: ts.factory.createFunctionTypeNode(
        undefined,
        [param('event', stringType()), param('handler', handlerType)],
        voidType(),
      ),
    },
  ]);

  const registerMethod = ts.factory.createMethodDeclaration(
    undefined,
    undefined,
    'register',
    undefined,
    undefined,
    [param('api', apiType)],
    voidType(),
    ts.factory.createBlock(registerBody, true),
  );

  const exportDefault = ts.factory.createExportAssignment(
    undefined,
    false,
    ts.factory.createObjectLiteralExpression(
      [
        ts.factory.createPropertyAssignment('name', str('claws-governance')),
        ts.factory.createPropertyAssignment('version', str(version)),
        ts.factory.createPropertyAssignment(
          'description',
          str('Compiled governance enforcement plugin'),
        ),
        registerMethod,
      ],
      true,
    ),
  );

  // Embed compiledAt as a synthetic leading comment on the RISK_MAP
  // const so determinism/provenance is visible in the generated file.
  // This is the byte-identical signal CM-7 asserts on.
  const riskMap = riskMapConst(riskTuples);
  ts.addSyntheticLeadingComment(
    riskMap,
    ts.SyntaxKind.MultiLineCommentTrivia,
    `*\n * Generated OC Gateway governance plugin.\n * DO NOT EDIT -- generated by claws v${version}.\n * Compiled: ${compiledAt}\n `,
    true,
  );

  return printWithMarker(marker, [riskMap, resolveFailModeFn(), exportDefault]);
}

/**
 * before-tool-call.ts — exports an async `beforeToolCall()` that
 * consults `RISK_MAP` and returns `{ allowed, blockReason }`.
 */
function generateBeforeToolCall(
  riskTuples: ReadonlyArray<readonly [string, number]>,
  hookTimeoutMs: number,
  compilerVersion: string,
): string {
  const marker = `claws-governance:oc-gateway:v${compilerVersion}`;

  const returnTypeNode = promiseType(
    typeLiteral([
      { name: 'allowed', type: booleanType() },
      { name: 'blockReason', type: stringOrNull() },
    ]),
  );

  // if (toolName == null) return { allowed: false, blockReason: '...' };
  const nullGuard = ifStmt(binary(id('toolName'), '==', nullLit()), [
    returnStmt(
      objectLit([
        ['allowed', bool(false)],
        ['blockReason', str('Tool name is null or undefined')],
      ]),
    ),
  ]);

  // const riskLevel = RISK_MAP.get(toolName) ?? 5;
  const riskLookup = constDecl(
    'riskLevel',
    binary(
      call(propAccess(id('RISK_MAP'), 'get'), [id('toolName')]),
      '??',
      num(5),
    ),
  );

  // if (riskLevel >= 3) return { allowed: false, blockReason: `R${riskLevel} fail-closed (timeout Xms)` };
  const reasonTemplate = templateStr('R', [
    { expr: id('riskLevel'), text: ` fail-closed (timeout ${hookTimeoutMs}ms)` },
  ]);
  const riskGuard = ifStmt(binary(id('riskLevel'), '>=', num(3)), [
    returnStmt(
      objectLit([
        ['allowed', bool(false)],
        ['blockReason', reasonTemplate],
      ]),
    ),
  ]);

  // return { allowed: true, blockReason: null };
  const okReturn = returnStmt(
    objectLit([
      ['allowed', bool(true)],
      ['blockReason', nullLit()],
    ]),
  );

  const fn = exportedAsyncFunction(
    'beforeToolCall',
    [param('toolName', stringOrNullish())],
    returnTypeNode,
    [nullGuard, riskLookup, riskGuard, okReturn],
  );

  return printWithMarker(marker, [riskMapConst(riskTuples), fn]);
}

/**
 * a2a-firewall.ts — exports `beforeAgentHandoff()` consulting ALLOWED.
 */
function generateA2AFirewall(
  entries: ReadonlyArray<readonly [string, readonly string[]]>,
  compilerVersion: string,
): string {
  const marker = `claws-governance:oc-gateway:v${compilerVersion}`;

  // const ALLOWED: ReadonlyMap<string, ReadonlySet<string>> = new Map([...]);
  //
  // This is a `new Map([[k, Set], ...])` where the value is a bare Set
  // literal (no generic arg on the inner Set — the Map's ReadonlySet<string>
  // type parameter carries the element type). That shape is distinct from
  // `newMapOfStringTo`, which inserts generic type arguments on the Map.
  // The multiline flag on the tuple array depends on whether there are
  // entries at all.
  const tuples = entries.map(([from, tos]) =>
    arrayLit([str(from), newSetLiteral(tos)], false),
  );
  const allowedConst = typedConst(
    'ALLOWED',
    readonlyMapType(readonlySetOfStringType()),
    newExpr(id('Map'), [arrayLit(tuples, tuples.length > 0)]),
  );

  const returnTypeNode = typeLiteral([
    { name: 'allowed', type: booleanType() },
    { name: 'blockReason', type: stringOrNull() },
  ]);

  // if (fromAgent == null || toAgent == null) return { allowed: false, blockReason: '...' };
  const nullGuard = ifStmt(
    binary(
      binary(id('fromAgent'), '==', nullLit()),
      '||',
      binary(id('toAgent'), '==', nullLit()),
    ),
    [
      returnStmt(
        objectLit([
          ['allowed', bool(false)],
          ['blockReason', str('Agent name is null or undefined')],
        ]),
      ),
    ],
  );

  // const targets = ALLOWED.get(fromAgent);
  const lookup = constDecl(
    'targets',
    call(propAccess(id('ALLOWED'), 'get'), [id('fromAgent')]),
  );

  // if (targets === undefined || !targets.has(toAgent)) return { ... };
  const denyReason = templateStr('Delegation from "', [
    { expr: id('fromAgent'), text: '" to "' },
    { expr: id('toAgent'), text: '" denied' },
  ]);
  const denyGuard = ifStmt(
    binary(
      binary(id('targets'), '===', id('undefined')),
      '||',
      notExpr(call(propAccess(id('targets'), 'has'), [id('toAgent')])),
    ),
    [
      returnStmt(
        objectLit([
          ['allowed', bool(false)],
          ['blockReason', denyReason],
        ]),
      ),
    ],
  );

  const okReturn = returnStmt(
    objectLit([
      ['allowed', bool(true)],
      ['blockReason', nullLit()],
    ]),
  );

  const fn = exportedFunction(
    'beforeAgentHandoff',
    [
      param('fromAgent', stringOrNullish()),
      param('toAgent', stringOrNullish()),
    ],
    returnTypeNode,
    [nullGuard, lookup, denyGuard, okReturn],
  );

  return printWithMarker(marker, [allowedConst, fn]);
}

/**
 * elicitation-gate.ts — exports `requiresElicitation(name)` against
 * OBO_TOOLS.
 */
function generateElicitationGate(
  oboTools: readonly string[],
  compilerVersion: string,
): string {
  const marker = `claws-governance:oc-gateway:v${compilerVersion}`;

  const oboConst = typedConst(
    'OBO_TOOLS',
    readonlySetOfStringType(),
    newSetOfString(oboTools),
  );

  // return typeof toolName === 'string' && OBO_TOOLS.has(toolName);
  const body = returnStmt(
    binary(
      binary(typeofExpr(id('toolName')), '===', str('string')),
      '&&',
      call(propAccess(id('OBO_TOOLS'), 'has'), [id('toolName')]),
    ),
  );

  const fn = exportedFunction(
    'requiresElicitation',
    [param('toolName', stringOrNullish())],
    booleanType(),
    [body],
  );

  return printWithMarker(marker, [oboConst, fn]);
}

/**
 * OC Gateway plugin emitter.
 *
 * Takes an OCWorkspaceIR + GovAnalysis and produces a complete plugin
 * directory rooted at `{outputDir}/plugins/claws-governance/`.
 *
 * Calls `compileGuard` before producing any output. When the guard throws
 * (R5 fail-closed violation), the error propagates -- no files are emitted.
 */
export class OCEmitter extends BaseEmitter {
  constructor(options: EmitterOptions) {
    super(options);
  }

  async emit(ir: OCWorkspaceIR, analysis: GovAnalysis): Promise<EmitResult> {
    // R5 gate -- throws CompilationDeniedError on any ambiguous/critical rule.
    compileGuard(analysis, ir);

    // CL-04 §IS.7 -- sweep any `.tmp-*` orphans left by a prior interrupted
    // emit before writing fresh files. No-op on dryRun.
    await this.sweepStaleTempfiles(
      `${this.options.outputDir}/${PLUGIN_RELATIVE_ROOT}/handlers`,
    );
    await this.sweepStaleTempfiles(
      `${this.options.outputDir}/${PLUGIN_RELATIVE_ROOT}`,
    );

    const riskTuples = buildRiskTuples(ir.tools, analysis);
    const delegationEntries = buildDelegationEntries(ir.agents);
    const oboTools = buildOboTools(ir.tools);
    const version = ir.compiler.compilerVersion;

    const files: EmittedFile[] = [
      {
        path: `${PLUGIN_RELATIVE_ROOT}/package.json`,
        content: generateManifest(ir),
        overwrite: true,
      },
      {
        path: `${PLUGIN_RELATIVE_ROOT}/claws-governance.config.json`,
        content: generateConfig(ir, analysis),
        overwrite: true,
      },
      {
        path: `${PLUGIN_RELATIVE_ROOT}/index.ts`,
        content: generateIndex(ir, riskTuples),
        overwrite: true,
      },
      {
        path: `${PLUGIN_RELATIVE_ROOT}/handlers/before-tool-call.ts`,
        content: generateBeforeToolCall(
          riskTuples,
          DEFAULT_HOOK_TIMEOUT_MS,
          version,
        ),
        overwrite: true,
      },
      {
        path: `${PLUGIN_RELATIVE_ROOT}/handlers/a2a-firewall.ts`,
        content: generateA2AFirewall(delegationEntries, version),
        overwrite: true,
      },
      {
        path: `${PLUGIN_RELATIVE_ROOT}/handlers/elicitation-gate.ts`,
        content: generateElicitationGate(oboTools, version),
        overwrite: true,
      },
    ];

    const diagnostics: EmitDiagnostic[] = [];
    if (this.options.verbose === true) {
      diagnostics.push(
        this.formatDiagnostic(
          'EMIT-INFO-001',
          `oc emitter produced ${files.length} files for version ${version}`,
          'info',
        ),
      );
    }

    // CL-14 §1.6 — scan every .ts file for forbidden `@craftworks`-scoped
    // references before anything is written to disk. On any match we
    // fail-closed: zero files + severity-error diagnostic. This is the
    // single point of enforcement in the emit path; the host and
    // graduation.accept test verify it from the outside, but the
    // invariant lives here.
    const finalized = this.finalizeFiles('oc', files, diagnostics);

    // Write to disk only when emit produced a non-empty file set --
    // a fail-closed finalize leaves `files: []` and no disk I/O
    // happens, exactly per the §1.6 "zero files, not partial"
    // contract.
    for (const file of finalized.files) {
      await this.writeFile(file);
    }

    return finalized;
  }
}

// Re-exported from compiler/util so oc-emitter's public API stays stable
// while the implementation lives in one place.
export { verifyNoCraftworksRefs } from '../util/craftworks-scan.js';
