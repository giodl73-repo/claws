import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { CliError } from "./errors.js";
import type { LocalClawPackage } from "./types.js";

const MAX_ADAPTER_OUTPUT_BYTES = 4 * 1024 * 1024;
const ADAPTER_PREVIEW_TIMEOUT_MS = 2 * 60 * 1000;
const ADAPTER_APPLY_TIMEOUT_MS = 10 * 60 * 1000;
const ADAPTER_KILL_GRACE_MS = 5 * 1000;
const SNAPSHOT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SNAPSHOT_CACHE_ACTIVE_GRACE_MS = 15 * 60 * 1000;
const SNAPSHOT_CACHE_LOCK_STALE_MS = 10 * 60 * 1000;
const SNAPSHOT_CACHE_LOCK_WAIT_MS = 30 * 1000;
const MAX_SNAPSHOT_CACHE_ENTRIES = 16;
const MAX_SNAPSHOT_CACHE_BYTES = 512 * 1024 * 1024;

export type HarnessPreview = {
  id: string;
  outcome: unknown;
};

export type HarnessApply = HarnessPreview;

type ProcessResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export type AdapterRuntime = {
  run(
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv,
    cwd?: string,
    timeoutMs?: number,
  ): Promise<ProcessResult>;
};

function appendBounded(chunks: Buffer[], chunk: Buffer, currentBytes: number): number {
  const nextBytes = currentBytes + chunk.byteLength;
  if (nextBytes > MAX_ADAPTER_OUTPUT_BYTES) {
    throw new CliError({
      code: "adapter_output_too_large",
      phase: "adapter",
      message: `Harness output exceeds ${MAX_ADAPTER_OUTPUT_BYTES} bytes.`,
    });
  }
  chunks.push(chunk);
  return nextBytes;
}

function forceKillProcessTree(child: Pick<ChildProcess, "kill" | "pid">): void {
  if (process.platform === "win32" && child.pid !== undefined) {
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    killer.on("error", () => {});
    killer.unref();
  } else if (child.pid !== undefined) {
    try {
      process.kill(-child.pid, "SIGKILL");
      return;
    } catch {
      // Fall back to killing the direct process if its group has already exited.
    }
  }
  child.kill("SIGKILL");
}

export function runAdapterProcess(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  cwd?: string,
  timeoutMs = ADAPTER_PREVIEW_TIMEOUT_MS,
): Promise<ProcessResult> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, {
      env,
      cwd,
      detached: process.platform !== "win32",
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let terminalError: unknown;
    let settled = false;
    let killGraceTimer: NodeJS.Timeout | undefined;

    const timeoutError = new CliError({
      code: "adapter_timeout",
      phase: "adapter",
      message: `Harness command exceeded ${timeoutMs} milliseconds. Inspect harness status before retrying because mutation may be partial.`,
    });
    const timeout = setTimeout(() => terminate(timeoutError), timeoutMs);
    timeout.unref();

    function settle(error?: unknown, result?: ProcessResult): void {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (killGraceTimer) {
        clearTimeout(killGraceTimer);
      }
      if (error !== undefined) {
        reject(error);
      } else {
        resolveResult(result!);
      }
    }

    function terminate(error: unknown): void {
      if (terminalError !== undefined) {
        return;
      }
      terminalError = error;
      forceKillProcessTree(child);
      killGraceTimer = setTimeout(() => settle(error), ADAPTER_KILL_GRACE_MS);
      killGraceTimer.unref();
    }

    child.stdout.on("data", (chunk: Buffer) => {
      try {
        stdoutBytes = appendBounded(stdout, chunk, stdoutBytes);
      } catch (error) {
        terminate(error);
      }
    });
    child.stderr.on("data", (chunk: Buffer) => {
      try {
        stderrBytes = appendBounded(stderr, chunk, stderrBytes);
      } catch (error) {
        terminate(error);
      }
    });
    child.once("error", (error) => settle(terminalError ?? error));
    child.once("close", (code) => {
      if (terminalError) {
        settle(terminalError);
        return;
      }
      settle(undefined, {
        exitCode: code ?? 1,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });
  });
}

const defaultRuntime: AdapterRuntime = {
  run(command, args, env, cwd, timeoutMs) {
    return runAdapterProcess(command, args, env, cwd, timeoutMs);
  },
};

function failUnsafeSnapshot(message: string): never {
  throw new CliError({ code: "unsafe_snapshot_cache", phase: "adapter", message });
}

function hasErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function resolvePrivateSnapshotParent(): Promise<string> {
  const base = await realpath(tmpdir());
  const uid = typeof process.getuid === "function" ? process.getuid() : undefined;
  const parent = join(base, `claws-reviewed-snapshots-v0${uid === undefined ? "" : `-${uid}`}`);
  await mkdir(parent, { mode: 0o700 }).catch((error: unknown) => {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) {
      throw error;
    }
  });
  const info = await lstat(parent);
  const resolvedParent = await realpath(parent);
  const sameParent =
    process.platform === "win32"
      ? dirname(resolvedParent).toLowerCase() === base.toLowerCase()
      : dirname(resolvedParent) === base;
  if (info.isSymbolicLink() || !info.isDirectory() || !sameParent) {
    failUnsafeSnapshot("The reviewed snapshot cache must be a real directory inside OS temp.");
  }
  if (uid !== undefined && info.uid !== uid) {
    failUnsafeSnapshot("The reviewed snapshot cache is not owned by the current user.");
  }
  if (process.platform !== "win32" && (info.mode & 0o077) !== 0) {
    failUnsafeSnapshot("The reviewed snapshot cache must not be accessible by other users.");
  }
  return resolvedParent;
}

async function acquireSnapshotCacheLock(parent: string): Promise<() => Promise<void>> {
  const lockRoot = join(parent, ".maintenance-lock");
  const ownerPath = join(lockRoot, "owner");
  const owner = randomUUID();
  const deadline = Date.now() + SNAPSHOT_CACHE_LOCK_WAIT_MS;
  while (true) {
    try {
      await mkdir(lockRoot, { mode: 0o700 });
    } catch (error) {
      if (!hasErrorCode(error, "EEXIST")) {
        throw error;
      }
      const info = await lstat(lockRoot).catch((statError: unknown) => {
        if (hasErrorCode(statError, "ENOENT")) {
          return undefined;
        }
        throw statError;
      });
      if (!info) {
        continue;
      }
      if (info.isSymbolicLink() || !info.isDirectory()) {
        failUnsafeSnapshot("The reviewed snapshot cache maintenance lock is unsafe.");
      }
      if (Date.now() - info.mtimeMs >= SNAPSHOT_CACHE_LOCK_STALE_MS) {
        const staleRoot = join(parent, `.maintenance-stale-${randomUUID()}`);
        try {
          await rename(lockRoot, staleRoot);
          await rm(staleRoot, { recursive: true, force: true });
        } catch (renameError) {
          if (!hasErrorCode(renameError, "ENOENT")) {
            throw renameError;
          }
        }
        continue;
      }
      if (Date.now() >= deadline) {
        throw new CliError({
          code: "snapshot_cache_busy",
          phase: "adapter",
          message: "Timed out waiting for another reviewed snapshot cache operation to finish.",
        });
      }
      await delay(50);
      continue;
    }

    try {
      await writeFile(ownerPath, owner, { flag: "wx", mode: 0o600 });
    } catch (error) {
      await rm(lockRoot, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
    return async () => {
      const currentOwner = await readFile(ownerPath, "utf8").catch(() => undefined);
      if (currentOwner === owner) {
        await rm(lockRoot, { recursive: true, force: true });
      }
    };
  }
}

async function snapshotFiles(root: string, prefix = ""): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(join(root, prefix), { withFileTypes: true })) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isSymbolicLink()) {
      failUnsafeSnapshot(`Reviewed snapshot entry ${relativePath} may not be a symlink.`);
    }
    if (entry.isDirectory()) {
      files.push(...(await snapshotFiles(root, relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      failUnsafeSnapshot(`Reviewed snapshot entry ${relativePath} must be a regular file.`);
    }
  }
  return files;
}

async function verifyStableSnapshot(root: string, claw: LocalClawPackage): Promise<void> {
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
    failUnsafeSnapshot("The content-addressed reviewed snapshot root is unsafe.");
  }
  const expected = new Map(claw.payload.map((file) => [file.path, file.bytes]));
  const actualPaths = (await snapshotFiles(root)).toSorted();
  if (actualPaths.length !== expected.size || actualPaths.some((path) => !expected.has(path))) {
    failUnsafeSnapshot("The content-addressed reviewed snapshot has an unexpected file set.");
  }
  for (const path of actualPaths) {
    const info = await lstat(resolve(root, ...path.split("/")));
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1) {
      failUnsafeSnapshot(`Reviewed snapshot entry ${path} is not an independent regular file.`);
    }
    if (!(await readFile(resolve(root, ...path.split("/")))).equals(expected.get(path)!)) {
      failUnsafeSnapshot(`Reviewed snapshot entry ${path} does not match inspected bytes.`);
    }
  }
}

type CachedSnapshot = {
  bytes: number;
  lastUsedMs: number;
  name: string;
  root: string;
};

async function inspectCachedSnapshot(parent: string, name: string): Promise<CachedSnapshot> {
  const root = join(parent, name);
  const rootInfo = await lstat(root);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) {
    failUnsafeSnapshot(`Reviewed snapshot cache entry ${name} must be a real directory.`);
  }
  let bytes = 0;
  for (const path of await snapshotFiles(root)) {
    const info = await lstat(resolve(root, ...path.split("/")));
    if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1) {
      failUnsafeSnapshot(`Reviewed snapshot cache entry ${name}/${path} is unsafe.`);
    }
    bytes += info.size;
  }
  return { bytes, lastUsedMs: rootInfo.mtimeMs, name, root };
}

async function removeCachedSnapshot(snapshot: CachedSnapshot, now: number): Promise<boolean> {
  const current = await stat(snapshot.root).catch(() => undefined);
  if (!current || now - current.mtimeMs < SNAPSHOT_CACHE_ACTIVE_GRACE_MS) {
    return false;
  }
  await rm(snapshot.root, { recursive: true, force: true });
  return true;
}

async function maintainSnapshotCache(params: {
  parent: string;
  preserveDigest: string;
  reserveBytes: number;
  reserveEntry: boolean;
}): Promise<void> {
  if (params.reserveBytes > MAX_SNAPSHOT_CACHE_BYTES) {
    throw new CliError({
      code: "snapshot_cache_full",
      phase: "adapter",
      message: "The reviewed snapshot is larger than the bounded snapshot cache.",
    });
  }
  const now = Date.now();
  const snapshots: CachedSnapshot[] = [];
  for (const entry of await readdir(params.parent, { withFileTypes: true })) {
    if (entry.name === ".maintenance-lock") {
      continue;
    }
    if (/^\.maintenance-stale-[0-9a-f-]{36}$/.test(entry.name)) {
      const staleRoot = join(params.parent, entry.name);
      const info = await lstat(staleRoot);
      if (info.isSymbolicLink() || !info.isDirectory()) {
        failUnsafeSnapshot(`Reviewed snapshot stale-lock entry ${entry.name} is unsafe.`);
      }
      await rm(staleRoot, { recursive: true, force: true });
      continue;
    }
    if (/^[0-9a-f]{64}$/.test(entry.name)) {
      snapshots.push(await inspectCachedSnapshot(params.parent, entry.name));
      continue;
    }
    if (/^[0-9a-f]{64}\.staging-/.test(entry.name)) {
      const stagingRoot = join(params.parent, entry.name);
      const info = await lstat(stagingRoot);
      if (info.isSymbolicLink() || !info.isDirectory()) {
        failUnsafeSnapshot(`Reviewed snapshot staging entry ${entry.name} is unsafe.`);
      }
      if (now - info.mtimeMs >= SNAPSHOT_CACHE_ACTIVE_GRACE_MS) {
        await rm(stagingRoot, { recursive: true, force: true });
      }
      continue;
    }
    failUnsafeSnapshot(`Unexpected entry ${entry.name} exists in the reviewed snapshot cache.`);
  }

  const preservedExists = snapshots.some((snapshot) => snapshot.name === params.preserveDigest);
  let entries = snapshots.length + (params.reserveEntry && !preservedExists ? 1 : 0);
  let bytes = snapshots.reduce(
    (total, snapshot) => total + snapshot.bytes,
    preservedExists ? 0 : params.reserveBytes,
  );
  const candidates = snapshots
    .filter((snapshot) => snapshot.name !== params.preserveDigest)
    .toSorted((left, right) => left.lastUsedMs - right.lastUsedMs);
  for (const snapshot of candidates) {
    const expired = now - snapshot.lastUsedMs >= SNAPSHOT_CACHE_TTL_MS;
    const overLimit = entries > MAX_SNAPSHOT_CACHE_ENTRIES || bytes > MAX_SNAPSHOT_CACHE_BYTES;
    if (!expired && !overLimit) {
      continue;
    }
    if (await removeCachedSnapshot(snapshot, now)) {
      entries -= 1;
      bytes -= snapshot.bytes;
    }
  }
  if (entries > MAX_SNAPSHOT_CACHE_ENTRIES || bytes > MAX_SNAPSHOT_CACHE_BYTES) {
    throw new CliError({
      code: "snapshot_cache_full",
      phase: "adapter",
      message:
        "The reviewed snapshot cache is full and only contains recently active snapshots. Retry after active operations finish.",
    });
  }
}

async function materializeStableSnapshot(claw: LocalClawPackage): Promise<string> {
  const digest = /^sha256:([0-9a-f]{64})$/.exec(claw.source.integrity)?.[1];
  if (!digest) {
    throw new CliError({
      code: "invalid_source_integrity",
      phase: "adapter",
      message: "The inspected Claw source does not have a canonical SHA-256 integrity value.",
    });
  }
  const parent = await resolvePrivateSnapshotParent();
  const releaseLock = await acquireSnapshotCacheLock(parent);
  try {
    const root = join(parent, digest);
    const existing = await lstat(root).catch((error: unknown) => {
      if (hasErrorCode(error, "ENOENT")) {
        return undefined;
      }
      throw error;
    });
    if (existing) {
      await verifyStableSnapshot(root, claw);
      const now = new Date();
      await utimes(root, now, now);
      await maintainSnapshotCache({
        parent,
        preserveDigest: digest,
        reserveBytes: 0,
        reserveEntry: false,
      });
      return root;
    }
    const payloadBytes = claw.payload.reduce((total, file) => total + file.bytes.byteLength, 0);
    await maintainSnapshotCache({
      parent,
      preserveDigest: digest,
      reserveBytes: payloadBytes,
      reserveEntry: true,
    });
    const staging = await mkdtemp(join(parent, `${digest}.staging-`));
    try {
      for (const file of claw.payload) {
        const target = resolve(staging, ...file.path.split("/"));
        await mkdir(dirname(target), { recursive: true, mode: 0o700 });
        await writeFile(target, file.bytes, { flag: "wx", mode: 0o600 });
      }
      await rename(staging, root);
    } catch (error) {
      await rm(staging, { recursive: true, force: true });
      throw error;
    }
    await rm(staging, { recursive: true, force: true });
    await verifyStableSnapshot(root, claw);
    const now = new Date();
    await utimes(root, now, now);
    return root;
  } finally {
    await releaseLock();
  }
}

async function resolveOpenClawInvocation(env: NodeJS.ProcessEnv): Promise<{
  command: string;
  prefix: string[];
  cwd?: string;
}> {
  const configured = env.OPENCLAW_CLI_ENTRY?.trim();
  if (configured) {
    const entry = resolve(configured);
    return { command: process.execPath, prefix: [entry], cwd: dirname(entry) };
  }
  if (process.platform === "win32") {
    throw new CliError({
      code: "openclaw_entry_required",
      phase: "adapter",
      message:
        "Set OPENCLAW_CLI_ENTRY to the installed openclaw.mjs path during Windows incubation.",
      path: "openclaw",
    });
  }
  return { command: "openclaw", prefix: [] };
}

export async function previewWithHarness(
  harness: string,
  claw: LocalClawPackage,
  runtime: AdapterRuntime = defaultRuntime,
  env: NodeJS.ProcessEnv = process.env,
): Promise<HarnessPreview> {
  return delegateOpenClawAdd({ harness, claw, mode: "preview", runtime, env });
}

export async function applyWithHarness(
  harness: string,
  claw: LocalClawPackage,
  planIntegrity: string,
  runtime: AdapterRuntime = defaultRuntime,
  env: NodeJS.ProcessEnv = process.env,
): Promise<HarnessApply> {
  if (!planIntegrity) {
    throw new CliError({
      code: "plan_integrity_required",
      phase: "arguments",
      message: "Harness apply requires the integrity from an exact dry-run plan.",
    });
  }
  return delegateOpenClawAdd({ harness, claw, mode: "apply", planIntegrity, runtime, env });
}

async function delegateOpenClawAdd(params: {
  harness: string;
  claw: LocalClawPackage;
  mode: "preview" | "apply";
  planIntegrity?: string;
  runtime: AdapterRuntime;
  env: NodeJS.ProcessEnv;
}): Promise<HarnessPreview> {
  const { harness, claw, mode, planIntegrity, runtime, env } = params;
  if (harness !== "openclaw") {
    throw new CliError({
      code: "unknown_adapter",
      phase: "adapter",
      message: `Unknown agent harness adapter: ${harness}.`,
      path: harness,
    });
  }
  if (claw.summary.hasPortablePrompt) {
    throw new CliError({
      code: "openclaw_portable_prompt_unsupported",
      phase: "adapter",
      message:
        "This OpenClaw adapter cannot delegate a CLAW.md body until OpenClaw maps it to SOUL.md.",
      path: "CLAW.md",
    });
  }
  const invocation = await resolveOpenClawInvocation(env);
  let snapshotRoot: string;
  try {
    snapshotRoot = await materializeStableSnapshot(claw);
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError({
      code: "snapshot_materialization_failed",
      phase: "adapter",
      message: `Could not prepare the reviewed snapshot: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
  let result: ProcessResult;
  try {
    const operationArgs =
      mode === "preview" ? ["--dry-run"] : ["--yes", "--plan-integrity", planIntegrity ?? ""];
    result = await runtime.run(
      invocation.command,
      [...invocation.prefix, "claws", "add", snapshotRoot, ...operationArgs, "--json"],
      { ...env, OPENCLAW_EXPERIMENTAL_CLAWS: "1" },
      invocation.cwd,
      mode === "apply" ? ADAPTER_APPLY_TIMEOUT_MS : ADAPTER_PREVIEW_TIMEOUT_MS,
    );
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    throw new CliError({
      code: "adapter_launch_failed",
      phase: "adapter",
      message: `Could not launch OpenClaw: ${error instanceof Error ? error.message : String(error)}`,
      path: "openclaw",
    });
  }
  let outcome: unknown;
  try {
    outcome = JSON.parse(result.stdout);
  } catch {
    throw new CliError({
      code: "invalid_adapter_output",
      phase: "adapter",
      message: "OpenClaw did not return one valid JSON outcome.",
      path: "openclaw",
    });
  }
  if (result.exitCode !== 0) {
    throw new CliError(
      {
        code: mode === "preview" ? "adapter_preview_failed" : "adapter_apply_failed",
        phase: "adapter",
        message:
          mode === "preview"
            ? "OpenClaw rejected the dry-run preview."
            : "OpenClaw did not complete the consented apply.",
        path: "openclaw",
      },
      { harness: { id: "openclaw", outcome } },
    );
  }
  return { id: "openclaw", outcome };
}
