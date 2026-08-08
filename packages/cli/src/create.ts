import { lstat, mkdir, open, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import {
  isCanonicalClawHubPackageName,
  isExactSemVer,
  isSafeClawRelativePath,
} from "@claws/reference-private";
import { parseDocument, stringify } from "yaml";
import { CliError } from "./errors.js";
import { parseExactClawHubCoordinate } from "./remote-source.js";
import { inspectLocalPackage } from "./source.js";
import type { LocalClawPackage } from "./types.js";

const MAX_PROMPT_BYTES = 1024 * 1024;
const MAX_SKILL_FILE_BYTES = 2 * 1024 * 1024;
const MAX_SKILL_BYTES = 10 * 1024 * 1024;
const MAX_SKILL_FILES = 256;

export type CreateClawOptions = {
  output: string;
  agentId: string;
  name: string;
  description: string;
  soulPath: string;
  agentsPath?: string;
  bootstrapPath?: string;
  packageName?: string;
  version?: string;
  skills?: string[];
  plugins?: string[];
};

type VendoredSkill = {
  name: string;
  files: Array<{ path: string; bytes: Buffer }>;
};

function fail(code: string, message: string, path?: string): never {
  throw new CliError({ code, phase: "arguments", message, ...(path ? { path } : {}) });
}

async function readBoundedText(path: string, maxBytes: number, label: string): Promise<string> {
  const bytes = await readBoundedFile(path, maxBytes, "invalid_create_input", label);
  if (bytes.byteLength === 0) {
    fail(
      "invalid_create_input",
      `${label} must be a non-empty file no larger than ${maxBytes} bytes.`,
      path,
    );
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    fail("invalid_create_input", `${label} must be valid UTF-8.`, path);
  }
}

async function readBoundedFile(
  path: string,
  maxBytes: number,
  code: string,
  label: string,
): Promise<Buffer> {
  const handle = await open(path, "r").catch(() => undefined);
  if (!handle) {
    fail(code, `${label} must be an existing regular file.`, path);
  }
  try {
    const bytes = Buffer.allocUnsafe(maxBytes + 1);
    let length = 0;
    while (length < bytes.byteLength) {
      const result = await handle.read(bytes, length, bytes.byteLength - length, length);
      if (result.bytesRead === 0) {
        break;
      }
      length += result.bytesRead;
    }
    if (length > maxBytes) {
      fail(code, `${label} must be no larger than ${maxBytes} bytes.`, path);
    }
    return bytes.subarray(0, length);
  } finally {
    await handle.close();
  }
}

function skillName(skillMarkdown: string, path: string): string {
  const match = skillMarkdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    fail("invalid_skill", "A vendored skill must start with SKILL.md YAML frontmatter.", path);
  }
  const document = parseDocument(match[1] ?? "", { prettyErrors: false, uniqueKeys: true });
  if (document.errors.length > 0) {
    fail("invalid_skill", `SKILL.md frontmatter is invalid: ${document.errors[0]!.message}`, path);
  }
  const value = document.toJSON();
  const name =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>).name
      : undefined;
  if (typeof name !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(name)) {
    fail("invalid_skill", "SKILL.md must declare a portable lowercase name.", path);
  }
  return name;
}

async function walkSkill(
  root: string,
  current = root,
  state: { files: Array<{ path: string; bytes: Buffer }>; totalBytes: number } = {
    files: [],
    totalBytes: 0,
  },
): Promise<Array<{ path: string; bytes: Buffer }>> {
  for (const entry of await readdir(current, { withFileTypes: true })) {
    const absolute = join(current, entry.name);
    if (entry.isSymbolicLink()) {
      fail("unsafe_skill", "Vendored skills may not contain symbolic links.", absolute);
    }
    if (entry.isDirectory()) {
      await walkSkill(root, absolute, state);
      continue;
    }
    if (!entry.isFile()) {
      fail(
        "unsafe_skill",
        "Vendored skills may contain only regular files and directories.",
        absolute,
      );
    }
    const info = await lstat(absolute);
    if (
      info.nlink !== 1 ||
      info.size > MAX_SKILL_FILE_BYTES ||
      state.files.length >= MAX_SKILL_FILES ||
      state.totalBytes + info.size > MAX_SKILL_BYTES
    ) {
      fail(
        "unsafe_skill",
        `Vendored skills may contain at most ${MAX_SKILL_FILES} single-link files, ${MAX_SKILL_BYTES} bytes total, and ${MAX_SKILL_FILE_BYTES} bytes per file.`,
        absolute,
      );
    }
    const portablePath = relative(root, absolute).replaceAll("\\", "/");
    if (!isSafeClawRelativePath(portablePath)) {
      fail("unsafe_skill", "Vendored skill paths must be portable and relative.", portablePath);
    }
    const bytes = await readBoundedFile(
      absolute,
      Math.min(MAX_SKILL_FILE_BYTES, MAX_SKILL_BYTES - state.totalBytes),
      "unsafe_skill",
      "Vendored skill file",
    );
    state.totalBytes += bytes.byteLength;
    state.files.push({ path: portablePath, bytes });
  }
  return state.files;
}

async function loadVendoredSkill(input: string): Promise<VendoredSkill> {
  const requested = resolve(input);
  const sourceRoot = await realpath(requested).catch(() => undefined);
  if (!sourceRoot || !(await stat(sourceRoot)).isDirectory()) {
    fail("invalid_skill", "A local skill source must be an existing directory.", requested);
  }
  const files = (await walkSkill(sourceRoot)).toSorted((left, right) =>
    Buffer.compare(Buffer.from(left.path, "utf8"), Buffer.from(right.path, "utf8")),
  );
  if (files.length === 0) {
    fail(
      "unsafe_skill",
      `A vendored skill may contain at most ${MAX_SKILL_FILES} files and ${MAX_SKILL_BYTES} bytes.`,
      requested,
    );
  }
  const skillFile = files.find((file) => file.path === "SKILL.md");
  if (!skillFile) {
    fail("invalid_skill", "A vendored skill must contain SKILL.md at its root.", requested);
  }
  let markdown: string;
  try {
    markdown = new TextDecoder("utf-8", { fatal: true }).decode(skillFile.bytes);
  } catch {
    fail("invalid_skill", "SKILL.md must be valid UTF-8.", join(requested, "SKILL.md"));
  }
  return { name: skillName(markdown, join(requested, "SKILL.md")), files };
}

function packageDependency(kind: "skill" | "plugin", coordinate: string) {
  const parsed = parseExactClawHubCoordinate(coordinate);
  if (!parsed) {
    fail(
      "invalid_component_source",
      `${kind} package dependencies must use clawhub:<package>@<exact-semver>.`,
      coordinate,
    );
  }
  return { kind, source: "clawhub" as const, ref: parsed.packageName, version: parsed.version };
}

function extensionId(ref: string): string {
  const packageName = ref.split("/").at(-1) ?? "plugin";
  const normalized = packageName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const prefixed = /^[a-z]/.test(normalized) ? normalized : `plugin-${normalized || "extension"}`;
  return prefixed.slice(0, 64);
}

async function writeRelative(root: string, path: string, bytes: string | Buffer): Promise<void> {
  if (!isSafeClawRelativePath(path)) {
    fail("unsafe_create_output", "Generated package paths must remain package-relative.", path);
  }
  const target = join(root, ...path.split("/"));
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx" });
}

export async function createClawPackage(options: CreateClawOptions): Promise<LocalClawPackage> {
  if (!/^[a-z][a-z0-9-]{0,63}$/.test(options.agentId)) {
    fail(
      "invalid_agent_id",
      "Agent ids must use lowercase letters, digits, and hyphens.",
      options.agentId,
    );
  }
  const packageName = options.packageName ?? `@local/${options.agentId}`;
  const version = options.version ?? "0.1.0";
  if (!isCanonicalClawHubPackageName(packageName) || !isExactSemVer(version)) {
    fail("invalid_package_identity", "Package name and version must be canonical and exact.");
  }
  if (!options.name.trim() || !options.description.trim()) {
    fail("invalid_agent_identity", "Agent name and description must be non-empty.");
  }

  const output = resolve(options.output);
  const soul = (
    await readBoundedText(resolve(options.soulPath), MAX_PROMPT_BYTES, "SOUL input")
  ).trim();
  if (!soul) {
    fail(
      "invalid_create_input",
      "SOUL input must contain non-whitespace persona content.",
      options.soulPath,
    );
  }
  const agents = options.agentsPath
    ? await readBoundedText(resolve(options.agentsPath), MAX_PROMPT_BYTES, "AGENTS input")
    : undefined;
  const bootstrap = options.bootstrapPath
    ? await readBoundedText(resolve(options.bootstrapPath), 2 * 1024 * 1024, "BOOTSTRAP input")
    : undefined;

  const vendoredSkills: VendoredSkill[] = [];
  const packages = [];
  const extensions = [];
  for (const source of options.skills ?? []) {
    if (source.startsWith("clawhub:")) {
      packages.push(packageDependency("skill", source));
    } else {
      vendoredSkills.push(await loadVendoredSkill(source));
    }
  }
  for (const source of options.plugins ?? []) {
    const plugin = packageDependency("plugin", source);
    extensions.push({
      id: extensionId(plugin.ref),
      kind: "plugin" as const,
      format: "openclaw" as const,
      source: plugin.source,
      ref: plugin.ref,
      version: plugin.version,
    });
  }
  const extensionIds = new Set<string>();
  for (const extension of extensions) {
    if (extensionIds.has(extension.id)) {
      fail("duplicate_extension", `More than one plugin maps to extension id ${extension.id}.`);
    }
    extensionIds.add(extension.id);
  }
  const names = new Set<string>();
  for (const skill of vendoredSkills) {
    if (names.has(skill.name)) {
      fail("duplicate_skill", `More than one vendored skill is named ${skill.name}.`);
    }
    names.add(skill.name);
  }

  const workspaceFiles = vendoredSkills.flatMap((skill) =>
    skill.files.map((file) => ({
      source: `components/skills/${skill.name}/${file.path}`,
      path: `skills/${skill.name}/${file.path}`,
    })),
  );
  const manifest = {
    schemaVersion: 1,
    agent: {
      id: options.agentId,
      name: options.name.trim(),
      description: options.description.trim(),
    },
    workspace: {
      bootstrapFiles: agents ? { "AGENTS.md": { source: "workspace/AGENTS.md" } } : {},
      files: workspaceFiles,
    },
    packages,
    mcpServers: {},
    cronJobs: [],
  };
  const packageJson = {
    name: packageName,
    version,
    private: true,
    type: "module",
    openclaw: { claw: "CLAW.md" },
  };

  await mkdir(dirname(output), { recursive: true });
  try {
    await mkdir(output);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      fail("create_destination_exists", "The Claw output directory already exists.", output);
    }
    throw error;
  }
  let completed = false;
  try {
    await writeRelative(output, "package.json", `${JSON.stringify(packageJson, null, 2)}\n`);
    await writeRelative(
      output,
      "CLAW.md",
      `---\n${stringify(manifest).trimEnd()}\n---\n\n${soul}\n`,
    );
    if (agents) {
      await writeRelative(output, "workspace/AGENTS.md", agents);
    }
    if (bootstrap) {
      await writeRelative(output, "BOOTSTRAP.md", bootstrap);
    }
    if (extensions.length > 0) {
      await writeRelative(
        output,
        "profiles/openclaw.yml",
        stringify({ schemaVersion: 1, agent: {}, extensions }),
      );
    }
    for (const skill of vendoredSkills) {
      for (const file of skill.files) {
        await writeRelative(output, `components/skills/${skill.name}/${file.path}`, file.bytes);
      }
    }
    const inspected = await inspectLocalPackage(output);
    completed = true;
    return inspected;
  } finally {
    if (!completed) {
      await rm(output, { recursive: true, force: true });
    }
  }
}
