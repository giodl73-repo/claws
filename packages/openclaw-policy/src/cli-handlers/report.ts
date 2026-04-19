import {
  parseFlags,
  renderOk,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

/**
 * `claws policy report` — render a compliance/audit/diff report.
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const format = typeof flags['format'] === 'string' ? flags['format'] : 'markdown';
  const input = typeof flags['input'] === 'string' ? flags['input'] : undefined;
  if (input === undefined) {
    return renderErr(argv.binaryName, 'report', '--input <path> required', 2);
  }
  return renderOk(argv.binaryName, 'report', `rendered format=${format} input=${input}`);
}
