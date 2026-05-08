#!/usr/bin/env bash
# backfill-approvals.sh — for every :approve verdict we previously posted as
# an issue comment (the only mode the bot had before commit 291b4df2),
# submit a formal GitHub PR review with event=APPROVE so it counts toward
# branch-protection merge gates.
#
# Idempotent: if @giodl already submitted an APPROVE review for the PR,
# skips. If the PR head moved past the approve SHA, skips (stale).
# If the PR is closed/merged, skips.
#
# Usage:
#   bash infra/backfill-approvals.sh [--dry-run]
#
# Reads verdicts from clawsreviewbotstg/verdicts. Posts as the gh-CLI's
# active microsoft.ghe.com user (must be giodl).

set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=1; fi

ACCOUNT="${VERDICT_ACCOUNT:-clawsreviewbotstg}"
CONTAINER="${VERDICT_CONTAINER:-verdicts}"
HOSTNAME="${GHE_HOSTNAME:-microsoft.ghe.com}"
RG="${VERDICT_RG:-claws-review-bot-rg}"
SELF=$(gh api --hostname "$HOSTNAME" user --jq '.login')

# Pre-fetch storage account key once — implicit lookup per call rate-limits
# in a tight loop and exits non-zero spuriously.
ACCOUNT_KEY=$(az storage account keys list --account-name "$ACCOUNT" \
  --resource-group "$RG" --query '[0].value' -o tsv 2>/dev/null)
if [[ -z "$ACCOUNT_KEY" ]]; then
  echo "[backfill] FAIL — could not fetch storage key for $ACCOUNT" >&2
  exit 1
fi

echo "[backfill] running as @$SELF on $HOSTNAME (dry-run=$DRY_RUN)"

# List all approve-marker blobs, newest first
mapfile -t BLOBS < <(
  az storage blob list \
    --account-name "$ACCOUNT" \
    --container-name "$CONTAINER" \
    --account-key "$ACCOUNT_KEY" \
    --prefix "bic/" \
    --query "reverse(sort_by([?contains(name, '/approve-')], &properties.creationTime))[].name" \
    -o tsv | tr -d '\r'
)

echo "[backfill] found ${#BLOBS[@]} approve-marker verdicts"

declare -A SEEN_PR
SUBMITTED=0
SKIPPED_DUPE=0
SKIPPED_STALE=0
SKIPPED_CLOSED=0
SKIPPED_ALREADY=0
FAILED=0

for blob in "${BLOBS[@]}"; do
  # Parse: bic/lobster/<pr>/<sha>/approve-<ts>.md
  IFS='/' read -ra parts <<<"$blob"
  if [[ ${#parts[@]} -lt 5 ]]; then continue; fi
  repo="${parts[0]}/${parts[1]}"
  pr="${parts[2]}"
  sha="${parts[3]}"

  # Latest-only per PR (we listed newest-first, so first hit wins)
  pr_key="${repo}#${pr}"
  if [[ -n "${SEEN_PR[$pr_key]:-}" ]]; then continue; fi
  SEEN_PR[$pr_key]=1

  # PR state check
  pr_info=$(gh api --hostname "$HOSTNAME" "repos/${repo}/pulls/${pr}" 2>/dev/null || echo "{}")
  state=$(jq -r '.state // "unknown"' <<<"$pr_info")
  current_sha=$(jq -r '.head.sha // ""' <<<"$pr_info")
  author=$(jq -r '.user.login // ""' <<<"$pr_info")

  if [[ "$state" != "open" ]]; then
    echo "[backfill] skip ${pr_key}@${sha} — PR state=${state}"
    SKIPPED_CLOSED=$((SKIPPED_CLOSED+1))
    continue
  fi

  # Stale check — PR head moved past our approve
  if [[ -n "$current_sha" && ! "$current_sha" == ${sha}* ]]; then
    echo "[backfill] skip ${pr_key}@${sha} — head moved to ${current_sha:0:9}"
    SKIPPED_STALE=$((SKIPPED_STALE+1))
    continue
  fi

  # Skip own PRs (we shouldn't approve our own)
  if [[ "$author" == "$SELF" ]]; then
    echo "[backfill] skip ${pr_key}@${sha} — own PR"
    SKIPPED_DUPE=$((SKIPPED_DUPE+1))
    continue
  fi

  # Check if @SELF already submitted an APPROVE review
  existing=$(gh api --hostname "$HOSTNAME" "repos/${repo}/pulls/${pr}/reviews" --jq "[.[] | select(.user.login==\"$SELF\" and .state==\"APPROVED\" and (.commit_id // \"\") | startswith(\"$sha\"))] | length" 2>/dev/null || echo "0")
  if [[ "$existing" != "0" && "$existing" != "" ]]; then
    echo "[backfill] skip ${pr_key}@${sha} — @${SELF} already APPROVED"
    SKIPPED_ALREADY=$((SKIPPED_ALREADY+1))
    continue
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[backfill] DRY-RUN would approve ${pr_key}@${sha:0:9} (author=@${author})"
    SUBMITTED=$((SUBMITTED+1))
    continue
  fi

  # Download verdict body
  tmp=$(mktemp)
  dl_status=0
  az storage blob download \
    --account-name "$ACCOUNT" --container-name "$CONTAINER" \
    --account-key "$ACCOUNT_KEY" --name "$blob" --file "$tmp" --no-progress \
    >/dev/null 2>/dev/null || dl_status=$?
  if [[ "$dl_status" != "0" || ! -s "$tmp" ]]; then
    echo "[backfill] FAIL download ${blob} (exit=$dl_status size=$(wc -c <"$tmp" 2>/dev/null || echo 0))"
    FAILED=$((FAILED+1))
    rm -f "$tmp"
    continue
  fi

  # Submit formal review with event=APPROVE
  if gh api --hostname "$HOSTNAME" \
       "repos/${repo}/pulls/${pr}/reviews" \
       -X POST \
       -f "body=$(cat "$tmp")" \
       -f "event=APPROVE" \
       --jq '.id' >/dev/null 2>&1; then
    echo "[backfill] OK  approved ${pr_key}@${sha:0:9} (author=@${author})"
    SUBMITTED=$((SUBMITTED+1))
  else
    echo "[backfill] FAIL approve ${pr_key}@${sha:0:9}"
    FAILED=$((FAILED+1))
  fi
  rm -f "$tmp"
done

echo ""
echo "[backfill] summary:"
echo "  submitted:      $SUBMITTED"
echo "  skipped (closed/merged): $SKIPPED_CLOSED"
echo "  skipped (stale SHA):     $SKIPPED_STALE"
echo "  skipped (own PR):        $SKIPPED_DUPE"
echo "  skipped (already done):  $SKIPPED_ALREADY"
echo "  failed:         $FAILED"
