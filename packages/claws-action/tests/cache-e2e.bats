#!/usr/bin/env bats
# L2 e2e test: full action with cache on fixture workspace.
#
# Validates that the cache key is computed correctly for the fixture
# workspace and that the full flow (cache key -> run -> outputs) works
# end-to-end without errors.

SCRIPTS_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")/../scripts" && pwd)"
FIXTURES_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")/fixtures" && pwd)"

# ── Helpers ──────────────────────────────────────────────────────────

setup() {
  TEST_TMPDIR="$(mktemp -d)"
  export PATH="${TEST_TMPDIR}/bin:${PATH}"
  mkdir -p "${TEST_TMPDIR}/bin"
  export GITHUB_WORKSPACE="${TEST_TMPDIR}"
  export GITHUB_OUTPUT="${TEST_TMPDIR}/github_output"
  touch "${GITHUB_OUTPUT}"
}

teardown() {
  rm -rf "${TEST_TMPDIR}"
}

# Mock claws that outputs SARIF from fixture
mock_claws_fixture() {
  cat > "${TEST_TMPDIR}/bin/claws" <<MOCK
#!/usr/bin/env bash
cat "${FIXTURES_DIR}/sample.sarif"
exit 1
MOCK
  chmod +x "${TEST_TMPDIR}/bin/claws"
}

# Mock gh that records calls
mock_gh() {
  cat > "${TEST_TMPDIR}/bin/gh" <<'MOCK'
#!/usr/bin/env bash
echo "$@" >> "${TEST_TMPDIR}/gh_calls.log"
exit 0
MOCK
  chmod +x "${TEST_TMPDIR}/bin/gh"
}

# ── L2: Full action with cache on fixture workspace ──────────────────

@test "full action flow: cache key computation + run + SARIF output on fixture workspace" {
  mock_claws_fixture
  mock_gh

  # ── Step 1: Compute cache key for fixture workspace ──
  local cache_key
  cache_key=$(bash "${SCRIPTS_DIR}/cache-key.sh" "${FIXTURES_DIR}")
  [ -n "${cache_key}" ]
  # Key should be a 64-char hex SHA-256
  [[ "${cache_key}" =~ ^[0-9a-f]{64}$ ]]

  # ── Step 2: Verify key is deterministic ──
  local cache_key2
  cache_key2=$(bash "${SCRIPTS_DIR}/cache-key.sh" "${FIXTURES_DIR}")
  [ "${cache_key}" = "${cache_key2}" ]

  # ── Step 3: Run the action with cache hit (simulated) ──
  export INPUT_STAGE="1"
  export INPUT_FORMAT="sarif"
  export INPUT_FAIL_ON="none"
  export INPUT_WARN_ONLY="false"
  export INPUT_CACHE="true"
  export CLAWS_CACHE_HIT="true"
  export GITHUB_REPOSITORY="test-org/test-repo"
  export GITHUB_SHA="abc123"
  export GITHUB_REF="refs/heads/main"

  run bash "${SCRIPTS_DIR}/run.sh"

  # fail-on=none means exit 0 even with violations
  [ "$status" -eq 0 ]

  # SARIF file was created
  [ -f "${TEST_TMPDIR}/claws-results.sarif" ]

  # Outputs were written
  grep -q "sarif-file=" "${GITHUB_OUTPUT}"
  grep -q "violation-count=3" "${GITHUB_OUTPUT}"
  grep -q "cache-hit=true" "${GITHUB_OUTPUT}"

  # Cache hit message was printed
  [[ "$output" == *"Cache hit"* ]]

  # SARIF upload was called (stage 1)
  [ -f "${TEST_TMPDIR}/gh_calls.log" ]
  grep -q "code-scanning/sarifs" "${TEST_TMPDIR}/gh_calls.log"
}
