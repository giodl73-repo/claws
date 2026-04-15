/**
 * `claws annotate` command — heuristic governance annotation.
 *
 * Thin CLI adapter: calls annotate SDK functions and renders results.
 * No business logic lives here.
 *
 * @module claws-cli/commands/annotate
 */

import {
  annotateDirectory,
  formatAnnotation,
} from '@bic/claws-sdk/annotate';

/**
 * Options for the annotate command.
 */
export interface AnnotateOptions {
  readonly json: boolean;
  readonly dryRun: boolean;
}

/**
 * Run the `claws annotate` command.
 *
 * Delegates to `annotateDirectory()` in the SDK for all domain logic.
 * This adapter handles only error rendering and output formatting.
 *
 * @param skillDir - Directory to scan for skills (defaults to cwd/skills)
 * @param opts - Command options
 * @returns Exit code (0=success, 3=error)
 */
export async function runAnnotate(
  skillDir: string,
  opts: AnnotateOptions,
): Promise<number> {
  let result: Awaited<ReturnType<typeof annotateDirectory>>;
  try {
    result = await annotateDirectory(skillDir, { dryRun: opts.dryRun });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    const msg = `Cannot read skill directory: ${skillDir} — ${detail}`;
    if (opts.json) {
      console.log(JSON.stringify({ status: 'error', message: msg }));
    } else {
      console.error(`Error: ${msg}`);
    }
    return 3;
  }

  const { annotations, modifiedFiles } = result;

  if (annotations.length === 0) {
    if (opts.json) {
      console.log(JSON.stringify({ status: 'ok', annotations: [], message: 'No skills found' }));
    } else {
      console.log('No skills found in directory.');
    }
    return 0;
  }

  // Output results
  if (opts.json) {
    console.log(JSON.stringify({
      status: 'ok',
      dryRun: opts.dryRun,
      annotations: annotations.map((a) => ({
        name: a.name,
        risk: `R${a.riskClass}`,
        riskConfidence: Number(a.riskConfidence.toFixed(2)),
        obo: a.obo.detected,
        oboPatterns: a.obo.matchedPatterns,
        dataClassification: a.dataClassification,
        evidence: a.evidence,
      })),
      modifiedFiles,
    }));
  } else {
    const modeLabel = opts.dryRun ? 'Proposed annotations (dry-run):' : 'Applied annotations:';
    console.log(modeLabel);
    console.log();
    for (const annotation of annotations) {
      console.log(formatAnnotation(annotation));
    }
    console.log();
    console.log(`${annotations.length} skill(s) analyzed.`);
    if (!opts.dryRun && modifiedFiles.length > 0) {
      console.log(`${modifiedFiles.length} file(s) updated.`);
    }
  }

  return 0;
}
