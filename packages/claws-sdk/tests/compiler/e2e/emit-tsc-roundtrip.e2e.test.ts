/**
 * L2: TypeScript strict round-trip gate for emitted codegen.
 *
 * Headline deliverable of the AST codegen rewrite. Every `.ts` file
 * produced by OC emit is fed back through `ts.createProgram` with
 * `strict: true`, and the test asserts zero syntactic / semantic
 * diagnostics. This is the gate that catches template-string
 * regressions forever — if a generated file has any tsc error, this
 * test fails at build time, long before it reaches a real OC Gateway.
 *
 * Covers:
 *  - plugins/claws-governance/index.ts
 *  - plugins/claws-governance/handlers/before-tool-call.ts
 *  - plugins/claws-governance/handlers/a2a-firewall.ts
 *  - plugins/claws-governance/handlers/elicitation-gate.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  readFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, relative, sep } from 'node:path';
import ts from 'typescript';
import { compile } from '#src/compiler/host/index.js';

const WORKSPACE = resolve(__dirname, 'fixtures/workspace');

function listTsFiles(root: string): string[] {
  const out: string[] = [];
  function walk(dir: string): void {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (st.isFile() && full.endsWith('.ts')) out.push(full);
    }
  }
  walk(root);
  return out.sort();
}

describe('emit tsc-strict round-trip (e2e)', () => {
  let outputDir: string;
  let cacheDir: string;
  let tscRoot: string;

  beforeEach(() => {
    outputDir = mkdtempSync(join(tmpdir(), 'claws-tsc-roundtrip-out-'));
    cacheDir = mkdtempSync(join(tmpdir(), 'claws-tsc-roundtrip-cache-'));
    tscRoot = mkdtempSync(join(tmpdir(), 'claws-tsc-roundtrip-tsc-'));
  });

  afterEach(() => {
    rmSync(outputDir, { recursive: true, force: true });
    rmSync(cacheDir, { recursive: true, force: true });
    rmSync(tscRoot, { recursive: true, force: true });
  });

  it('every emitted .ts file passes tsc --strict with zero diagnostics', async () => {
    const result = await compile(WORKSPACE, {
      targets: ['oc', 'claude-code'],
      outputDir,
      cacheEnabled: false,
      dryRun: false,
    });
    expect(result.success).toBe(true);

    // Mirror every emitted .ts under a clean compile root so
    // ts.createProgram can see real files on disk.
    const emittedTs = listTsFiles(outputDir);
    expect(emittedTs.length).toBeGreaterThan(0);

    const rootNames: string[] = [];
    for (const src of emittedTs) {
      const rel = relative(outputDir, src).split(sep).join('/');
      const target = join(tscRoot, rel);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(src, 'utf-8'), 'utf-8');
      rootNames.push(target);
    }

    // Gate exercises every handler file, not just index.ts.
    expect(
      rootNames.some((p) => p.endsWith('index.ts')),
      'index.ts must be included in the tsc program',
    ).toBe(true);
    expect(
      rootNames.some((p) => p.endsWith('before-tool-call.ts')),
      'before-tool-call.ts must be included',
    ).toBe(true);
    expect(
      rootNames.some((p) => p.endsWith('a2a-firewall.ts')),
      'a2a-firewall.ts must be included',
    ).toBe(true);
    expect(
      rootNames.some((p) => p.endsWith('elicitation-gate.ts')),
      'elicitation-gate.ts must be included',
    ).toBe(true);

    const program = ts.createProgram({
      rootNames,
      options: {
        strict: true,
        // CL-14 §2 — stricter flags catch the exact failure modes
        // template-string codegen let slip: fall-through switches,
        // optional-field drift, unchecked index access, and per-file
        // compilation boundary violations.
        noUncheckedIndexedAccess: true,
        noFallthroughCasesInSwitch: true,
        exactOptionalPropertyTypes: true,
        isolatedModules: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        lib: ['lib.es2022.d.ts'],
      },
    });

    const diagnostics = [
      ...program.getSyntacticDiagnostics(),
      ...program.getSemanticDiagnostics(),
    ];
    const formatted = diagnostics.map((d) => {
      const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
      const where = d.file
        ? `${d.file.fileName}:${d.start ?? 0}`
        : '<program>';
      return `${where}: ${msg}`;
    });
    expect(
      diagnostics,
      `tsc --strict failures in emitted codegen:\n${formatted.join('\n')}`,
    ).toHaveLength(0);
  });

  it('gate detects a broken .ts file (negative — proves the diagnostic path is live)', () => {
    // CL-14 §1.3 — the tsc-strict gate MUST block merge on failure. This
    // test exercises the same `ts.createProgram` + strict compilerOptions
    // path the positive test uses, but feeds a deliberately broken source.
    // Asserting non-empty diagnostics proves the gate's failure-detection
    // machinery works — if someone silently breaks diagnostic collection
    // (e.g. accidental `.length === 0` short-circuit), this test fails
    // immediately.
    const broken = [
      `const x: number = 'not a number';`,
      `console.log(undeclaredFoo);`,
      ``,
    ].join('\n');
    const brokenPath = join(tscRoot, 'broken.ts');
    writeFileSync(brokenPath, broken, 'utf-8');

    const program = ts.createProgram({
      rootNames: [brokenPath],
      options: {
        strict: true,
        noUncheckedIndexedAccess: true,
        noFallthroughCasesInSwitch: true,
        exactOptionalPropertyTypes: true,
        isolatedModules: true,
        noEmit: true,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        lib: ['lib.es2022.d.ts'],
      },
    });

    const diagnostics = [
      ...program.getSyntacticDiagnostics(),
      ...program.getSemanticDiagnostics(),
    ];
    expect(
      diagnostics.length,
      'gate must surface diagnostics when strict-mode errors are present',
    ).toBeGreaterThan(0);
  });
});
