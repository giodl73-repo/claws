#!/usr/bin/env bats
# L0 unit tests for severity gating in claws-action.
#
# Tests warn-only mode, fail-on severity thresholds, and the interaction
# between SARIF severity levels and exit codes.

FIXTURES_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")/fixtures" && pwd)"
SCRIPTS_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")/../scripts" && pwd)"

# ── Helpers ──────────────────────────────────────────────────────────

setup() {
  TEST_TMPDIR="$(mktemp -d)"
  export PATH="${TEST_TMPDIR}/bin:${PATH}"
  mkdir -p "${TEST_TMPDIR}/bin"
  export GITHUB_WORKSPACE="${TEST_TMPDIR}"
  export GITHUB_OUTPUT="${TEST_TMPDIR}/github_output"
  touch "${GITHUB_OUTPUT}"
  # Defaults for all tests
  export INPUT_STAGE="1"
  export INPUT_FORMAT="sarif"
  export INPUT_CACHE="true"
  export INPUT_WARN_ONLY="false"
  export INPUT_FAIL_ON="all"
  export GITHUB_REPOSITORY="test-org/test-repo"
  export GITHUB_SHA="abc123"
  export GITHUB_REF="refs/pull/1/merge"
}

teardown() {
  rm -rf "${TEST_TMPDIR}"
}

# Create a mock claws that outputs a specific SARIF fixture and exits 1
mock_claws_fixture() {
  local fixture_file="$1"
  cat > "${TEST_TMPDIR}/bin/claws" <<MOCK
#!/usr/bin/env bash
cat "${fixture_file}"
exit 1
MOCK
  chmod +x "${TEST_TMPDIR}/bin/claws"
}

# Mock gh so SARIF upload does not fail
mock_gh() {
  cat > "${TEST_TMPDIR}/bin/gh" <<'MOCK'
#!/usr/bin/env bash
echo "$@" >> "${TEST_TMPDIR}/gh_calls.log"
exit 0
MOCK
  chmod +x "${TEST_TMPDIR}/bin/gh"
}

# Mock python for SARIF parsing
mock_python() {
  # Use the real python — no mock needed; the SARIF parsing is inline
  true
}

# ── L0: warn-only exits 0 with violations ────────────────────────────

@test "warn-only: true exits 0 even with critical+high+medium violations" {
  mock_claws_fixture "${FIXTURES_DIR}/sample.sarif"
  mock_gh

  export INPUT_WARN_ONLY="true"

  run bash "${SCRIPTS_DIR}/run.sh"

  [ "$status" -eq 0 ]
  # Should emit warning annotations
  [[ "$output" == *"warn-only mode"* ]]
  [[ "$output" == *"governance violation"* ]]
}

# ── L0: fail-on: critical blocks on critical-level violations ────────

@test "fail-on: critical blocks when error-level (critical) violations exist" {
  mock_claws_fixture "${FIXTURES_DIR}/critical-only.sarif"
  mock_gh

  export INPUT_FAIL_ON="critical"

  run bash "${SCRIPTS_DIR}/run.sh"

  [ "$status" -eq 1 ]
}

# ── L0: fail-on: high passes on medium-only violations ──────────────

@test "fail-on: high passes when only medium-severity (warning-level) violations exist" {
  mock_claws_fixture "${FIXTURES_DIR}/medium-only.sarif"
  mock_gh

  export INPUT_FAIL_ON="high"

  run bash "${SCRIPTS_DIR}/run.sh"

  [ "$status" -eq 0 ]
  [[ "$output" == *"below threshold"* ]]
}
