import {
  parseFlags,
  renderOk,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

/**
 * `claws policy comply` — evaluate compliance against a rubric + snapshot.
 *
 * `--rubric` selects built-in id or yaml path; `--snapshot` points to a
 * snapshot id. In fixture mode the handler returns ok when both are present.
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const rubric = typeof flags['rubric'] === 'string' ? flags['rubric'] : 'soc2';
  const snapshot = typeof flags['snapshot'] === 'string' ? flags['snapshot'] : undefined;
  if (snapshot === undefined) {
    return renderErr(argv.binaryName, 'comply', '--snapshot <id> required', 2);
  }
  return renderOk(argv.binaryName, 'comply', `evaluated rubric=${rubric} snapshot=${snapshot}`);
}
