#!/usr/bin/env bash
# Compute a deterministic cache key for claws governance compilation.
#
# The key is the SHA-256 of the concatenated hashes of:
#   1. claws.json (configuration)
#   2. The 9 OC governance files: SOUL.md, TOOLS.md, AGENTS.md,
#      IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md, skills/, lobster.yaml
#
# Non-governance files (README.md, etc.) are deliberately excluded so
# that changes to documentation do not invalidate the compilation cache.
#
# The skills/ directory is hashed by sorting all files within it and
# hashing each one, so adding/removing/editing a skill invalidates the cache.
#
# Usage:
#   cache-key.sh [workspace-root]
#
# Output:
#   Prints the hex SHA-256 cache key to stdout.

set -euo pipefail

WORKSPACE="${1:-.}"

# ── Governance sources ────────────────────────────────────────────────
# Must match claws-sdk/src/compile/types.ts DEFAULT_FILE_SOURCES + claws.json

GOVERNANCE_FILES=(
  "claws.json"
  "SOUL.md"
  "TOOLS.md"
  "AGENTS.md"
  "IDENTITY.md"
  "USER.md"
  "MEMORY.md"
  "HEARTBEAT.md"
  "lobster.yaml"
)

# ── Hash individual files ─────────────────────────────────────────────

hash_file() {
  local file="$1"
  if [[ -f "${file}" ]]; then
    sha256sum "${file}" | cut -d' ' -f1
  else
    # Absent files get a sentinel hash so the key is stable
    echo "absent:$(basename "${file}")" | sha256sum | cut -d' ' -f1
  fi
}

# ── Collect hashes ───────────────────────────────────────────────────

HASH_INPUT=""

# Hash each governance file
for gf in "${GOVERNANCE_FILES[@]}"; do
  HASH_INPUT+="$(hash_file "${WORKSPACE}/${gf}")"
done

# Hash skills/ directory contents (sorted for determinism)
SKILLS_DIR="${WORKSPACE}/skills"
if [[ -d "${SKILLS_DIR}" ]]; then
  # Find all files, sort, hash each
  while IFS= read -r -d '' skill_file; do
    HASH_INPUT+="$(hash_file "${skill_file}")"
  done < <(find "${SKILLS_DIR}" -type f -print0 | sort -z)
else
  HASH_INPUT+="$(echo "absent:skills/" | sha256sum | cut -d' ' -f1)"
fi

# ── Compute final key ────────────────────────────────────────────────

echo -n "${HASH_INPUT}" | sha256sum | cut -d' ' -f1
