import { readFile } from 'node:fs/promises';

import { evaluateCompliance } from '../ops/evaluate-compliance.js';
import { loadRubric, isBuiltInRubricId } from '../compliance/load-rubric.js';
import type { ComplianceReport } from '../ops/types.js';
import type { PolicyIR } from '../types/index.js';

import {
  parseFlags,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

/**
 * `claws policy comply` — evaluate compliance against a rubric + snapshot.
 *
 * Flags:
 *   --rubric <id|path>     built-in id (soc2|hipaa|eu-ai-act|nist-ai-rmf)
 *                          or path to custom rubric YAML (default: soc2)
 *   --snapshot <id>        snapshot id to record in report (required)
 *   --policy-ir <path>     path to PolicyIR JSON (required)
 *   --json                 emit JSON ComplianceReport (default: human summary)
 *
 * Exit codes:
 *   0  — summary.fail === 0 and summary.partial === 0
 *   1  — any failing or partial requirement
 *   2  — usage error (missing flags, unreadable inputs)
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const rubricArg = typeof flags['rubric'] === 'string' ? flags['rubric'] : 'soc2';
  const snapshot = typeof flags['snapshot'] === 'string' ? flags['snapshot'] : undefined;
  const policyIrPath = typeof flags['policy-ir'] === 'string' ? flags['policy-ir'] : undefined;
  const asJson = flags['json'] === true;

  if (snapshot === undefined) {
    return renderErr(argv.binaryName, 'comply', '--snapshot <id> required', 2);
  }
  if (policyIrPath === undefined) {
    return renderErr(argv.binaryName, 'comply', '--policy-ir <path> required', 2);
  }

  let policyIR: PolicyIR;
  try {
    const raw = await readFile(policyIrPath, 'utf8');
    policyIR = JSON.parse(raw) as PolicyIR;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return renderErr(argv.binaryName, 'comply', `failed to read policy-ir: ${message}`, 1);
  }

  let report: ComplianceReport;
  try {
    const rubric = isBuiltInRubricId(rubricArg)
      ? await loadRubric(rubricArg)
      : await loadRubric({ path: rubricArg });
    report = evaluateCompliance({
      rubric,
      input: { snapshotId: snapshot, policyIR },
      signingKey: 'fixture-signing-key',
      keyId: 'fixture-key-id',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return renderErr(argv.binaryName, 'comply', message, 1);
  }

  const stdout = asJson ? `${JSON.stringify(report, null, 2)}\n` : formatSummary(report);
  const exitCode = report.summary.fail === 0 && report.summary.partial === 0 ? 0 : 1;
  return { exitCode, stdout, stderr: '' };
}

function formatSummary(report: ComplianceReport): string {
  const { summary, rubric, snapshotId } = report;
  const lines = [
    `rubric:    ${rubric.id}@${rubric.version} (${rubric.framework})`,
    `snapshot:  ${snapshotId}`,
    `total:     ${String(summary.total)}`,
    `pass:      ${String(summary.pass)}`,
    `fail:      ${String(summary.fail)}`,
    `partial:   ${String(summary.partial)}`,
    `na:        ${String(summary.na)}`,
  ];
  for (const r of report.results) {
    lines.push(`  [${r.status}] ${r.requirementId}: ${r.title}`);
  }
  return `${lines.join('\n')}\n`;
}
