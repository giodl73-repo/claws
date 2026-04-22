import { renderOk, renderErr, type HandlerArgv, type HandlerResult } from './shared.js';
import { parseScopeArg } from '../emit/scope.js';
import { generate } from '../generator.js';
import { formatR5FailOpenStderr } from '../generator/diagnostics.js';

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

  const wantDiagnosticsJson = argv.args.includes('--diagnostics-json');

  try {
    const result = await generate({ workspaceRoot: argv.cwd });

    // CP-6 pulse 53: surface structured generator diagnostics (R5+failOpen)
    // with a dedicated multi-line stderr block per SC-07 F-04/F-05.
    const generatorDiagnostics = result.generatorDiagnostics ?? [];
    if (generatorDiagnostics.length > 0) {
      let stderr = '';
      for (const gd of generatorDiagnostics) {
        stderr += formatR5FailOpenStderr(argv.binaryName, {
          kind: 'r5-fail-open',
          toolName: gd.toolName,
          sourcePath: gd.sourcePath,
          line: gd.line,
          column: gd.column,
          invalidReason: gd.invalidReason,
          message: gd.message,
        });
      }
      let stdout = '';
      if (wantDiagnosticsJson) {
        stdout = `${JSON.stringify({ diagnostics: generatorDiagnostics })}\n`;
      }
      return { exitCode: 1, stdout, stderr };
    }

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
