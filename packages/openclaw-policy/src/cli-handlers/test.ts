import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

import {
  parseScenarioYaml,
  runScenarios,
  runScenariosInMemory,
} from '../ops/run-scenarios.js';
import type { ScenarioCase, ScenarioRunResult } from '../ops/types.js';
import type { PolicyIR } from '../types/index.js';

import {
  parseFlags,
  renderErr,
  type HandlerArgv,
  type HandlerResult,
} from './shared.js';

/**
 * `claws policy test` — run fixture scenarios against a mock gateway.
 *
 * Flags:
 *   --file <path>       single scenario YAML file
 *   --dir <path>        directory of scenario YAML files
 *                       (default: <cwd>/test/scenarios)
 *   --gateway <url>     gateway URL (optional — external sim)
 *   --policy-ir <path>  PolicyIR JSON; when set and --gateway is not,
 *                       the handler stands up an ephemeral in-process
 *                       mock gateway for the run
 *   --json              emit JSON result instead of per-case lines
 *
 * Exit codes:
 *   0  — every case passed
 *   1  — one or more cases failed
 *   2  — usage error (missing flags, no scenarios found)
 */
export async function handle(argv: HandlerArgv): Promise<HandlerResult> {
  const { flags } = parseFlags(argv.args);
  const gatewayUrl = typeof flags['gateway'] === 'string' ? flags['gateway'] : undefined;
  const policyIrPath = typeof flags['policy-ir'] === 'string' ? flags['policy-ir'] : undefined;
  const filePath = typeof flags['file'] === 'string' ? flags['file'] : undefined;
  const dirArg = typeof flags['dir'] === 'string' ? flags['dir'] : undefined;
  const asJson = flags['json'] === true;

  if (gatewayUrl === undefined && policyIrPath === undefined) {
    return renderErr(
      argv.binaryName,
      'test',
      'one of --gateway <url> or --policy-ir <path> required',
      2,
    );
  }

  let cases: ScenarioCase[];
  try {
    cases = await loadScenarios(argv.cwd, filePath, dirArg);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return renderErr(argv.binaryName, 'test', message, 2);
  }
  if (cases.length === 0) {
    return renderErr(argv.binaryName, 'test', 'no scenarios found', 2);
  }

  let result: ScenarioRunResult;
  try {
    if (gatewayUrl !== undefined) {
      result = await runScenarios({ gatewayUrl, cases });
    } else {
      const policyIR = await loadPolicyIR(policyIrPath!);
      result = await runScenariosInMemory({ policyIR, cases });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return renderErr(argv.binaryName, 'test', message, 1);
  }

  const stdout = asJson ? `${JSON.stringify(result, null, 2)}\n` : formatRun(result);
  const exitCode = result.failed === 0 ? 0 : 1;
  return { exitCode, stdout, stderr: '' };
}

async function loadPolicyIR(path: string): Promise<PolicyIR> {
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as PolicyIR;
}

async function loadScenarios(
  cwd: string,
  filePath: string | undefined,
  dirArg: string | undefined,
): Promise<ScenarioCase[]> {
  if (filePath !== undefined) {
    const raw = await readFile(filePath, 'utf8');
    return [...parseScenarioYaml(raw)];
  }
  const dir = dirArg !== undefined ? resolve(dirArg) : resolve(cwd, 'test', 'scenarios');
  const entries = await readdir(dir);
  const yamlFiles = entries.filter((e) => e.endsWith('.yaml') || e.endsWith('.yml')).sort();
  const collected: ScenarioCase[] = [];
  for (const name of yamlFiles) {
    const raw = await readFile(join(dir, name), 'utf8');
    collected.push(...parseScenarioYaml(raw));
  }
  return collected;
}

function formatRun(result: ScenarioRunResult): string {
  const lines: string[] = [];
  for (const c of result.cases) {
    const mark = c.passed ? 'PASS' : 'FAIL';
    lines.push(`  [${mark}] ${c.name}`);
    for (const f of c.failures) {
      lines.push(`         ${f}`);
    }
  }
  lines.push(`total=${String(result.total)} passed=${String(result.passed)} failed=${String(result.failed)}`);
  return `${lines.join('\n')}\n`;
}
