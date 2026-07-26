import { spawnSync } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import process from "node:process";

const repositoryRoot = resolve(import.meta.dirname, "..");
const invocationRoot = process.cwd();
const packageRoot = join(repositoryRoot, "packages", "cli");
const fixtureRoot = join(packageRoot, "test", "fixtures", "valid");
const openClawFixtureRoot = join(packageRoot, "test", "fixtures", "openclaw-basic");
const proofRoot = await mkdtemp(join(tmpdir(), "claws-packed-cli-proof-"));
const packRoot = join(proofRoot, "pack");
const installRoot = join(proofRoot, "install");
const openClawStateRoot = join(proofRoot, "openclaw-state");
const openClawHome = join(proofRoot, "home");
const npmCommand =
  process.platform === "win32" ? join(dirname(process.execPath), "npm.cmd") : "npm";

function run(command, args, options = {}) {
  const windowsCommand = process.platform === "win32" && command.endsWith(".cmd");
  const spawnCommand = windowsCommand ? (process.env.ComSpec ?? "cmd.exe") : command;
  const spawnArgs = windowsCommand
    ? [
        "/d",
        "/s",
        "/c",
        `"${[command, ...args].map((value) => `"${value.replaceAll('"', '""')}"`).join(" ")}"`,
      ]
    : args;
  const result = spawnSync(spawnCommand, spawnArgs, {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    maxBuffer: 8 * 1024 * 1024,
    windowsVerbatimArguments: windowsCommand,
    ...options,
  });
  if (result.error) {
    throw result.error;
  }
  return result;
}

function requireExit(result, expected, label) {
  if (result.status !== expected) {
    throw new Error(
      `${label} exited ${result.status ?? "without a status"}; expected ${expected}.\n${result.stderr}${result.stdout}`,
    );
  }
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} did not return JSON: ${error.message}\n${value}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runInstalledBin(args, env = process.env) {
  const bin = join(
    installRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "claws-dev.cmd" : "claws-dev",
  );
  return run(bin, args, { cwd: installRoot, env });
}

try {
  await mkdir(packRoot);
  const pack = run(npmCommand, [
    "pack",
    "--ignore-scripts",
    "--json",
    "--pack-destination",
    packRoot,
    packageRoot,
  ]);
  requireExit(pack, 0, "npm pack");
  const packResults = parseJson(pack.stdout, "npm pack");
  assert(Array.isArray(packResults) && packResults.length === 1, "npm pack returned one artifact.");
  const packed = packResults[0];
  assert(packed.name === "@claws/cli-private", "The artifact has the private incubation name.");
  assert(packed.version === "0.0.0-private", "The artifact has the private incubation version.");
  assert(typeof packed.integrity === "string", "npm pack returned artifact integrity.");
  const packedPaths = packed.files.map((file) => file.path);
  assert(packedPaths.includes("package.json"), "The artifact contains package.json.");
  assert(packedPaths.includes("README.md"), "The artifact contains its operator README.");
  assert(packedPaths.includes("dist/cli.mjs"), "The artifact contains the CLI entry point.");
  assert(
    packedPaths.every(
      (path) =>
        path === "package.json" || path === "README.md" || /^dist\/[\w.-]+\.mjs$/.test(path),
    ),
    "The artifact contains only package metadata, documentation, and bundled runtime modules.",
  );

  const tarball = join(packRoot, packed.filename);
  const install = run(npmCommand, [
    "install",
    "--offline",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--prefix",
    installRoot,
    tarball,
  ]);
  requireExit(install, 0, "isolated npm install");

  const installedManifest = parseJson(
    await readFile(
      join(installRoot, "node_modules", "@claws", "cli-private", "package.json"),
      "utf8",
    ),
    "installed package.json",
  );
  assert(installedManifest.private === true, "The installed artifact remains private.");
  assert(
    installedManifest.dependencies === undefined,
    "The bundled artifact has no runtime dependencies.",
  );
  assert(
    installedManifest.bin?.["claws-dev"] === "dist/cli.mjs",
    "The temporary bin mapping is intact.",
  );
  await access(
    join(
      installRoot,
      "node_modules",
      ".bin",
      process.platform === "win32" ? "claws-dev.cmd" : "claws-dev",
    ),
  );

  const help = runInstalledBin(["--help"], { ...process.env, OPENCLAW_EXPERIMENTAL_CLAWS: "0" });
  requireExit(help, 0, "packed CLI help");
  assert(help.stdout.includes("Usage:"), "The packed CLI exposes ungated help.");
  const version = runInstalledBin(["--version"], {
    ...process.env,
    OPENCLAW_EXPERIMENTAL_CLAWS: "0",
  });
  requireExit(version, 0, "packed CLI version");
  assert(version.stdout.trim() === "0.0.0-private", "The packed CLI reports its package version.");

  const gated = runInstalledBin(["inspect", fixtureRoot, "--json"], {
    ...process.env,
    OPENCLAW_EXPERIMENTAL_CLAWS: "0",
  });
  requireExit(gated, 2, "disabled packed CLI");
  const gatedOutcome = parseJson(gated.stderr, "disabled packed CLI");
  assert(
    gatedOutcome.diagnostics?.[0]?.code === "experimental_claws_disabled",
    "The packed CLI preserves the experimental gate.",
  );

  const inspected = runInstalledBin(["inspect", fixtureRoot, "--json"], {
    ...process.env,
    OPENCLAW_EXPERIMENTAL_CLAWS: "1",
  });
  requireExit(inspected, 0, "packed CLI inspect");
  const inspectOutcome = parseJson(inspected.stdout, "packed CLI inspect");
  assert(inspectOutcome.ok === true, "The packed CLI inspects a Claw package.");
  assert(
    inspectOutcome.package?.packageName === "@example/incident-triage-claw",
    "The packed CLI returns the expected package identity.",
  );

  let openClawPreview;
  if (process.env.OPENCLAW_CLI_ENTRY) {
    await mkdir(openClawHome);
    await mkdir(openClawStateRoot);
    const preview = runInstalledBin(
      [openClawFixtureRoot, "--agent", "openclaw", "--dry-run", "--json"],
      {
        ...process.env,
        HOME: openClawHome,
        OPENCLAW_CONFIG_PATH: join(openClawStateRoot, "openclaw.json"),
        OPENCLAW_CLI_ENTRY: resolve(invocationRoot, process.env.OPENCLAW_CLI_ENTRY),
        OPENCLAW_EXPERIMENTAL_CLAWS: "1",
        OPENCLAW_HOME: openClawStateRoot,
        OPENCLAW_STATE_DIR: openClawStateRoot,
      },
    );
    requireExit(preview, 0, "packed CLI OpenClaw preview");
    const previewOutcome = parseJson(preview.stdout, "packed CLI OpenClaw preview");
    assert(previewOutcome.ok === true, "The packed CLI delegates an OpenClaw preview.");
    assert(previewOutcome.harness?.id === "openclaw", "The preview used the OpenClaw adapter.");
    assert(
      typeof previewOutcome.harness?.outcome?.planIntegrity === "string",
      "OpenClaw returned a plan-integrity value.",
    );
    openClawPreview = true;
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        schemaVersion: "claws.packedCliProof.v0",
        package: `${packed.name}@${packed.version}`,
        integrity: packed.integrity,
        entries: packed.entryCount,
        experimentalGate: true,
        inspect: true,
        openClawPreview: openClawPreview ?? false,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await rm(proofRoot, { recursive: true, force: true });
}
