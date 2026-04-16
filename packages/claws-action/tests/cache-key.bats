#!/usr/bin/env bats
# L0 unit tests for cache key computation.
#
# Validates that the cache key includes governance files and excludes
# non-governance files like README.md.

SCRIPTS_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")/../scripts" && pwd)"

# ── Helpers ──────────────────────────────────────────────────────────

setup() {
  TEST_TMPDIR="$(mktemp -d)"
  WORKSPACE="${TEST_TMPDIR}/workspace"
  mkdir -p "${WORKSPACE}"

  # Create a minimal governance workspace
  echo '{"version":"1.0.0"}' > "${WORKSPACE}/claws.json"
  echo "# Soul" > "${WORKSPACE}/SOUL.md"
  echo "# Tools" > "${WORKSPACE}/TOOLS.md"
}

teardown() {
  rm -rf "${TEST_TMPDIR}"
}

# ── L0: Cache key includes governance files ──────────────────────────

@test "cache key changes when governance file changes" {
  # Compute initial key
  local key1
  key1=$(bash "${SCRIPTS_DIR}/cache-key.sh" "${WORKSPACE}")
  [ -n "${key1}" ]

  # Modify a governance file (SOUL.md)
  echo "# Soul\n\nYou are a different assistant." > "${WORKSPACE}/SOUL.md"

  # Compute new key
  local key2
  key2=$(bash "${SCRIPTS_DIR}/cache-key.sh" "${WORKSPACE}")
  [ -n "${key2}" ]

  # Keys must differ
  [ "${key1}" != "${key2}" ]
}

# ── L0: README change doesn't affect cache key ──────────────────────

@test "README change does not affect cache key" {
  # Create README (non-governance file)
  echo "# Project README" > "${WORKSPACE}/README.md"

  # Compute key with README
  local key1
  key1=$(bash "${SCRIPTS_DIR}/cache-key.sh" "${WORKSPACE}")
  [ -n "${key1}" ]

  # Modify README
  echo "# Updated README\n\nNew content here." > "${WORKSPACE}/README.md"

  # Compute key after README change
  local key2
  key2=$(bash "${SCRIPTS_DIR}/cache-key.sh" "${WORKSPACE}")
  [ -n "${key2}" ]

  # Keys must be identical (README is not a governance file)
  [ "${key1}" = "${key2}" ]
}
