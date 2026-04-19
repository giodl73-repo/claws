/**
 * ClaudeCodeEmitter -- emits a Claude Code workspace from OCWorkspaceIR
 * + GovAnalysis.
 *
 * The output is a standard Claude Code workspace:
 *  - CLAUDE.md                           (persona, principles, tools, boundaries)
 *  - .claude/settings.json               (permissions, env, claws identity)
 *  - .claude/commands/{slug}.md          (one per skill in SkillsIR)
 *
 * Design constraints:
 *  - Zero `@craftworks`-scoped imports in generated output
 *  - compileGuard is invoked before any content is generated
 *  - dryRun mode yields the same EmitResult without touching disk
 *  - Marker line `claws-governance:claude-code:v{version}` on every file
 *
 * @module claws-sdk/compiler/emit/cc-emitter
 */

import type { OCWorkspaceIR } from '../ir/workspace-ir.js';
import type { GovAnalysis } from '../enforce/types.js';
import { compileGuard } from '../enforce/guard.js';
import { BaseEmitter } from './base-emitter.js';
import {
  formatClaudeMd,
  formatSettingsJson,
  formatSkillStubs,
} from './cc-templates.js';
import type {
  EmitDiagnostic,
  EmitResult,
  EmittedFile,
  EmitterOptions,
} from './types.js';

/**
 * Claude Code workspace emitter.
 *
 * Takes an OCWorkspaceIR + GovAnalysis and produces a complete Claude Code
 * workspace rooted at `{outputDir}/`.
 *
 * Calls `compileGuard` before producing any output. When the guard throws
 * (R5 fail-closed violation), the error propagates — no files are emitted.
 */
export class ClaudeCodeEmitter extends BaseEmitter {
  constructor(options: EmitterOptions) {
    super(options);
  }

  async emit(ir: OCWorkspaceIR, analysis: GovAnalysis): Promise<EmitResult> {
    // R5 gate — throws CompilationDeniedError on any ambiguous/critical rule.
    compileGuard(analysis, ir);

    // CL-04 §IS.7 -- sweep `.tmp-*` orphans left by a prior interrupted emit.
    await this.sweepStaleTempfiles(this.options.outputDir);
    await this.sweepStaleTempfiles(`${this.options.outputDir}/.claude`);

    const version = ir.compiler.compilerVersion;

    const claudeMd = formatClaudeMd(ir.soul, ir.tools, ir.agents, version);
    const settings = formatSettingsJson(ir.tools, ir.identity, version);
    const stubs = formatSkillStubs(ir.skills, version);

    const files: EmittedFile[] = [
      { path: 'CLAUDE.md', content: claudeMd, overwrite: true },
      { path: '.claude/settings.json', content: settings, overwrite: true },
      ...stubs.map(([path, content]) => ({ path, content, overwrite: true })),
    ];

    const diagnostics: EmitDiagnostic[] = [];
    if (this.options.verbose === true) {
      diagnostics.push(
        this.formatDiagnostic(
          'EMIT-INFO-002',
          `claude-code emitter produced ${files.length} files for version ${version}`,
          'info',
        ),
      );
    }

    for (const file of files) {
      await this.writeFile(file);
    }

    return { target: 'claude-code', files, diagnostics };
  }
}
