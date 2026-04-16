#!/usr/bin/env bash
# Upload SARIF file to GitHub Code Scanning via gh api.
#
# Usage: sarif-upload.sh <sarif-file>
#
# Required env vars (provided by GitHub Actions):
#   GITHUB_REPOSITORY — owner/repo
#   GITHUB_SHA        — commit SHA to associate results with
#   GITHUB_REF        — git ref (e.g., refs/heads/main)
#
# The script gzips and base64-encodes the SARIF file before uploading,
# as required by the Code Scanning API.

set -euo pipefail

SARIF_FILE="${1:?Usage: sarif-upload.sh <sarif-file>}"

if [[ ! -f "${SARIF_FILE}" ]]; then
  echo "::error::SARIF file not found: ${SARIF_FILE}"
  exit 1
fi

# ── Validate environment ─────────────────────────────────────────────

if [[ -z "${GITHUB_REPOSITORY:-}" ]]; then
  echo "::warning::GITHUB_REPOSITORY not set — skipping SARIF upload (not running in GitHub Actions)"
  exit 0
fi

if [[ -z "${GITHUB_SHA:-}" ]]; then
  echo "::warning::GITHUB_SHA not set — skipping SARIF upload"
  exit 0
fi

# ── Compress and encode SARIF ────────────────────────────────────────

SARIF_GZIP=$(gzip -c "${SARIF_FILE}" | base64 -w0 2>/dev/null || gzip -c "${SARIF_FILE}" | base64 2>/dev/null)

# ── Upload via gh api ────────────────────────────────────────────────

echo "Uploading SARIF to Code Scanning for ${GITHUB_REPOSITORY}@${GITHUB_SHA:0:7}..."

gh api \
  --method POST \
  "/repos/${GITHUB_REPOSITORY}/code-scanning/sarifs" \
  -f "commit_sha=${GITHUB_SHA}" \
  -f "ref=${GITHUB_REF:-refs/heads/main}" \
  -f "sarif=${SARIF_GZIP}" \
  -f "tool_name=claws" \
  --silent \
  && echo "SARIF uploaded successfully." \
  || {
    echo "::warning::SARIF upload failed — results will not appear as PR annotations. Ensure the workflow has 'permissions: security-events: write'."
    exit 0
  }
