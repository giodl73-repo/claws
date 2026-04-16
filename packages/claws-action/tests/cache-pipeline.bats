#!/usr/bin/env bats
# L1 integration test for cache hit vs miss behavior.
#
# Validates that cache hit skips recompilation and produces the
# "Cache hit" message, while cache miss runs normally.

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
  export FIXTURES_DIR
}

teardown() {
  rm -rf "${TEST_TMPDIR}"
}

# Mock claws that outputs clean SARIF
mock_claws_clean() {
  cat > "${TEST_TMPDIR}/bin/claws" <<'MOCK'
#!/usr/bin/env bash
cat <<'SARIF'
{
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "version": "2.1.0",
  "runs": [{"tool":{"driver":{"name":"claws","version":"0.1.0","informationUri":"https://claws.dev","rules":[]}},"results":[]}]
}
SARIF
exit 0
MOCK
  chmod +x "${TEST_TMPDIR}/bin/claws"
}

# ── L1: Cache hit vs miss behavior ───────────────────────────────────

@test "cache hit logs skip message and sets cache-hit=true; cache miss does not" {
  mock_claws_clean

  export INPUT_STAGE="1"
  export INPUT_FORMAT="sarif"
  export INPUT_FAIL_ON="error"
  export INPUT_WARN_ONLY="false"
  export INPUT_CACHE="true"

  # ── Cache miss (default) ──
  unset CLAWS_CACHE_HIT
  : > "${GITHUB_OUTPUT}"

  run bash "${SCRIPTS_DIR}/run.sh"
  [ "$status" -eq 0 ]

  # Should NOT contain cache hit message
  [[ "$output" != *"Cache hit"* ]]

  # cache-hit output should be false
  grep -q "cache-hit=false" "${GITHUB_OUTPUT}"

  # ── Cache hit ──
  export CLAWS_CACHE_HIT="true"
  : > "${GITHUB_OUTPUT}"

  run bash "${SCRIPTS_DIR}/run.sh"
  [ "$status" -eq 0 ]

  # Should contain cache hit message
  [[ "$output" == *"Cache hit"* ]]

  # cache-hit output should be true
  grep -q "cache-hit=true" "${GITHUB_OUTPUT}"
}
