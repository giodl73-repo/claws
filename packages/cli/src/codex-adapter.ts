import { createHash } from "node:crypto";
import { lstat, mkdir, realpath, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { conflictsWithClawPath, portableClawPathKey } from "@claws/reference-private";
import { CliError } from "./errors.js";
import type { LocalClawPackage } from "./types.js";

const CODEX_PLAN_SCHEMA_VERSION = "claw.codexWorkspacePlan.v0" as const;
const CODEX_RESULT_SCHEMA_VERSION = "claw.codexWorkspaceResult.v0" as const;
const BOOTSTRAP_ORDER = [
  "SOUL.md",
  "IDENTITY.md",
  "AGENTS.md",
  "TOOLS.md",
  "HEARTBEAT.md",
] as const;

type CodexAction = {
  action: "write";
  path: string;
  byteLength: number;
  digest: string;
};

type CodexBlocker = {
  code: string;
  path: string;
  message: string;
};

export type CodexWorkspacePlan = {
  schemaVersion: typeof CODEX_PLAN_SCHEMA_VERSION;
  dryRun: true;
  mutationAllowed: false;
  target: string;
  ready: boolean;
  actions: CodexAction[];
  blockers: CodexBlocker[];
  ignoredProfiles: string[];
  planIntegrity: string;
};

export type CodexWorkspaceResult = {
  schemaVersion: typeof CODEX_RESULT_SCHEMA_VERSION;
  status: "complete";
  target: string;
  filesWritten: number;
  planIntegrity: string;
};

type MaterializedFile = { path: string; bytes: Buffer };

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function normalizePortablePath(value: string): string {
  return value.replaceAll("\\", "/").normalize("NFC");
}

function digest(bytes: Buffer): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .toSorted(([left], [right]) => compareText(left, right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function planDigest(plan: Omit<CodexWorkspacePlan, "planIntegrity">): string {
  return digest(Buffer.from(JSON.stringify(stableValue(plan))));
}

function fail(code: string, message: string, path?: string): never {
  throw new CliError({ code, phase: "adapter", message, ...(path ? { path } : {}) });
}

function payloadByPath(claw: LocalClawPackage): Map<string, Buffer> {
  return new Map(claw.payload.map((file) => [portableClawPathKey(file.path), file.bytes]));
}

function requireUtf8(bytes: Buffer, sourcePath: string): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim();
  } catch {
    return fail(
      "codex_instruction_not_utf8",
      "Codex instruction sources must contain valid UTF-8 text.",
      sourcePath,
    );
  }
}

function composeCodexInstructions(claw: LocalClawPackage, payload: Map<string, Buffer>): Buffer {
  const sections: string[] = [];
  if (claw.portablePrompt) {
    sections.push(claw.portablePrompt.trim());
  }
  for (const name of BOOTSTRAP_ORDER) {
    const declaration = claw.manifest.workspace.bootstrapFiles[name];
    if (!declaration || (name === "SOUL.md" && claw.portablePrompt)) {
      continue;
    }
    const bytes = payload.get(portableClawPathKey(declaration.source));
    if (!bytes) {
      return fail(
        "codex_instruction_source_missing",
        "A declared Codex instruction source is missing from the inspected package.",
        declaration.source,
      );
    }
    const text = requireUtf8(bytes, declaration.source);
    if (!text) {
      return fail(
        "codex_instruction_empty",
        "Codex instruction sources must not be empty.",
        declaration.source,
      );
    }
    if (name === "SOUL.md" && sections.length === 0) {
      sections.push(text);
      continue;
    }
    const heading =
      name === "AGENTS.md"
        ? "Operating Instructions"
        : name === "IDENTITY.md"
          ? "Identity"
          : name === "TOOLS.md"
            ? "Tool Guidance"
            : name === "HEARTBEAT.md"
              ? "Recurring Work"
              : "Persona";
    sections.push(`## ${heading}\n\n${text}`);
  }
  if (sections.length === 0) {
    const name = claw.manifest.agent.name ?? claw.manifest.agent.id;
    const description = claw.manifest.agent.description ?? `Work as the ${name} Claw.`;
    sections.push(`# ${name}\n\n${description}`);
  }
  return Buffer.from(`${sections.join("\n\n")}\n`);
}

async function resolveNewTarget(target: string): Promise<{ target: string }> {
  if (!target.trim()) {
    return fail("codex_target_required", "The Codex adapter requires --target <new-directory>.");
  }
  const requested = resolve(target);
  const parent = dirname(requested);
  const parentInfo = await lstat(parent).catch(() => undefined);
  if (!parentInfo?.isDirectory() || parentInfo.isSymbolicLink()) {
    return fail(
      "codex_target_parent_unsafe",
      "The Codex target parent must be an existing real directory.",
      parent,
    );
  }
  const canonicalParent = await realpath(parent);
  const canonicalTarget = join(canonicalParent, basename(requested));
  const existing = await lstat(canonicalTarget).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  });
  if (existing) {
    return fail(
      "codex_target_exists",
      "The Codex adapter only creates a new workspace and never overlays an existing directory.",
      canonicalTarget,
    );
  }
  return { target: canonicalTarget };
}

async function buildCodexWorkspacePlan(
  claw: LocalClawPackage,
  target: string,
): Promise<{
  files: MaterializedFile[];
  plan: CodexWorkspacePlan;
}> {
  const resolvedTarget = await resolveNewTarget(target);
  const payload = payloadByPath(claw);
  const blockers: CodexBlocker[] = [];
  const ignoredProfiles = claw.summary.profilePaths
    .filter((profile) => profile !== "profiles/codex.yml")
    .toSorted();
  if (claw.summary.profilePaths.includes("profiles/codex.yml")) {
    blockers.push({
      code: "codex_profile_unsupported",
      path: "profiles/codex.yml",
      message: "This incubator has not defined a Codex-native profile contract yet.",
    });
  }
  if (claw.summary.hasPackageBootstrap) {
    blockers.push({
      code: "codex_package_bootstrap_unsupported",
      path: "BOOTSTRAP.md",
      message: "Codex has no seed-once package bootstrap lifecycle in this adapter.",
    });
  }
  for (const entry of claw.manifest.packages) {
    blockers.push({
      code: "codex_package_dependency_unsupported",
      path: `packages.${entry.kind}:${entry.ref}@${entry.version}`,
      message: "This Codex adapter does not install referenced ClawHub packages.",
    });
  }
  for (const name of Object.keys(claw.manifest.mcpServers).toSorted()) {
    blockers.push({
      code: "codex_mcp_unsupported",
      path: `mcpServers.${name}`,
      message: "This Codex adapter does not mutate Codex MCP configuration.",
    });
  }
  for (const job of claw.manifest.cronJobs) {
    blockers.push({
      code: "codex_cron_unsupported",
      path: `cronJobs.${job.id}`,
      message: "Codex has no scheduled-work lifecycle in this adapter.",
    });
  }

  const files: MaterializedFile[] = [
    { path: "AGENTS.md", bytes: composeCodexInstructions(claw, payload) },
  ];
  const generatedTargets = new Set([portableClawPathKey("AGENTS.md")]);
  for (const declaration of claw.manifest.workspace.files) {
    if (conflictsWithClawPath(generatedTargets, portableClawPathKey(declaration.path))) {
      blockers.push({
        code: "codex_agents_target_conflict",
        path: declaration.path,
        message: "A portable workspace path cannot conflict with the generated Codex AGENTS.md.",
      });
      continue;
    }
    const bytes = payload.get(portableClawPathKey(declaration.source));
    if (!bytes) {
      return fail(
        "codex_workspace_source_missing",
        "A declared workspace source is missing from the inspected package.",
        declaration.source,
      );
    }
    files.push({ path: normalizePortablePath(declaration.path), bytes });
  }
  files.sort((left, right) => compareText(left.path, right.path));
  blockers.sort((left, right) =>
    compareText(`${left.code}:${left.path}`, `${right.code}:${right.path}`),
  );
  const actions = files.map((file) => ({
    action: "write" as const,
    path: file.path,
    byteLength: file.bytes.byteLength,
    digest: digest(file.bytes),
  }));
  const unsigned: Omit<CodexWorkspacePlan, "planIntegrity"> = {
    schemaVersion: CODEX_PLAN_SCHEMA_VERSION,
    dryRun: true,
    mutationAllowed: false,
    target: resolvedTarget.target,
    ready: blockers.length === 0,
    actions,
    blockers,
    ignoredProfiles,
  };
  return {
    files,
    plan: { ...unsigned, planIntegrity: planDigest(unsigned) },
  };
}

export async function previewCodexWorkspace(
  claw: LocalClawPackage,
  target: string,
): Promise<CodexWorkspacePlan> {
  return (await buildCodexWorkspacePlan(claw, target)).plan;
}

export async function applyCodexWorkspace(
  claw: LocalClawPackage,
  target: string,
  consentPlanIntegrity: string,
): Promise<CodexWorkspaceResult> {
  const { files, plan } = await buildCodexWorkspacePlan(claw, target);
  if (plan.planIntegrity !== consentPlanIntegrity) {
    return fail(
      "codex_plan_changed",
      "The Codex workspace plan changed; preview it again before applying.",
      plan.target,
    );
  }
  if (!plan.ready) {
    return fail(
      "codex_plan_blocked",
      "The Codex workspace plan contains unsupported required capabilities.",
      plan.target,
    );
  }
  try {
    await mkdir(plan.target, { recursive: false, mode: 0o700 });
    for (const file of files) {
      const destination = resolve(plan.target, ...file.path.split("/"));
      await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
      await writeFile(destination, file.bytes, { flag: "wx", mode: 0o600 });
    }
  } catch (error) {
    if (error instanceof CliError) {
      throw error;
    }
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return fail(
        "codex_target_exists",
        "The Codex target appeared after preview; no existing files were overwritten.",
        plan.target,
      );
    }
    return fail(
      "codex_apply_failed",
      `Could not finish the Codex workspace; inspect the newly reserved target before retrying: ${error instanceof Error ? error.message : String(error)}`,
      plan.target,
    );
  }
  return {
    schemaVersion: CODEX_RESULT_SCHEMA_VERSION,
    status: "complete",
    target: plan.target,
    filesWritten: files.length,
    planIntegrity: plan.planIntegrity,
  };
}
