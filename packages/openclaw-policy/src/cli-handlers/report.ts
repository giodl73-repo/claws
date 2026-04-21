import { readFile, writeFile } from 'node:fs/promises';

import { renderReport } from '../ops/render-report.js';
import type { RenderFormat, RenderInput } from '../ops/types.js';

import {
  parseFlags,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

const VALID_KINDS = ['compliance', 'audit', 'snapshot-diff'] as const;
type InputKind = (typeof VALID_KINDS)[number];

/**
 * `claws policy report` — render a compliance/audit/snapshot-diff report.
 *
 * Flags:
 *   --kind <compliance|audit|snapshot-diff>  what payload to render (required)
 *   --format <md|markdown|html|json|pdf>     output format (default: markdown)
 *   --input <path>                           JSON payload matching `kind`
 *   --out <path>                             write to file instead of stdout
 *
 * `--format sarif` is reserved for GitHub code scanning; library does not
 * emit SARIF today — the handler rejects it with exit 2 until that support
 * lands upstream.
 *
 * Exit codes:
 *   0  — rendered successfully
 *   1  — library error or I/O error
 *   2  — usage error (bad kind, bad format, missing input)
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const kindArg = typeof flags['kind'] === 'string' ? flags['kind'] : undefined;
  const formatArg = typeof flags['format'] === 'string' ? flags['format'] : 'markdown';
  const inputPath = typeof flags['input'] === 'string' ? flags['input'] : undefined;
  const outPath = typeof flags['out'] === 'string' ? flags['out'] : undefined;

  if (kindArg === undefined) {
    return renderErr(argv.binaryName, 'report', '--kind <compliance|audit|snapshot-diff> required', 2);
  }
  if (!isValidKind(kindArg)) {
    return renderErr(argv.binaryName, 'report', `unknown kind: ${kindArg}`, 2);
  }
  if (inputPath === undefined) {
    return renderErr(argv.binaryName, 'report', '--input <path> required', 2);
  }
  const format = normaliseFormat(formatArg);
  if (format === 'sarif') {
    return renderErr(
      argv.binaryName,
      'report',
      'format=sarif not yet supported by @bic/openclaw-policy library',
      2,
    );
  }
  if (format === null) {
    return renderErr(argv.binaryName, 'report', `unknown format: ${formatArg}`, 2);
  }

  let payload: unknown;
  try {
    const raw = await readFile(inputPath, 'utf8');
    payload = JSON.parse(raw);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return renderErr(argv.binaryName, 'report', `failed to read input: ${message}`, 1);
  }

  const renderInput = buildRenderInput(kindArg, payload);
  let rendered: string;
  try {
    rendered = renderReport(renderInput, format);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return renderErr(argv.binaryName, 'report', message, 1);
  }

  if (outPath !== undefined) {
    try {
      await writeFile(outPath, rendered, 'utf8');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return renderErr(argv.binaryName, 'report', `failed to write out: ${message}`, 1);
    }
    return { exitCode: 0, stdout: `${argv.binaryName} policy report: wrote ${outPath}\n`, stderr: '' };
  }
  return { exitCode: 0, stdout: rendered.endsWith('\n') ? rendered : `${rendered}\n`, stderr: '' };
}

function isValidKind(v: string): v is InputKind {
  return (VALID_KINDS as readonly string[]).includes(v);
}

function normaliseFormat(v: string): RenderFormat | 'sarif' | null {
  if (v === 'md' || v === 'markdown') return 'markdown';
  if (v === 'html' || v === 'json' || v === 'pdf') return v;
  if (v === 'sarif') return 'sarif';
  return null;
}

function buildRenderInput(kind: InputKind, payload: unknown): RenderInput {
  const library = kind === 'snapshot-diff' ? 'diff' : kind;
  if (library === 'compliance') {
    return { kind: 'compliance', compliance: payload as NonNullable<RenderInput['compliance']> };
  }
  if (library === 'audit') {
    return { kind: 'audit', audit: payload as NonNullable<RenderInput['audit']> };
  }
  return { kind: 'diff', diff: payload as NonNullable<RenderInput['diff']> };
}
