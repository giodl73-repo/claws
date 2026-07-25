import { createHash } from "node:crypto";
import { lstat, readdir, readFile, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { validateClawPackageContents, type ClawPackageTextFile } from "clawhub-schema";
import { PrototypeDiagnosticsError, PrototypeError } from "./errors.js";
import type { ClawInspection, LocalPackageSource } from "./types.js";

const MAX_PACKAGE_JSON_BYTES = 256 * 1024;
const MAX_PACKAGE_BYTES = 50 * 1024 * 1024;
const MAX_PACKAGE_FILES = 4_096;

type LoadedFile = ClawPackageTextFile & { bytes: Buffer };

export type InspectedPackage = {
  source: LocalPackageSource;
  claw: ClawInspection;
};

function portablePath(path: string): string {
  return path.split(sep).join("/");
}

function isContained(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path === "" || (!path.startsWith(`..${sep}`) && path !== ".." && !isAbsolute(path));
}

function decodeUtf8(bytes: Buffer): string | undefined {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

async function loadFiles(root: string): Promise<LoadedFile[]> {
  const files: LoadedFile[] = [];
  let aggregateBytes = 0;

  async function visit(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = resolve(directory, entry.name);
      const entryPath = portablePath(relative(root, absolutePath));
      if (entry.isSymbolicLink()) {
        throw new PrototypeError(
          "linked_package_entry",
          "source",
          "Claw packages may contain only ordinary directories and regular files.",
          entryPath,
        );
      }
      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }
      if (!entry.isFile()) {
        throw new PrototypeError(
          "unsupported_package_entry",
          "source",
          "Claw packages may contain only ordinary directories and regular files.",
          entryPath,
        );
      }

      const fileStat = await lstat(absolutePath);
      if (!fileStat.isFile()) {
        throw new PrototypeError(
          "package_entry_changed",
          "source",
          "A package entry changed while it was being inspected.",
          entryPath,
        );
      }
      if (fileStat.nlink > 1) {
        throw new PrototypeError(
          "linked_package_entry",
          "source",
          "Hardlinked package files are not accepted.",
          entryPath,
        );
      }
      const canonicalPath = await realpath(absolutePath);
      if (!isContained(root, canonicalPath)) {
        throw new PrototypeError(
          "package_entry_escapes_root",
          "source",
          "A package entry resolves outside the package root.",
          entryPath,
        );
      }

      const bytes = await readFile(absolutePath);
      aggregateBytes += bytes.byteLength;
      if (aggregateBytes > MAX_PACKAGE_BYTES) {
        throw new PrototypeError(
          "package_too_large",
          "source",
          `The package exceeds the ${MAX_PACKAGE_BYTES}-byte private prototype limit.`,
        );
      }
      files.push({ path: entryPath, bytes, text: decodeUtf8(bytes) });
      if (files.length > MAX_PACKAGE_FILES) {
        throw new PrototypeError(
          "too_many_package_files",
          "source",
          `The package exceeds the ${MAX_PACKAGE_FILES}-file private prototype limit.`,
        );
      }
    }
  }

  await visit(root);
  return files;
}

function packageIntegrity(files: readonly LoadedFile[]): string {
  const hash = createHash("sha256");
  const sortedFiles = [...files].sort((left, right) =>
    Buffer.compare(Buffer.from(left.path, "utf8"), Buffer.from(right.path, "utf8")),
  );
  for (const file of sortedFiles) {
    const pathBytes = Buffer.from(file.path, "utf8");
    const size = Buffer.alloc(8);
    size.writeBigUInt64BE(BigInt(file.bytes.byteLength));
    hash.update(pathBytes);
    hash.update(Buffer.from([0]));
    hash.update(size);
    hash.update(file.bytes);
  }
  return `sha256:${hash.digest("hex")}`;
}

function readPackageIdentity(packageJson: unknown): { name: string; version: string } {
  if (!packageJson || typeof packageJson !== "object" || Array.isArray(packageJson)) {
    throw new PrototypeError("invalid_package_json", "package", "package.json must be an object.");
  }
  const value = packageJson as Record<string, unknown>;
  if (typeof value.name !== "string" || typeof value.version !== "string") {
    throw new PrototypeError(
      "invalid_package_identity",
      "package",
      "package.json must declare string name and version fields.",
    );
  }
  return { name: value.name, version: value.version };
}

export async function inspectLocalPackage(input: string): Promise<InspectedPackage> {
  if (input.includes("://") || input.startsWith("@")) {
    throw new PrototypeError(
      "unsupported_source",
      "source",
      "Private slice 1 accepts local package directories only.",
      input,
    );
  }

  const requestedRoot = resolve(input);
  let root: string;
  try {
    root = await realpath(requestedRoot);
  } catch {
    throw new PrototypeError(
      "source_not_found",
      "source",
      "The local package directory does not exist.",
      requestedRoot,
    );
  }
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) {
    throw new PrototypeError(
      "source_not_directory",
      "source",
      "Private slice 1 requires a local package directory.",
      root,
    );
  }

  const files = await loadFiles(root);
  const packageJsonFile = files.find((file) => file.path === "package.json");
  if (!packageJsonFile?.text) {
    throw new PrototypeError(
      "missing_package_json",
      "package",
      "The package root must contain UTF-8 package.json.",
      "package.json",
    );
  }
  if (packageJsonFile.bytes.byteLength > MAX_PACKAGE_JSON_BYTES) {
    throw new PrototypeError(
      "package_json_too_large",
      "package",
      `package.json exceeds ${MAX_PACKAGE_JSON_BYTES} bytes.`,
      "package.json",
    );
  }

  let packageJson: unknown;
  try {
    packageJson = JSON.parse(packageJsonFile.text);
  } catch {
    throw new PrototypeError(
      "invalid_package_json",
      "package",
      "package.json is not valid JSON.",
      "package.json",
    );
  }
  const identity = readPackageIdentity(packageJson);
  const validated = validateClawPackageContents({
    packageName: identity.name,
    version: identity.version,
    packageJson,
    files: files.map(({ path, text }) => ({ path, text })),
  });
  if (!validated.ok) {
    throw new PrototypeDiagnosticsError(
      "The Claw package does not conform to the current portable contract.",
      validated.issues.map((issue) => ({
        code: issue.code,
        phase: "package",
        path: issue.path,
        message: issue.message,
      })),
    );
  }

  const value = validated.value;
  const packageBytes = files.reduce((total, file) => total + file.bytes.byteLength, 0);
  return {
    source: {
      kind: "local-package",
      path: root,
      packageName: identity.name,
      packageVersion: identity.version,
      integrity: packageIntegrity(files),
      byteLength: packageBytes,
      fileCount: files.length,
    },
    claw: {
      manifestPath: value.manifestPath,
      schemaVersion: value.manifest.schemaVersion,
      agent: {
        id: value.manifest.agent.id,
        ...(value.manifest.agent.name ? { name: value.manifest.agent.name } : {}),
        ...(value.manifest.agent.description
          ? { description: value.manifest.agent.description }
          : {}),
      },
      summary: {
        bootstrapFiles: value.summary.workspace.bootstrapFiles,
        workspaceFileCount: value.summary.workspace.fileCount,
        skillCount: value.summary.packages.skillCount,
        pluginCount: value.summary.packages.pluginCount,
        mcpServerCount: value.summary.mcpServerCount,
        cronJobCount: value.summary.cronJobCount,
      },
      hasPortablePrompt: value.hasClawMarkdownBody,
      ...(value.manifest.metadata?.["openclaw.config"]
        ? { openClawProfilePath: value.manifest.metadata["openclaw.config"] }
        : {}),
    },
  };
}
