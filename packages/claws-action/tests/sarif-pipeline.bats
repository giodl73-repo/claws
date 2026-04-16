#!/usr/bin/env bats
# L1 integration tests for claws-action SARIF pipeline.
#
# Tests end-to-end SARIF generation + upload pipeline and stage 0+1 wiring.
# Uses mock claws and mock gh to verify the full flow without network access.

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
}

teardown() {
  rm -rf "${TEST_TMPDIR}"
}

# Mock claws that outputs SARIF with violations (exit 1)
mock_claws_violations() {
  cat > "${TEST_TMPDIR}/bin/claws" <<MOCK
#!/usr/bin/env bash
cat "${FIXTURES_DIR}/sample.sarif"
exit 1
MOCK
  chmod +x "${TEST_TMPDIR}/bin/claws"
}

# Mock gh CLI that records the API call
mock_gh() {
  cat > "${TEST_TMPDIR}/bin/gh" <<'MOCK'
#!/usr/bin/env bash
# Record the call for verification
echo "$@" >> "${TEST_TMPDIR}/gh_calls.log"
exit 0
MOCK
  chmod +x "${TEST_TMPDIR}/bin/gh"
}

# ── L1: SARIF generation + upload pipeline ───────────────────────────

@test "SARIF generation + upload pipeline: stage 1 generates SARIF and calls gh api" {
  mock_claws_violations
  mock_gh

  export INPUT_STAGE="1"
  export INPUT_FORMAT="sarif"
  export INPUT_FAIL_ON="error"
  export INPUT_WARN_ONLY="false"
  export INPUT_CACHE="true"
  export GITHUB_REPOSITORY="test-org/test-repo"
  export GITHUB_SHA="abc123def456"
  export GITHUB_REF="refs/pull/42/merge"

  run bash "${SCRIPTS_DIR}/run.sh"

  # Stage 1 with violations should exit 1 (fail-on=error)
  [ "$status" -eq 1 ]

  # Verify SARIF file was created
  [ -f "${TEST_TMPDIR}/claws-results.sarif" ]

  # Verify SARIF is valid JSON with correct schema
  python3 -c "
import json
with open('${TEST_TMPDIR}/claws-results.sarif') as f:
    sarif = json.load(f)
assert sarif['version'] == '2.1.0'
assert 'sarif' in sarif['\$schema']
assert len(sarif['runs'][0]['results']) == 3
"

  # Verify gh api was called for SARIF upload
  [ -f "${TEST_TMPDIR}/gh_calls.log" ]
  grep -q "code-scanning/sarifs" "${TEST_TMPDIR}/gh_calls.log"
  grep -q "test-org/test-repo" "${TEST_TMPDIR}/gh_calls.log"

  # Verify outputs
  grep -q "violation-count=3" "${GITHUB_OUTPUT}"
  grep -q "exit-code=1" "${GITHUB_OUTPUT}"
}

# ── L1: Stage 0+1 wiring ────────────────────────────────────────────

@test "Stage 0 (pre-commit) does not upload SARIF; Stage 1 (PR check) does" {
  mock_claws_violations
  mock_gh

  export INPUT_FORMAT="sarif"
  export INPUT_FAIL_ON="error"
  export INPUT_WARN_ONLY="false"
  export INPUT_CACHE="true"
  export GITHUB_REPOSITORY="test-org/test-repo"
  export GITHUB_SHA="abc123def456"
  export GITHUB_REF="refs/heads/main"

  # ── Stage 0: pre-commit — no upload ──
  export INPUT_STAGE="0"
  rm -f "${TEST_TMPDIR}/gh_calls.log"
  rm -f "${TEST_TMPDIR}/claws-results.sarif"

  run bash "${SCRIPTS_DIR}/run.sh"

  # Stage 0 still fails on violations
  [ "$status" -eq 1 ]

  # SARIF file should exist (it's still generated for output)
  [ -f "${TEST_TMPDIR}/claws-results.sarif" ]

  # But gh should NOT have been called (stage 0 skips upload)
  [ ! -f "${TEST_TMPDIR}/gh_calls.log" ]

  # ── Stage 1: PR check — upload happens ──
  export INPUT_STAGE="1"
  rm -f "${TEST_TMPDIR}/gh_calls.log"
  rm -f "${TEST_TMPDIR}/claws-results.sarif"
  : > "${GITHUB_OUTPUT}"

  run bash "${SCRIPTS_DIR}/run.sh"

  [ "$status" -eq 1 ]
  [ -f "${TEST_TMPDIR}/claws-results.sarif" ]

  # gh API should have been called for upload
  [ -f "${TEST_TMPDIR}/gh_calls.log" ]
  grep -q "code-scanning/sarifs" "${TEST_TMPDIR}/gh_calls.log"
}
