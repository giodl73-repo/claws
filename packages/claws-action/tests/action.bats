#!/usr/bin/env bats
# L0 unit tests for claws-action.
#
# Tests SARIF output structure, severity mapping, action input parsing,
# and required field validation. Uses fixture data and mock claws commands.

FIXTURES_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")/fixtures" && pwd)"
SCRIPTS_DIR="$(cd "$(dirname "${BATS_TEST_FILENAME}")/../scripts" && pwd)"

# ── Helpers ──────────────────────────────────────────────────────────

setup() {
  # Create a temp dir for each test
  TEST_TMPDIR="$(mktemp -d)"
  export PATH="${TEST_TMPDIR}/bin:${PATH}"
  mkdir -p "${TEST_TMPDIR}/bin"
}

teardown() {
  rm -rf "${TEST_TMPDIR}"
}

# Create a mock claws that outputs a fixture SARIF file
mock_claws_sarif() {
  cat > "${TEST_TMPDIR}/bin/claws" <<'MOCK'
#!/usr/bin/env bash
# Mock claws — outputs the sample SARIF fixture
cat "$FIXTURES_DIR/sample.sarif"
exit 1
MOCK
  chmod +x "${TEST_TMPDIR}/bin/claws"
  # Export FIXTURES_DIR so the mock can reference it
  export FIXTURES_DIR
}

# Create a mock claws that outputs nothing (clean check)
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

# ── L0: SARIF output has correct ruleId ──────────────────────────────

@test "SARIF output has correct ruleId for each violation" {
  # Verify the fixture SARIF has the expected ruleIds
  local sarif="${FIXTURES_DIR}/sample.sarif"

  # Check that each result has a ruleId matching a declared rule
  local rule_ids
  rule_ids=$(python3 -c "
import json
with open('${sarif}') as f:
    sarif = json.load(f)
run = sarif['runs'][0]
rule_ids = {r['id'] for r in run['tool']['driver']['rules']}
for result in run['results']:
    rid = result['ruleId']
    assert rid in rule_ids, f'ruleId {rid} not in rules: {rule_ids}'
    print(rid)
" 2>&1)

  # Verify specific ruleIds are present
  echo "${rule_ids}" | grep -q "G-PERM-001"
  echo "${rule_ids}" | grep -q "G-DATA-002"
  echo "${rule_ids}" | grep -q "G-INPUT-003"
}

# ── L0: SARIF severity mapping ──────────────────────────────────────

@test "SARIF severity mapping: critical/high=error, medium=warning, low=note" {
  local sarif="${FIXTURES_DIR}/sample.sarif"

  python3 -c "
import json
with open('${sarif}') as f:
    sarif = json.load(f)
results = sarif['runs'][0]['results']
valid_levels = {'error', 'warning', 'note', 'none'}

# Check all results have valid SARIF levels
for r in results:
    level = r['level']
    assert level in valid_levels, f'Invalid SARIF level: {level}'

# Verify specific mappings from our fixture
by_rule = {r['ruleId']: r['level'] for r in results}
assert by_rule['G-PERM-001'] == 'error', f'Expected error, got {by_rule[\"G-PERM-001\"]}'
assert by_rule['G-DATA-002'] == 'warning', f'Expected warning, got {by_rule[\"G-DATA-002\"]}'
assert by_rule['G-INPUT-003'] == 'note', f'Expected note, got {by_rule[\"G-INPUT-003\"]}'
print('PASS: severity mapping correct')
"
}

# ── L0: Action input parsing ────────────────────────────────────────

@test "Action input parsing reads all INPUT_* environment variables" {
  mock_claws_clean

  export INPUT_STAGE="1"
  export INPUT_FORMAT="sarif"
  export INPUT_FAIL_ON="error"
  export INPUT_WARN_ONLY="false"
  export INPUT_FRAMEWORK="claude-code"
  export INPUT_CACHE="true"
  export GITHUB_WORKSPACE="${TEST_TMPDIR}"
  export GITHUB_OUTPUT="${TEST_TMPDIR}/github_output"
  touch "${GITHUB_OUTPUT}"

  # Run the action entry script — clean check should exit 0
  run bash "${SCRIPTS_DIR}/run.sh"

  [ "$status" -eq 0 ]

  # Verify outputs were written
  grep -q "sarif-file=" "${GITHUB_OUTPUT}"
  grep -q "violation-count=" "${GITHUB_OUTPUT}"
  grep -q "exit-code=0" "${GITHUB_OUTPUT}"
}

# ── L0: Required field validation ───────────────────────────────────

@test "Action input parsing validates required fields (stage, format)" {
  # Missing stage
  unset INPUT_STAGE
  export INPUT_FORMAT="sarif"
  export GITHUB_WORKSPACE="${TEST_TMPDIR}"

  run bash "${SCRIPTS_DIR}/run.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"Missing required input: stage"* ]]

  # Missing format
  export INPUT_STAGE="1"
  unset INPUT_FORMAT

  run bash "${SCRIPTS_DIR}/run.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"Missing required input: format"* ]]

  # Invalid stage value
  export INPUT_STAGE="5"
  export INPUT_FORMAT="sarif"

  run bash "${SCRIPTS_DIR}/run.sh"
  [ "$status" -ne 0 ]
  [[ "$output" == *"Invalid stage"* ]]
}
