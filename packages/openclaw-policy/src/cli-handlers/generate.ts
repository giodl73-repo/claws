import { renderOk, renderErr, type HandlerArgv, type HandlerResult } from './shared.js';
import { parseScopeArg } from '../emit/scope.js';
import { generate } from '../generator.js';

/**
 * `claws policy generate` — compile workspace files into the three artifacts.
 *
 * Thin argv adapter: parses `--scope` (P57), delegates to the library
 * `generate(opts: GenerateOptions)` entry point, and renders exit codes per
 * openclaw-upstream-spec §3 (0 success, 1 fatal, 2 usage).
 *
 * Note: library `generate` takes only `{ workspaceRoot, strict? }`; `--scope`
 * is a handler-surface concern (emit-plugin scope prefix) captured here for
 * future wiring once the filesystem pipeline lands.
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  let scope: string;
  try {
    scope = parseScopeArg(argv.args);
  } catch (err) {
    return renderErr(argv.binaryName, 'generate', (err as Error).message, 2);
  }

  try {
    const result = await generate({ workspaceRoot: argv.cwd });
    const fatal = result.diagnostics.filter((d) => d.severity === 'error');
    if (fatal.length > 0) {
      return renderErr(
        argv.binaryName,
        'generate',
        `governance-fatal: ${fatal[0]!.code} ${fatal[0]!.message}`,
        1,
      );
    }
    return renderOk(
      argv.binaryName,
      'generate',
      `scope=${scope} files=${result.writtenFiles.length} diagnostics=${result.diagnostics.length}`,
    );
  } catch (err) {
    return renderErr(argv.binaryName, 'generate', (err as Error).message, 1);
  }
}
