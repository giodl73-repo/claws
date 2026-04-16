#!/usr/bin/env bash
# claws-action composite entry script.
#
# Parses GitHub Action inputs from INPUT_* environment variables,
# runs the claws CLI command for the specified pipeline stage,
# and uploads SARIF results to GitHub Code Scanning.
#
# Pipeline stages:
#   0 — pre-commit:  fast check, no upload
#   1 — PR check:    full check + SARIF upload
#   2 — CD gate:     full check + SARIF upload + fail on violations
#   3 — fleet cron:  full check + SARIF upload (scheduled)
#
# Required env vars (set by action.yml):
#   INPUT_STAGE   — pipeline stage (0, 1, 2, 3)
#   INPUT_FORMAT  — output format (sarif, json, csv, default)
#
# Optional env vars:
#   INPUT_FAIL_ON   — severity threshold: critical, high, medium, all (default: all)
#   INPUT_WARN_ONLY — if "true", report violations without failing
#   INPUT_SIGN      — if "true", sign artifacts (Stage 2 CD gate)
#   INPUT_FRAMEWORK — target framework hint
#   INPUT_CACHE     — enable governance compilation cache ("true"/"false")

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Validate required inputs ──────────────────────────────────────────

if [[ -z "${INPUT_STAGE:-}" ]]; then
  echo "::error::Missing required input: stage"
  exit 1
fi

if [[ -z "${INPUT_FORMAT:-}" ]]; then
  echo "::error::Missing required input: format"
  exit 1
fi

if [[ ! "${INPUT_STAGE}" =~ ^[0-3]$ ]]; then
  echo "::error::Invalid stage '${INPUT_STAGE}'. Must be 0, 1, 2, or 3."
  exit 1
fi

# ── Cache hit detection ───────────────────────────────────────────────

CACHE_HIT="${CLAWS_CACHE_HIT:-false}"
if [[ "${CACHE_HIT}" == "true" ]]; then
  echo "Cache hit — skipping governance recompilation"
fi

# ── Build claws command ───────────────────────────────────────────────

CLAWS_ARGS=("check" "--format" "${INPUT_FORMAT}")

if [[ "${INPUT_CACHE:-true}" == "false" || "${CACHE_HIT}" != "true" ]]; then
  # Force recompilation when cache is disabled or on cache miss
  if [[ "${INPUT_CACHE:-true}" == "false" ]]; then
    CLAWS_ARGS+=("--force")
  fi
fi

# Stage 2 CD gate: append --sign when requested
if [[ "${INPUT_STAGE}" -eq 2 && "${INPUT_SIGN:-false}" == "true" ]]; then
  CLAWS_ARGS+=("--sign")
  echo "Stage 2 CD gate: artifact signing enabled"
fi

# ── Determine SARIF output path ──────────────────────────────────────

SARIF_FILE=""
if [[ "${INPUT_FORMAT}" == "sarif" ]]; then
  SARIF_FILE="${GITHUB_WORKSPACE:-.}/claws-results.sarif"
fi

# ── Run claws ─────────────────────────────────────────────────────────

CLAWS_EXIT=0

if [[ -n "${SARIF_FILE}" ]]; then
  claws "${CLAWS_ARGS[@]}" > "${SARIF_FILE}" || CLAWS_EXIT=$?
else
  claws "${CLAWS_ARGS[@]}" || CLAWS_EXIT=$?
fi

# ── Count violations from SARIF (total + per severity) ───────────────

VIOLATION_COUNT=0
HAS_CRITICAL=0
HAS_HIGH=0
HAS_MEDIUM=0
if [[ -n "${SARIF_FILE}" && -f "${SARIF_FILE}" ]]; then
  # Extract violation count and per-severity flags from SARIF results.
  # SARIF levels: "error" = critical/high, "warning" = medium, "note" = low.
  # Pipe via stdin to avoid Windows/Unix path translation issues with python.
  eval "$(python -c "
import json, sys
try:
    sarif = json.load(sys.stdin)
    total = 0
    has_critical = 0
    has_high = 0
    has_medium = 0
    for run in sarif.get('runs', []):
        results = run.get('results', [])
        total += len(results)
        for r in results:
            level = r.get('level', 'note')
            if level == 'error':
                has_high = 1
                has_critical = 1
            elif level == 'warning':
                has_medium = 1
    print(f'VIOLATION_COUNT={total}')
    print(f'HAS_CRITICAL={has_critical}')
    print(f'HAS_HIGH={has_high}')
    print(f'HAS_MEDIUM={has_medium}')
except Exception:
    print('VIOLATION_COUNT=0')
    print('HAS_CRITICAL=0')
    print('HAS_HIGH=0')
    print('HAS_MEDIUM=0')
" < "${SARIF_FILE}" 2>/dev/null)" || true
fi

# ── Set outputs ──────────────────────────────────────────────────────

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  echo "sarif-file=${SARIF_FILE}" >> "${GITHUB_OUTPUT}"
  echo "violation-count=${VIOLATION_COUNT}" >> "${GITHUB_OUTPUT}"
  echo "exit-code=${CLAWS_EXIT}" >> "${GITHUB_OUTPUT}"
  echo "cache-hit=${CACHE_HIT}" >> "${GITHUB_OUTPUT}"
fi

# ── Upload SARIF (stages 1, 2, 3) ───────────────────────────────────

if [[ "${INPUT_STAGE}" -ge 1 && -n "${SARIF_FILE}" && -f "${SARIF_FILE}" ]]; then
  bash "${SCRIPT_DIR}/sarif-upload.sh" "${SARIF_FILE}"
fi

# ── Severity gating helper ───────────────────────────────────────────
# Returns 0 (should block) or 1 (should pass) based on fail-on threshold
# and the severities present in the SARIF results.
#
# Threshold mapping:
#   critical — block only when critical-severity violations exist
#   high     — block on critical or high
#   medium   — block on critical, high, or medium
#   all      — block on any violation (default)

should_block_for_severity() {
  local threshold="${1:-all}"

  # Normalize SARIF-level aliases to canonical vocabulary
  case "${threshold}" in
    error)   threshold="critical" ;;
    warning) threshold="medium" ;;
    note)    threshold="all" ;;
    none)    threshold="all" ;;
  esac

  case "${threshold}" in
    critical)
      [[ "${HAS_CRITICAL}" -eq 1 ]]
      ;;
    high)
      [[ "${HAS_CRITICAL}" -eq 1 || "${HAS_HIGH}" -eq 1 ]]
      ;;
    medium)
      [[ "${HAS_CRITICAL}" -eq 1 || "${HAS_HIGH}" -eq 1 || "${HAS_MEDIUM}" -eq 1 ]]
      ;;
    all)
      [[ "${VIOLATION_COUNT}" -gt 0 ]]
      ;;
    *)
      echo "::warning::Unknown fail-on value '${threshold}', defaulting to all"
      [[ "${VIOLATION_COUNT}" -gt 0 ]]
      ;;
  esac
}

# ── Determine exit behavior ──────────────────────────────────────────

# Warn-only mode: emit per-severity warnings but always exit 0
if [[ "${INPUT_WARN_ONLY:-false}" == "true" ]]; then
  if [[ "${VIOLATION_COUNT}" -gt 0 ]]; then
    echo "::warning::claws found ${VIOLATION_COUNT} governance violation(s) (warn-only mode)"
    if [[ "${HAS_CRITICAL}" -eq 1 ]]; then
      echo "::warning::  includes critical-severity violations"
    fi
    if [[ "${HAS_HIGH}" -eq 1 ]]; then
      echo "::warning::  includes high-severity violations"
    fi
    if [[ "${HAS_MEDIUM}" -eq 1 ]]; then
      echo "::warning::  includes medium-severity violations"
    fi
  fi
  exit 0
fi

# Stage 2 (CD gate) uses fail-on threshold (defaults to all)
if [[ "${INPUT_STAGE}" -eq 2 && "${CLAWS_EXIT}" -eq 1 ]]; then
  if should_block_for_severity "${INPUT_FAIL_ON:-all}"; then
    echo "::error::CD gate: ${VIOLATION_COUNT} governance violation(s) found (threshold: ${INPUT_FAIL_ON:-all})"
    exit 1
  fi
  echo "::warning::CD gate: ${VIOLATION_COUNT} violation(s) below threshold '${INPUT_FAIL_ON:-all}' — passing"
  exit 0
fi

# For other stages, apply severity-based gating
if [[ "${CLAWS_EXIT}" -eq 1 ]]; then
  if should_block_for_severity "${INPUT_FAIL_ON:-all}"; then
    exit 1
  fi
  echo "::warning::${VIOLATION_COUNT} violation(s) below threshold '${INPUT_FAIL_ON:-all}' — passing"
  exit 0
fi

exit "${CLAWS_EXIT}"
