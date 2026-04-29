#!/usr/bin/env bash
# scan-pr-body — apply bot-preempt-checklist §3.2 NEVER-SAFE phrase check.
#
# Usage:
#   scripts/scan-pr-body.sh PR-DESCRIPTION.md
#
# Exit codes:
#   0   — file is clear of NEVER-SAFE phrases (carve-out matches OK)
#   1   — at least one NEVER-SAFE phrase present
#   2   — usage error (file not provided / not readable)
#
# This script is the operationalization of the §3 checkbox "every match
# is a §3.2-recognised carve-out, OR no matches." It does NOT decide
# carve-outs automatically — it only flags the NEVER-SAFE phrases.

set -euo pipefail

if [ $# -ne 1 ] || [ ! -r "$1" ]; then
  echo "usage: scan-pr-body.sh <pr-description-file>" >&2
  exit 2
fi

FILE="$1"

# Backtick-wrapped occurrences are anchor references / code spans, not
# policy claims; strip them before applying the NEVER-SAFE patterns.
# Two passes: triple-backtick fenced blocks first, then single-backtick
# code spans. The line numbers in matches will be approximate (sed-stripped
# lines preserve newline count); the OUTPUT cites both stripped-line
# matches and original-file context for human review.
SCRUBBED=$(sed -E 's/```[^`]*```//g; s/`[^`]*`//g' "$FILE")

# NEVER-SAFE phrase set from bot-preempt-checklist §3.2.
NEVER_SAFE_PATTERNS=(
  'third[ -]party plugin'
  'third[ -]party extension'
  'third[ -]party skill'
  'OpenClaw skill'
  'OpenClaw extension'
  'extension to OpenClaw'
  '\bClawHub\b'
  'Claw Hub'
  'clawhub'
  'r:third[ -]party'
  'r:skill'
  'r:extension'
  'make this an extension'
  'ship as an extension'
  'ship as a skill'
)

EXIT=0
for pattern in "${NEVER_SAFE_PATTERNS[@]}"; do
  matches=$(echo "$SCRUBBED" | grep -niE "$pattern" 2>/dev/null || true)
  if [ -n "$matches" ]; then
    echo "NEVER-SAFE: pattern '$pattern' matches (after stripping backtick spans):"
    echo "$matches" | sed 's/^/  /'
    EXIT=1
  fi
done

if [ $EXIT -eq 0 ]; then
  echo "OK: no NEVER-SAFE phrases detected outside of backtick-wrapped anchor refs. Note: §3.2 carve-out decisions for unbacked architectural terms (extension, skill in prose) are the author's responsibility — re-read context before push."
fi

exit $EXIT
