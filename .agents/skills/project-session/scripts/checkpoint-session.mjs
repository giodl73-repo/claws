#!/usr/bin/env node

import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const valueFlags = new Set([
  "area", "focus", "result", "next", "agent", "branch", "dirty", "blocker", "at",
]);

function usage() {
  return `Usage:
  node .agents/skills/project-session/scripts/checkpoint-session.mjs \\
    --area <project> --focus <text> --result <text> --next <text> [options]

Options:
  --agent <name>     Agent name (default: Codex)
  --branch <text>    Active branch or PR
  --dirty <text>     Known dirty state
  --blocker <text>   Blocking question
  --at <ISO time>    Stable timestamp for replay or testing
  --dry-run          Print the checkpoint without writing it
  --help             Show this help`;
}

function fail(message) {
  console.error(`checkpoint-session: ${message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--dry-run" || token === "--help") {
      args[token.slice(2)] = true;
      continue;
    }
    if (!token.startsWith("--") || !valueFlags.has(token.slice(2))) {
      throw new Error(`unknown argument: ${token}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`missing value for ${token}`);
    }
    args[token.slice(2)] = value.trim();
    index += 1;
  }
  return args;
}

function safeSlug(value, label) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) throw new Error(`${label} must contain a letter or number`);
  return slug;
}

function markdownValue(value) {
  return value ? value.replace(/\r?\n/g, " ").trim() : "None.";
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  fail(error.message);
  console.error(usage());
  process.exit();
}

if (args.help) {
  console.log(usage());
  process.exit();
}

for (const required of ["area", "focus", "result", "next"]) {
  if (!args[required]) fail(`--${required} is required`);
}
if (process.exitCode) {
  console.error(usage());
  process.exit();
}

const area = safeSlug(args.area, "area");
const projectDir = path.resolve(process.cwd(), "projects", area);
const sessionPath = path.join(projectDir, "SESSION.md");
if (!existsSync(sessionPath)) {
  fail(`project session does not exist: ${path.relative(process.cwd(), sessionPath)}`);
  process.exit();
}

const instant = args.at ? new Date(args.at) : new Date();
if (Number.isNaN(instant.valueOf())) {
  fail("--at must be a valid ISO timestamp");
  process.exit();
}

const iso = instant.toISOString();
const timestamp = iso.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const agent = markdownValue(args.agent || "Codex");
const agentSlug = safeSlug(args.agent || "codex", "agent");
const relativePath = path.join("projects", area, "sessions", `${timestamp}-${agentSlug}.md`);
const outputPath = path.resolve(process.cwd(), relativePath);
const content = `# Session Checkpoint: ${area}

- Recorded at: ${iso}
- Agent: ${agent}
- Focus: ${markdownValue(args.focus)}
- Result: ${markdownValue(args.result)}
- Next action: ${markdownValue(args.next)}
- Active branch / PR: ${markdownValue(args.branch)}
- Known dirty state: ${markdownValue(args.dirty)}
- Blocking question: ${markdownValue(args.blocker)}
`;

if (args["dry-run"]) {
  console.log(`# ${relativePath.replaceAll("\\", "/")}\n`);
  console.log(content);
  process.exit();
}

await mkdir(path.dirname(outputPath), { recursive: true });
try {
  await writeFile(outputPath, content, { encoding: "utf8", flag: "wx" });
} catch (error) {
  if (error.code === "EEXIST") {
    fail(`checkpoint already exists: ${relativePath}`);
    process.exit();
  }
  throw error;
}
console.log(relativePath.replaceAll("\\", "/"));
