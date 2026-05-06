#!/usr/bin/env node
/**
 * run-scenario.mjs — multi-step scenario runner.
 *
 * Each scenario lives at `scenarios/<slug>.scenario.mjs` and walks a
 * workspace through several states with assertions at each step. Unlike
 * run-suite-openclaw.mjs (single CLI invocation per fixture), this runner
 * is for testing LIFECYCLE behavior — promote/mutate/recover, label
 * pinning, upgrade migrations, mid-state recovery.
 *
 * Usage:
 *   node scripts/run-scenario.mjs <slug>      # one scenario
 *   node scripts/run-scenario.mjs --all
 *
 * Output:
 *   results-scenarios/<slug>/{step-NN-name.json, summary.json}
 *   SCENARIOS.md rollup (run with --all)
 */
import { glob } from 'node:fs/promises';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

import { runScenario } from './scenario-lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const SCENARIOS_DIR = join(root, 'scenarios');
const RESULTS_DIR = join(root, 'results-scenarios');
const WORKSPACES_DIR = join(root, 'scratch-scenarios');

async function loadScenarios() {
  if (!existsSync(SCENARIOS_DIR)) {
    console.error(`no scenarios dir at ${SCENARIOS_DIR}`);
    process.exit(2);
  }
  const all = [];
  for (const f of await readdir(SCENARIOS_DIR)) {
    if (f.endsWith('.scenario.mjs')) {
      const path = join(SCENARIOS_DIR, f);
      const mod = await import(pathToFileURL(path).href);
      if (typeof mod.slug !== 'string') {
        console.warn(`${f}: missing slug, skipped`);
        continue;
      }
      all.push({ filename: f, ...mod });
    }
  }
  return all.sort((a, b) => a.slug.localeCompare(b.slug));
}

async function runOne(scenario) {
  const workspaceDir = join(WORKSPACES_DIR, scenario.slug);
  const resultsDir = join(RESULTS_DIR, scenario.slug);
  await rm(workspaceDir, { recursive: true, force: true });
  await rm(resultsDir, { recursive: true, force: true });
  await mkdir(workspaceDir, { recursive: true });
  await mkdir(resultsDir, { recursive: true });

  const summary = await runScenario(scenario, { workspaceDir, resultsDir });
  await writeFile(
    join(resultsDir, 'summary.json'),
    JSON.stringify({ slug: scenario.slug, ...summary, description: scenario.description }, null, 2),
  );
  return summary;
}

function formatStepLine(step) {
  const status = step.ok ? '  ok' : 'FAIL';
  const fails = step.failures.length > 0 ? ` — ${step.failures.join('; ')}` : '';
  return `  ${status} #${step.index} ${step.name}${fails}`;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node scripts/run-scenario.mjs <slug> | --all | --list');
  process.exit(2);
}

const all = await loadScenarios();
let targets;
if (args[0] === '--list') {
  for (const s of all) console.log(`${s.slug}\t${s.description ?? ''}`);
  process.exit(0);
} else if (args[0] === '--all') {
  targets = all;
} else {
  const found = all.find((s) => s.slug === args[0]);
  if (!found) {
    console.error(`no scenario: ${args[0]}; try --list`);
    process.exit(2);
  }
  targets = [found];
}

let totalOk = 0;
let totalFail = 0;
const rollupLines = [];
for (const sc of targets) {
  console.log(`\n=== ${sc.slug} ===`);
  if (sc.description) console.log(`    ${sc.description}`);
  const r = await runOne(sc);
  for (const step of r.steps) console.log(formatStepLine(step));
  if (r.ok) totalOk++;
  else totalFail++;
  rollupLines.push({ slug: sc.slug, description: sc.description, ok: r.ok, stepCount: r.steps.length, failedSteps: r.steps.filter((s) => !s.ok).length });
}

if (targets.length > 1) {
  // Write SCENARIOS.md rollup
  const md = [
    '# Scenario rollup',
    '',
    `Generated: ${new Date().toISOString()}`,
    `Total: ${targets.length}, ok: ${totalOk}, failed: ${totalFail}`,
    '',
    '| slug | description | steps | failed | result |',
    '|------|-------------|------:|-------:|--------|',
    ...rollupLines.map((r) => `| \`${r.slug}\` | ${r.description ?? ''} | ${r.stepCount} | ${r.failedSteps} | ${r.ok ? 'ok' : '**FAIL**'} |`),
    '',
  ].join('\n');
  await writeFile(join(root, 'SCENARIOS.md'), md);
  console.log(`\nrollup: ${totalOk}/${targets.length} ok (${totalFail} failed). wrote SCENARIOS.md`);
}

process.exit(totalFail === 0 ? 0 : 1);
