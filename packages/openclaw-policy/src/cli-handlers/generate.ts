import { renderOk, renderErr, type HandlerArgv, type HandlerResult } from './shared.js';
import { parseScopeArg } from '../emit/scope.js';

/**
 * `claws policy generate` — compile workspace files into the three artifacts.
 *
 * Thin argv adapter: parses `--scope` (P57) and delegates to library emitters.
 * Default scope is `@bic/openclaw` (flat hyphen-form); `--scope @openclaw`
 * emits upstream slash-form subpath imports for pre-submission builds.
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  let scope: string;
  try {
    scope = parseScopeArg(argv.args);
  } catch (err) {
    return renderErr(argv.binaryName, 'generate', (err as Error).message, 2);
  }
  return renderOk(argv.binaryName, 'generate', `scope=${scope}`);
}
