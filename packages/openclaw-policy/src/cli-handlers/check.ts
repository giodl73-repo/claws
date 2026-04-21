import { readFile } from 'node:fs/promises';
import * as path from 'node:path';

import { check as libCheck } from '../generator.js';
import type { Diagnostic, PolicyIR } from '../types/index.js';
import {
  parseFlags,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

export type IRLoader = (workspace: string) => Promise<PolicyIR>;

const defaultIRLoader: IRLoader = async (workspace) => {
  const candidates = [
    path.join(workspace, '.openclaw', 'policy', 'policy-ir.json'),
    path.join(workspace, '.claws', 'policy-ir.json'),
    path.join(workspace, 'policy-ir.json'),
  ];
  let lastErr: unknown;
  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, 'utf8');
      return JSON.parse(raw) as PolicyIR;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('policy-ir.json not found');
};

/**
 * `claws policy check` — parse workspace, report diagnostics without emit.
 *
 * Thin handler: loads the current workspace IR (`.claws/policy-ir.json`),
 * runs `check()` from the library, renders diagnostics in LSP-compatible
 * shape per `openclaw-upstream/policy-commands.md`, and maps governance-
 * fatal errors to exit 1.
 */
export async function handle(
  argv: HandlerArgv,
  loader: IRLoader = defaultIRLoader,
): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const workspace = typeof flags['workspace'] === 'string' ? flags['workspace'] : argv.cwd;
  if (typeof workspace !== 'string' || workspace === '') {
    return renderErr(argv.binaryName, 'check', 'workspace path required', 2);
  }

  let ir: PolicyIR;
  try {
    ir = await loader(workspace);
  } catch (err) {
    return renderErr(argv.binaryName, 'check', (err as Error).message, 1);
  }

  const result = libCheck(ir);
  const lines = result.diagnostics.map(renderDiagnostic);
  const fatal = result.diagnostics.some((d) => d.severity === 'error');
  const summary = `${result.diagnostics.length} diagnostic(s), ${fatal ? 'fatal' : 'ok'}`;
  const body = lines.length > 0 ? `${lines.join('\n')}\n${summary}` : summary;
  return {
    exitCode: fatal ? 1 : 0,
    stdout: `${argv.binaryName} policy check: ${body}\n`,
    stderr: '',
  };
}

export function renderDiagnostic(d: Diagnostic): string {
  const file = d.path ?? '<workspace>';
  const line = d.line ?? 0;
  const col = d.column ?? 0;
  return `${file}:${line}:${col} ${d.severity} ${d.code}: ${d.message}`;
}
