/**
 * Source-mode entry point for the pulse 47.6 D7 dual-spawn gate.
 *
 * `packages/claws/src/cli.ts` only exports `createProgram()`; the
 * production `bin/claws.js` imports the compiled dist and invokes
 * `parseAsync`. For tests that must exercise the source tree directly
 * (to catch dist-vs-source divergence — stale build, missed build
 * step, broken re-exports), we need a parallel entry that runs the
 * source `createProgram()` without touching dist.
 *
 * Invoked as: `tsx test/e2e/accept/cli-source-entry.ts <verb> [args...]`
 *
 * @module test/e2e/accept/cli-source-entry
 */
import { createProgram } from '../../../packages/claws/src/cli.ts';

const program = createProgram();
program.parseAsync(process.argv).catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`claws: ${msg}\n`);
  process.exitCode = 2;
});
