/**
 * BaseEmitter -- thin abstract base for claws compiler emit targets.
 *
 * Not a framework -- just shared file I/O and diagnostic helpers. Concrete
 * emitters (OCEmitter, ClaudeCodeEmitter) extend this class with the
 * target-specific emit() implementation.
 *
 * @module claws-sdk/compiler/emit/base-emitter
 */

import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { OCWorkspaceIR } from '../ir/workspace-ir.js';
import type { GovAnalysis } from '../enforce/types.js';
import { verifyNoCraftworksRefs } from '../util/craftworks-scan.js';
import { atomicWrite, sweepStaleTempfiles } from './atomic-write.js';
import type {
  EmitDiagnostic,
  EmitDiagnosticSeverity,
  EmitResult,
  EmittedFile,
  EmitterOptions,
} from './types.js';

/**
 * Shared base for claws emitters. Provides:
 *  - stored `options`
 *  - `formatDiagnostic()` for consistent diagnostic construction
 *  - `ensureDir()` / `writeFile()` that respect `dryRun`
 *
 * Subclasses implement `emit()` and produce an `EmitResult`.
 */
export abstract class BaseEmitter {
  protected readonly options: EmitterOptions;

  constructor(options: EmitterOptions) {
    this.options = options;
  }

  /**
   * Emit artifacts from the workspace IR and governance analysis.
   *
   * Concrete subclasses must implement this method. Implementations must
   * call `compileGuard(analysis, ir)` before producing any
   * file contents.
   */
  abstract emit(ir: OCWorkspaceIR, analysis: GovAnalysis): Promise<EmitResult>;

  /**
   * Enforce CL-14 §1.6 — every emitted `.ts` file MUST be scanned by
   * `verifyNoCraftworksRefs` before being returned as part of
   * `EmitResult.files`. On any match, the emitter fails-closed: files
   * are replaced with an empty array and a severity-`error` diagnostic
   * is appended per matching file.
   *
   * Non-`.ts` files (package.json, config.json, markdown) are not
   * scanned — the invariant is scoped to generated TypeScript source.
   *
   * Concrete emitters MUST route their final `EmitResult` through this
   * method before returning. See `OCEmitter.emit()` for the canonical
   * call site. "Fail-closed" per §1.6 means zero files + diagnostic,
   * not partial + diagnostic.
   */
  protected finalizeFiles(
    target: EmitResult['target'],
    files: readonly EmittedFile[],
    diagnostics: readonly EmitDiagnostic[],
  ): EmitResult {
    const leaks: EmitDiagnostic[] = [];
    for (const file of files) {
      if (!file.path.endsWith('.ts')) continue;
      const matches = verifyNoCraftworksRefs(file.content);
      if (matches.length === 0) continue;
      const unique = Array.from(new Set(matches));
      leaks.push(
        this.formatDiagnostic(
          'EMIT-CW-REF-001',
          `Refusing to emit: generated output contains forbidden @craftworks-scoped reference(s): ${unique.join(', ')}`,
          'error',
          file.path,
        ),
      );
    }
    if (leaks.length > 0) {
      return {
        target,
        files: [],
        diagnostics: [...diagnostics, ...leaks],
      };
    }
    return { target, files, diagnostics };
  }

  /**
   * Construct an EmitDiagnostic record.
   */
  protected formatDiagnostic(
    code: string,
    message: string,
    severity: EmitDiagnosticSeverity,
    target?: string,
  ): EmitDiagnostic {
    return target === undefined
      ? { code, message, severity }
      : { code, message, severity, target };
  }

  /**
   * Ensure a directory exists. No-op when dryRun is true.
   */
  protected async ensureDir(path: string): Promise<void> {
    if (this.options.dryRun === true) return;
    await mkdir(path, { recursive: true });
  }

  /**
   * Write a single emitted file to disk atomically. No-op when dryRun is true.
   *
   * The `outputDir` is prepended to the file's relative `path`. Parent
   * directories are created as needed. Per CL-04 §IS.7, every emit write
   * goes through `atomicWrite` so a partial write (SIGINT, crash) is never
   * observable at the target path — watch/fleet operators never see a
   * half-rendered handler.
   */
  protected async writeFile(file: EmittedFile): Promise<void> {
    if (this.options.dryRun === true) return;
    const fullPath = join(this.options.outputDir, file.path);
    await atomicWrite(fullPath, file.content);
  }

  /**
   * Sweep stale `<path>.tmp-*` orphans from a directory before writing new
   * files to it. Called by emitters at the start of emit so an interrupted
   * prior compile never leaves residue in the output tree (§IS.7).
   */
  protected async sweepStaleTempfiles(emitDir: string): Promise<void> {
    if (this.options.dryRun === true) return;
    await mkdir(emitDir, { recursive: true });
    await sweepStaleTempfiles(emitDir);
  }
}
