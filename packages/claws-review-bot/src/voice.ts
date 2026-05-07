import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VOICE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "voice");

const REVIEWER_FILES = [
  "voice.md",
  "watches.md",
  "specs.md",
  "code.md",
  "drift.md",
  "grammar.md",
];

const PREFLIGHT_FILES = [...REVIEWER_FILES, "modes/preflight.md"];

const REPLY_FILES = [...REVIEWER_FILES, "modes/reply.md"];

export type Mode = "reviewer" | "preflight" | "reply";

export function loadVoice(mode: Mode): string {
  const files =
    mode === "reviewer"
      ? REVIEWER_FILES
      : mode === "preflight"
      ? PREFLIGHT_FILES
      : REPLY_FILES;

  return files
    .map((f) => readFileSync(join(VOICE_DIR, f), "utf8"))
    .join("\n\n---\n\n");
}

export function voiceDir(): string {
  return VOICE_DIR;
}
