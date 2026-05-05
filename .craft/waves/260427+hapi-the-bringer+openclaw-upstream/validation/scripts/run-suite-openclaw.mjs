#!/usr/bin/env node
/**
 * run-suite-openclaw.mjs — same harness as run-suite.mjs but invokes the
 * upstream-shaped `node openclaw.mjs <verb> <args>` instead of the per-
 * package bins. Validates the substrate train as it'll appear in the
 * openclaw fork.
 *
 * Output: results-openclaw/<slug>/{path,lint,policy-generate,policy-check,lkg}.json
 *
 * Usage:
 *   node scripts/run-suite-openclaw.mjs <slug>
 *   node scripts/run-suite-openclaw.mjs --all
 */
import { readFile, writeFile, mkdir, rm, cp } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const FORK_BIN = 'C:/src/openclaw-fork/openclaw.mjs';

async function loadManifest() {
  const raw = await readFile(join(root, 'manifest.json'), 'utf8');
  return JSON.parse(raw);
}

async function stageOne(entry) {
  const src = join(root, 'fixtures', entry.kind, entry.slug);
  const dst = join(root, 'scratch-openclaw', entry.slug);
  await rm(dst, { recursive: true, force: true });
  await mkdir(dst, { recursive: true });
  await cp(src, dst, { recursive: true });
  return dst;
}

function runOpenclaw(label, verbAndArgs, cwd) {
  const proc = spawnSync('node', [FORK_BIN, ...verbAndArgs], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let parsed = null;
  try {
    parsed = JSON.parse(proc.stdout);
  } catch {
    // Some CLIs print human output by default; keep raw if not JSON.
  }
  return {
    label,
    exitCode: proc.status,
    stdout: proc.stdout,
    stderr: proc.stderr,
    parsed,
  };
}

async function runSuite(entry) {
  const scratch = await stageOne(entry);
  const resultsDir = join(root, 'results-openclaw', entry.slug);
  await mkdir(resultsDir, { recursive: true });

  // Tool 1: path validate (smoke)
  const pathRes = runOpenclaw(
    'path',
    ['path', 'validate', 'oc://AGENTS.md', '--cwd', scratch, '--json'],
    scratch,
  );
  await writeFile(join(resultsDir, 'path.json'), JSON.stringify(pathRes, null, 2));

  // Tool 2: lint (pinch run)
  const lintRes = runOpenclaw('lint', ['pinch', 'run', scratch], scratch);
  await writeFile(join(resultsDir, 'lint.json'), JSON.stringify(lintRes, null, 2));

  // Tool 3: doctor — extends existing openclaw doctor; no separate verb yet
  await writeFile(
    join(resultsDir, 'doctor.json'),
    JSON.stringify({ label: 'doctor', skipped: 'extends-existing-openclaw-doctor' }, null, 2),
  );

  // Tool 4: policy generate (only if MD source files present)
  const hasSources =
    existsSync(join(scratch, 'TOOLS.md')) ||
    existsSync(join(scratch, 'SOUL.md')) ||
    existsSync(join(scratch, 'AGENTS.md'));
  if (hasSources) {
    const genRes = runOpenclaw('policy-generate', ['policy', 'generate', scratch], scratch);
    await writeFile(join(resultsDir, 'policy-generate.json'), JSON.stringify(genRes, null, 2));
  } else {
    await writeFile(
      join(resultsDir, 'policy-generate.json'),
      JSON.stringify({ label: 'policy-generate', skipped: 'no-md-sources' }, null, 2),
    );
  }

  // Tool 5: policy check (only if policy.jsonc present)
  if (existsSync(join(scratch, 'policy.jsonc'))) {
    const checkRes = runOpenclaw('policy-check', ['policy', 'check', scratch], scratch);
    await writeFile(join(resultsDir, 'policy-check.json'), JSON.stringify(checkRes, null, 2));
  } else {
    await writeFile(
      join(resultsDir, 'policy-check.json'),
      JSON.stringify({ label: 'policy-check', skipped: 'no-policy-jsonc' }, null, 2),
    );
  }

  // Tool 6: cage status (LKG observe sweep)
  const lkgRes = runOpenclaw('lkg', ['cage', 'status', scratch], scratch);
  await writeFile(join(resultsDir, 'lkg.json'), JSON.stringify(lkgRes, null, 2));

  return {
    slug: entry.slug,
    kind: entry.kind,
    scratch,
    resultsDir: relative(root, resultsDir),
  };
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('usage: node scripts/run-suite-openclaw.mjs <slug> | --all');
  process.exit(2);
}

const manifest = await loadManifest();
const targets =
  args[0] === '--all'
    ? manifest.fixtures
    : manifest.fixtures.filter((f) => f.slug === args[0]);

if (targets.length === 0) {
  console.error(`no fixtures match: ${args[0]}`);
  process.exit(2);
}

for (const entry of targets) {
  const summary = await runSuite(entry);
  process.stdout.write(JSON.stringify(summary) + '\n');
}
