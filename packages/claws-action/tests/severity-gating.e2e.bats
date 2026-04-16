#!/usr/bin/env bats
# L2 e2e test for severity gating on a fixture workspace.
#
# Runs the full action entry script (run.sh) with warn-only mode on the
# fixture workspace, verifying end-to-end SARIF generation, severity
# detection, and warn-only exit behavior.

FIXTURES_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")/fixtures" && pwd)"
SCRIPTS_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")/../scripts" && pwd)"

# ── Helpers ──────────────────────────────────────────────────────────

setup() {
  TEST_TMPDIR="$(mktemp -d)"
  export PATH="${TEST_TMPDIR}/bin:${PATH}"
  mkdir -p "${TEST_TMPDIR}/bin"

  # Copy fixture workspace into a temp directory to simulate a real workspace
  cp -r "${FIXTURES_DIR}/." "${TEST_TMPDIR}/workspace/"

  export GITHUB_WORKSPACE="${TEST_TMPDIR}/workspace"
  export GITHUB_OUTPUT="${TEST_TMPDIR}/github_output"
  touch "${GITHUB_OUTPUT}"
  export GITHUB_REPOSITORY="test-org/test-repo"
  export GITHUB_SHA="e2eabc123"
  export GITHUB_REF="refs/pull/99/merge"
}

teardown() {
  rm -rf "${TEST_TMPDIR}"
}

# Mock claws that reads the fixture workspace and produces mixed-severity SARIF
mock_claws_mixed() {
  cat > "${TEST_TMPDIR}/bin/claws" <<MOCK
#!/usr/bin/env bash
# Simulate a claws check that finds mixed-severity violations.
# Outputs the sample.sarif fixture which has error + warning + note results.
cat "${FIXTURES_DIR}/sample.sarif"
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

# ── L2: Full action run with warn-only on fixture workspace ─────────

@test "e2e: warn-only on mixed-severity workspace exits 0, emits SARIF and warnings" {
  mock_claws_mixed
  mock_gh

  export INPUT_STAGE="1"
  export INPUT_FORMAT="sarif"
  export INPUT_WARN_ONLY="true"
  export INPUT_FAIL_ON="all"
  export INPUT_CACHE="true"

  run bash "${SCRIPTS_DIR}/run.sh"

  # warn-only always exits 0
  [ "$status" -eq 0 ]

  # SARIF file was generated
  [ -f "${TEST_TMPDIR}/workspace/claws-results.sarif" ]

  # SARIF file is valid JSON
  python -c "import json; json.load(open('${TEST_TMPDIR}/workspace/claws-results.sarif'))"

  # Output includes warn-only annotation
  [[ "$output" == *"warn-only mode"* ]]
  [[ "$output" == *"governance violation"* ]]

  # Per-severity warnings are emitted
  [[ "$output" == *"critical-severity"* ]]
  [[ "$output" == *"medium-severity"* ]]

  # SARIF upload was called (stage 1)
  [ -f "${TEST_TMPDIR}/gh_calls.log" ]
  grep -q "code-scanning/sarifs" "${TEST_TMPDIR}/gh_calls.log"

  # GitHub outputs were written
  grep -q "violation-count=3" "${GITHUB_OUTPUT}"
  grep -q "exit-code=1" "${GITHUB_OUTPUT}"
}
