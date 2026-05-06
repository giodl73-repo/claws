/**
 * scenario-lib.mjs — helpers for the multi-step scenario runner.
 *
 * A scenario is a .scenario.mjs that exports:
 *   - slug:         string identifier
 *   - description:  one-liner
 *   - setup:        { files: { 'rel/path': '<bytes or string>' } }
 *   - steps:        [ {name, ...} ]
 *
 * Each step is exactly one of:
 *
 *   {name, run: ['cage', 'promote', '.'], expect?: <Expect>}
 *     — invoke openclaw fork CLI; capture exitCode + stdout + stderr + parsed
 *       JSON (best-effort). Optional `expect` runs assertions against the
 *       captured shape.
 *
 *   {name, edit: { 'rel/path': {set: '...'} | {append: '...'} | {delete: true} } }
 *     — mutate one or more workspace files between CLI calls.
 *
 *   {name, file: { 'rel/path': {exists: true} | {contains: '...'} | {equals: '...'} } }
 *     — assert post-conditions on workspace files.
 *
 * Expect shape:
 *   {
 *     exitCode?: 0 | 1 | 2,
 *     ok?: true | false,                     // shorthand for parsed.ok
 *     parsed?: { 'jq.path': value, ... },    // dot-paths into parsed JSON
 *     stderrContains?: string,
 *     stdoutContains?: string,
 *   }
 */
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile, appendFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve as resolvePath } from 'node:path';

export const FORK_BIN = 'C:/src/openclaw-fork/openclaw.mjs';

function runOpenclaw(args, cwd) {
  const proc = spawnSync('node', [FORK_BIN, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let parsed = null;
  try { parsed = JSON.parse(proc.stdout); } catch { /* not JSON */ }
  let parsedErr = null;
  try {
    const trimmed = (proc.stderr || '').trim();
    if (trimmed.startsWith('{')) parsedErr = JSON.parse(trimmed);
  } catch { /* not JSON */ }
  return {
    args,
    exitCode: proc.status,
    stdout: proc.stdout,
    stderr: proc.stderr,
    parsed,
    parsedErr,
  };
}

/**
 * Walk a dot-path through an object: 'foo.bar[0].baz' → o.foo.bar[0].baz.
 * Returns undefined if any segment misses.
 */
function pluck(obj, path) {
  if (obj === null || obj === undefined) return undefined;
  // Tokenize: split on '.' then handle [N] suffixes inline.
  const tokens = [];
  for (const part of path.split('.')) {
    const m = part.match(/^([^\[\]]*)((?:\[\d+\])*)$/);
    if (!m) return undefined;
    if (m[1] !== '') tokens.push(m[1]);
    for (const idx of (m[2].match(/\[\d+\]/g) ?? [])) {
      tokens.push(parseInt(idx.slice(1, -1), 10));
    }
  }
  let cur = obj;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[t];
  }
  return cur;
}

function assertExpect(stepName, result, expect) {
  const failures = [];
  if (expect.exitCode !== undefined && result.exitCode !== expect.exitCode) {
    failures.push(`exitCode: expected ${expect.exitCode}, got ${result.exitCode}`);
  }
  if (expect.ok !== undefined) {
    const got = result.parsed?.ok;
    if (got !== expect.ok) failures.push(`parsed.ok: expected ${expect.ok}, got ${got}`);
  }
  if (expect.parsed !== undefined) {
    for (const [path, want] of Object.entries(expect.parsed)) {
      const got = pluck(result.parsed, path);
      const okMatch = matchValue(want, got);
      if (!okMatch) failures.push(`parsed.${path}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    }
  }
  if (expect.stderrContains !== undefined && !result.stderr.includes(expect.stderrContains)) {
    failures.push(`stderr does not contain: ${JSON.stringify(expect.stderrContains)}`);
  }
  if (expect.stdoutContains !== undefined && !result.stdout.includes(expect.stdoutContains)) {
    failures.push(`stdout does not contain: ${JSON.stringify(expect.stdoutContains)}`);
  }
  if (expect.errCode !== undefined) {
    const got = result.parsedErr?.error?.code ?? result.parsed?.code;
    if (got !== expect.errCode) failures.push(`error code: expected ${expect.errCode}, got ${got}`);
  }
  return failures;
}

function matchValue(want, got) {
  if (want === got) return true;
  // Special matchers — operator objects: {greaterThan: N}, {matches: /regex/}
  if (want && typeof want === 'object' && !Array.isArray(want)) {
    if (typeof want.greaterThan === 'number') return typeof got === 'number' && got > want.greaterThan;
    if (typeof want.atLeast === 'number') return typeof got === 'number' && got >= want.atLeast;
    if (typeof want.atMost === 'number') return typeof got === 'number' && got <= want.atMost;
    if (typeof want.matches === 'string') return typeof got === 'string' && new RegExp(want.matches).test(got);
    if (Array.isArray(want.oneOf)) return want.oneOf.includes(got);
  }
  return false;
}

async function applyEdit(workspaceDir, edit) {
  for (const [relPath, op] of Object.entries(edit)) {
    const full = resolvePath(workspaceDir, relPath);
    if (op.delete === true) {
      if (existsSync(full)) await rm(full, { force: true });
      continue;
    }
    await mkdir(dirname(full), { recursive: true });
    if (typeof op.set === 'string') {
      await writeFile(full, op.set);
    } else if (typeof op.append === 'string') {
      await appendFile(full, op.append);
    } else if (op.bytes instanceof Uint8Array || Buffer.isBuffer(op.bytes)) {
      await writeFile(full, op.bytes);
    } else {
      throw new Error(`unknown edit op for ${relPath}: ${JSON.stringify(op)}`);
    }
  }
}

async function checkFile(workspaceDir, fileChecks) {
  const failures = [];
  for (const [relPath, check] of Object.entries(fileChecks)) {
    const full = resolvePath(workspaceDir, relPath);
    const exists = existsSync(full);
    if (check.exists === true && !exists) { failures.push(`${relPath}: expected to exist`); continue; }
    if (check.exists === false && exists) { failures.push(`${relPath}: expected to not exist`); continue; }
    if (check.equals !== undefined || check.contains !== undefined || check.matches !== undefined) {
      if (!exists) { failures.push(`${relPath}: missing (cannot check contents)`); continue; }
      const body = await readFile(full, 'utf8');
      if (check.equals !== undefined && body !== check.equals) {
        failures.push(`${relPath}: contents differ from equals`);
      }
      if (check.contains !== undefined && !body.includes(check.contains)) {
        failures.push(`${relPath}: does not contain ${JSON.stringify(check.contains)}`);
      }
      if (check.notContains !== undefined && body.includes(check.notContains)) {
        failures.push(`${relPath}: unexpectedly contains ${JSON.stringify(check.notContains)}`);
      }
      if (check.matches !== undefined && !new RegExp(check.matches).test(body)) {
        failures.push(`${relPath}: does not match /${check.matches}/`);
      }
    }
  }
  return failures;
}

async function stageSetup(workspaceDir, setup) {
  if (!setup?.files) return;
  for (const [relPath, content] of Object.entries(setup.files)) {
    const full = resolvePath(workspaceDir, relPath);
    await mkdir(dirname(full), { recursive: true });
    if (Buffer.isBuffer(content) || content instanceof Uint8Array) {
      await writeFile(full, content);
    } else {
      await writeFile(full, content);
    }
  }
}

/**
 * Run a single scenario. Returns {ok, steps: [{name, ok, failures, result?}]}.
 */
export async function runScenario(scenario, opts) {
  const { workspaceDir, resultsDir } = opts;
  await mkdir(workspaceDir, { recursive: true });
  await stageSetup(workspaceDir, scenario.setup);

  const stepResults = [];
  let lastRunResult = null;
  let scenarioFailed = false;

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];
    const stepName = step.name ?? `step-${i + 1}`;
    let failures = [];
    let result = null;

    try {
      if (Array.isArray(step.run)) {
        result = runOpenclaw(step.run, workspaceDir);
        lastRunResult = result;
        if (step.expect !== undefined) {
          failures = assertExpect(stepName, result, step.expect);
        }
      } else if (step.edit !== undefined) {
        await applyEdit(workspaceDir, step.edit);
      } else if (step.file !== undefined) {
        failures = await checkFile(workspaceDir, step.file);
      } else if (step.expect !== undefined) {
        if (lastRunResult === null) {
          failures.push('expect step has no preceding run step to assert against');
        } else {
          failures = assertExpect(stepName, lastRunResult, step.expect);
        }
      } else {
        failures.push(`unknown step shape: ${JSON.stringify(step)}`);
      }
    } catch (err) {
      failures.push(`step threw: ${err instanceof Error ? err.message : String(err)}`);
    }

    const stepOk = failures.length === 0;
    stepResults.push({ index: i + 1, name: stepName, ok: stepOk, failures, result });
    if (!stepOk) scenarioFailed = true;

    if (resultsDir && result) {
      await writeFile(
        join(resultsDir, `step-${String(i + 1).padStart(2, '0')}-${slugify(stepName)}.json`),
        JSON.stringify(result, null, 2),
      );
    }
  }

  return { ok: !scenarioFailed, steps: stepResults };
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}
