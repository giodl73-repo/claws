import { watch as libWatch } from '../generator.js';
import type { WatchHandle } from '../types/index.js';
import {
  parseFlags,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

export interface WatchHostHooks {
  readonly signal?: AbortSignal;
  readonly onArmed?: (workspace: string) => void;
}

export type WatchFactory = (opts: {
  workspaceRoot: string;
  debounceMs: number;
}) => WatchHandle;

/**
 * `claws policy watch` — arm continuous re-check against the workspace.
 *
 * Thin handler: invokes the library watcher with a 300 ms debounce and
 * blocks until either the supplied `AbortSignal` fires or `SIGINT` lands,
 * then calls `handle.close()` to release chokidar resources. Caller
 * (tests or the CLI entry) injects the signal so the handler never
 * attaches real process listeners in unit tests.
 */
export async function handle(
  argv: HandlerArgv,
  hooks: WatchHostHooks = {},
  factory: WatchFactory = libWatch,
): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const workspace = typeof flags['workspace'] === 'string' ? flags['workspace'] : argv.cwd;
  if (typeof workspace !== 'string' || workspace === '') {
    return renderErr(argv.binaryName, 'watch', 'workspace path required', 2);
  }

  let handle: WatchHandle;
  try {
    handle = factory({ workspaceRoot: workspace, debounceMs: 300 });
  } catch (err) {
    return renderErr(argv.binaryName, 'watch', (err as Error).message, 1);
  }

  hooks.onArmed?.(workspace);

  // `--once` runs a single arm/close cycle — useful for smoke tests and
  // CI where blocking on SIGINT would hang the suite. Without the flag
  // the handler blocks until an AbortSignal or process SIGINT fires.
  if (flags['once'] !== true) {
    await waitForStop(hooks.signal);
  }
  await handle.close();

  return {
    exitCode: 0,
    stdout: `${argv.binaryName} policy watch: stopped (${workspace})\n`,
    stderr: '',
  };
}

function waitForStop(signal: AbortSignal | undefined): Promise<void> {
  return new Promise<void>((resolve) => {
    if (signal === undefined) {
      // No signal injected — resolve on process SIGINT. This path is only
      // exercised in a real terminal; unit tests always supply a signal.
      const onSigint = (): void => {
        process.off('SIGINT', onSigint);
        resolve();
      };
      process.once('SIGINT', onSigint);
      return;
    }
    if (signal.aborted) {
      resolve();
      return;
    }
    signal.addEventListener('abort', () => resolve(), { once: true });
  });
}
