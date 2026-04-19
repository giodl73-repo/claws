/**
 * `claws` CLI router — dispatches top-level argv to the right handler.
 *
 * Shape:
 *   claws policy <verb> [args...]    -> HANDLERS[verb].handle
 *   claws doctor [--workspace <dir>] -> doctor.handle
 *   claws upgrade [--workspace <dir>] -> upgrade.handle
 *   claws --help                     -> renderHelp
 *
 * `binaryName` is parameterized: the same router serves `claws` (@bic
 * internal) and `openclaw` (upstream) — only the help-text + error-prefix
 * strings differ. This is the W6 closure: one handler library, two
 * branded binaries.
 *
 * Snap verbs are dispatched through a separate entry (`@bic/openclaw-snap`)
 * because they speak HTTP and have their own CliContext shape; see
 * runSnapRouter below.
 */

import { HANDLERS, TOP_LEVEL_HANDLERS, POLICY_VERBS, type PolicyVerb } from './index.js';
import type { HandlerArgv, HandlerResult } from './shared.js';

export interface RouterOptions {
  readonly binaryName: 'claws' | 'openclaw' | string;
  readonly argv: readonly string[];
  readonly cwd: string;
  readonly env?: Record<string, string | undefined>;
}

export function renderHelp(binaryName: string): HandlerResult {
  const verbList = POLICY_VERBS.join(', ');
  return {
    exitCode: 0,
    stdout:
      `${binaryName} — governed-agent CLI\n` +
      `\n` +
      `Usage: ${binaryName} <group> <verb> [flags]\n` +
      `\n` +
      `Groups:\n` +
      `  policy     generate/check/watch/comply/test/sim/report/verify/diff\n` +
      `  snap       stage-on/stage-off/status/upload/list/diff/checkout/promote/rollback/discard-stage/serve\n` +
      `\n` +
      `Top-level:\n` +
      `  doctor     workspace health + policy-aware checks\n` +
      `  upgrade    migrate policy artifacts to current schema\n` +
      `\n` +
      `Policy verbs: ${verbList}\n`,
    stderr: '',
  };
}

export function renderUnknown(binaryName: string, command: string): HandlerResult {
  return {
    exitCode: 2,
    stdout: '',
    stderr: `${binaryName}: unknown command '${command}' (run '${binaryName} --help')\n`,
  };
}

export function isPolicyVerb(v: string): v is PolicyVerb {
  return (POLICY_VERBS as readonly string[]).includes(v);
}

export async function runRouter(opts: RouterOptions): Promise<HandlerResult> {
  const { binaryName, argv, cwd, env } = opts;
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    return renderHelp(binaryName);
  }

  const [group, ...rest] = argv;

  if (group === 'doctor') {
    const hArgv: HandlerArgv = { binaryName, args: rest, cwd, ...(env !== undefined ? { env } : {}) };
    return TOP_LEVEL_HANDLERS.doctor.handle(hArgv);
  }
  if (group === 'upgrade') {
    const hArgv: HandlerArgv = { binaryName, args: rest, cwd, ...(env !== undefined ? { env } : {}) };
    return TOP_LEVEL_HANDLERS.upgrade.handle(hArgv);
  }

  if (group === 'policy') {
    const verb = rest[0];
    if (verb === undefined) {
      return {
        exitCode: 2,
        stdout: '',
        stderr: `${binaryName} policy: verb required (one of ${POLICY_VERBS.join(', ')})\n`,
      };
    }
    if (!isPolicyVerb(verb)) {
      return {
        exitCode: 2,
        stdout: '',
        stderr: `${binaryName} policy: unknown verb '${verb}' (one of ${POLICY_VERBS.join(', ')})\n`,
      };
    }
    const handler = HANDLERS[verb];
    const hArgv: HandlerArgv = {
      binaryName,
      args: rest.slice(1),
      cwd,
      ...(env !== undefined ? { env } : {}),
    };
    return handler.handle(hArgv);
  }

  return renderUnknown(binaryName, String(group));
}
