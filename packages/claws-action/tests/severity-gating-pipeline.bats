#!/usr/bin/env bats
# L1 integration tests for severity gating pipeline progression.
#
# Tests the gradual adoption ramp (warn-only -> fail-on: critical -> all)
# and Stage 2 CD gate with --sign flag.

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
  export INPUT_FORMAT="sarif"
  export INPUT_CACHE="true"
  export GITHUB_REPOSITORY="test-org/test-repo"
  export GITHUB_SHA="abc123def456"
  export GITHUB_REF="refs/pull/42/merge"
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

# Create a mock claws that records args and outputs SARIF
mock_claws_recording() {
  local fixture_file="$1"
  cat > "${TEST_TMPDIR}/bin/claws" <<MOCK
#!/usr/bin/env bash
echo "\$@" >> "${TEST_TMPDIR}/claws_args.log"
cat "${fixture_file}"
exit 1
MOCK
  chmod +x "${TEST_TMPDIR}/bin/claws"
}

mock_gh() {
  cat > "${TEST_TMPDIR}/bin/gh" <<'MOCK'
#!/usr/bin/env bash
echo "$@" >> "${TEST_TMPDIR}/gh_calls.log"
exit 0
MOCK
  chmod +x "${TEST_TMPDIR}/bin/gh"
}

# ── L1: Gradual adoption progression ────────────────────────────────
# Simulates the 8-week ramp: warn-only → fail-on:critical → fail-on:all
# using the sample.sarif fixture (has error + warning + note results).

@test "Gradual progression: warn-only passes, fail-on:critical blocks, fail-on:all blocks" {
  mock_claws_fixture "${FIXTURES_DIR}/sample.sarif"
  mock_gh

  export INPUT_STAGE="1"

  # ── Phase 1: warn-only (Week 1) ──
  export INPUT_WARN_ONLY="true"
  export INPUT_FAIL_ON="all"
  : > "${GITHUB_OUTPUT}"
  rm -f "${TEST_TMPDIR}/claws-results.sarif"

  run bash "${SCRIPTS_DIR}/run.sh"

  [ "$status" -eq 0 ]
  [[ "$output" == *"warn-only mode"* ]]

  # ── Phase 2: fail-on:critical (Week 2) ──
  export INPUT_WARN_ONLY="false"
  export INPUT_FAIL_ON="critical"
  : > "${GITHUB_OUTPUT}"
  rm -f "${TEST_TMPDIR}/claws-results.sarif"

  run bash "${SCRIPTS_DIR}/run.sh"

  # sample.sarif has error-level results => critical, should block
  [ "$status" -eq 1 ]

  # ── Phase 3: fail-on:all (Week 8) ──
  export INPUT_FAIL_ON="all"
  : > "${GITHUB_OUTPUT}"
  rm -f "${TEST_TMPDIR}/claws-results.sarif"

  run bash "${SCRIPTS_DIR}/run.sh"

  [ "$status" -eq 1 ]
}

# ── L1: Stage 2 CD gate with --sign ─────────────────────────────────

@test "Stage 2 CD gate passes --sign flag to claws and respects severity threshold" {
  mock_claws_recording "${FIXTURES_DIR}/medium-only.sarif"
  mock_gh

  export INPUT_STAGE="2"
  export INPUT_SIGN="true"
  export INPUT_WARN_ONLY="false"
  export INPUT_FAIL_ON="critical"

  run bash "${SCRIPTS_DIR}/run.sh"

  # medium-only violations with fail-on:critical => should pass
  [ "$status" -eq 0 ]
  [[ "$output" == *"below threshold"* ]]

  # Verify --sign was passed to claws
  [ -f "${TEST_TMPDIR}/claws_args.log" ]
  grep -q "\-\-sign" "${TEST_TMPDIR}/claws_args.log"

  # Verify artifact signing message
  [[ "$output" == *"artifact signing enabled"* ]]
}
