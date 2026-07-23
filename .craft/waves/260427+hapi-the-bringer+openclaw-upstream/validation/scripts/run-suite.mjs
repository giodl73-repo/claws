#!/usr/bin/env node
/**
 * run-suite.mjs — stage + run all 5 tools against a fixture
 *
 * Output: results/<slug>/{path,lint,doctor,policy-generate,policy-check,lkg}.json
 *
 * Usage:
 *   node scripts/run-suite.mjs <slug>
 *   node scripts/run-suite.mjs --all
 */
import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const repoRoot = join(root, "..", "..", "..", "..");

const BIN_PATH = join(repoRoot, "packages", "oc-paths-substrate", "bin", "openclaw-path.mjs");
const BIN_LINT = join(repoRoot, "packages", "pinch", "bin", "openclaw-pinch.mjs");
const BIN_LKG = join(repoRoot, "packages", "lkg-recovery-substrate", "bin", "openclaw-cage.mjs");
const BIN_POLICY = join(repoRoot, "packages", "policy-substrate", "bin", "openclaw-policy.mjs");

async function loadManifest() {
  const raw = await readFile(join(root, "manifest.json"), "utf8");
  return JSON.parse(raw);
}

async function stageOne(entry) {
  const src = join(root, "fixtures", entry.kind, entry.slug);
  const dst = join(root, "scratch", entry.slug);
  await rm(dst, { recursive: true, force: true });
  await mkdir(dst, { recursive: true });
  await cp(src, dst, { recursive: true });
  return dst;
}

function runJson(label, bin, args, cwd) {
  const proc = spawnSync("node", [bin, ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  let parsed = null;
  try {
    parsed = JSON.parse(proc.stdout);
  } catch {
    // Some CLIs print human output by default — keep raw if not JSON.
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
  const resultsDir = join(root, "results", entry.slug);
  await mkdir(resultsDir, { recursive: true });

  // Tool 1: path workspace manifest
  const pathRes = runJson(
    "path",
    BIN_PATH,
    ["validate", `oc://AGENTS.md`, "--cwd", scratch, "--json"],
    scratch,
  );
  await writeFile(join(resultsDir, "path.json"), JSON.stringify(pathRes, null, 2));

  // Tool 2: lint
  const lintRes = runJson("lint", BIN_LINT, ["run", scratch], scratch);
  await writeFile(join(resultsDir, "lint.json"), JSON.stringify(lintRes, null, 2));

  // Tool 3: doctor — adapter only (no CLI bin); placeholder for now
  await writeFile(
    join(resultsDir, "doctor.json"),
    JSON.stringify(
      {
        label: "doctor",
        skipped: "no-cli-bin",
        note: "oc-doctor plugs into upstream openclaw doctor; harness will invoke adapter directly",
      },
      null,
      2,
    ),
  );

  // Tool 4: policy generate (only if MD source files present)
  const hasSources =
    existsSync(join(scratch, "TOOLS.md")) ||
    existsSync(join(scratch, "SOUL.md")) ||
    existsSync(join(scratch, "AGENTS.md"));
  if (hasSources) {
    const genRes = runJson("policy-generate", BIN_POLICY, ["generate", scratch], scratch);
    await writeFile(join(resultsDir, "policy-generate.json"), JSON.stringify(genRes, null, 2));
  } else {
    await writeFile(
      join(resultsDir, "policy-generate.json"),
      JSON.stringify({ label: "policy-generate", skipped: "no-md-sources" }, null, 2),
    );
  }

  // Tool 5: policy check (only if policy.jsonc present)
  if (existsSync(join(scratch, "policy.jsonc"))) {
    const checkRes = runJson("policy-check", BIN_POLICY, ["check", scratch], scratch);
    await writeFile(join(resultsDir, "policy-check.json"), JSON.stringify(checkRes, null, 2));
  } else {
    await writeFile(
      join(resultsDir, "policy-check.json"),
      JSON.stringify({ label: "policy-check", skipped: "no-policy-jsonc" }, null, 2),
    );
  }

  // Tool 6: lkg status (no fault simulation yet — that's a v2 enhancement)
  const lkgRes = runJson("lkg", BIN_LKG, ["status", scratch], scratch);
  await writeFile(join(resultsDir, "lkg.json"), JSON.stringify(lkgRes, null, 2));

  return {
    slug: entry.slug,
    kind: entry.kind,
    scratch,
    resultsDir: relative(root, resultsDir),
  };
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("usage: node scripts/run-suite.mjs <slug> | --all");
  process.exit(2);
}

const manifest = await loadManifest();
const targets =
  args[0] === "--all" ? manifest.fixtures : manifest.fixtures.filter((f) => f.slug === args[0]);

if (targets.length === 0) {
  console.error(`no fixtures match: ${args[0]}`);
  process.exit(2);
}

for (const entry of targets) {
  const summary = await runSuite(entry);
  process.stdout.write(JSON.stringify(summary) + "\n");
}
