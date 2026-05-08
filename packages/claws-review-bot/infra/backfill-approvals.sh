#!/usr/bin/env bash
# backfill-approvals.sh — sweep for PRs where the bot's latest verdict is
# approve-equivalent but no formal GitHub APPROVE review is in place at
# the current head SHA.
#
# Handles three cases:
#   1. Pre-66c51528 era — bot wrote :approve as an issue comment, never
#      submitted a formal review. Approve at the current SHA if still clean.
#   2. :reeval verdicts with empty findings — LLM emits :reeval (not
#      :approve) on first clean delta sometimes. Same as deployed bot's
#      isApproveVerdict() — treat as approve-equivalent.
#   3. Stale approvals — author pushed new commits (which GitHub auto-
#      dismisses), bot has reviewed the new SHA cleanly, but formal
#      approve hasn't landed for the new SHA yet.
#
# Idempotent: if @giodl already submitted a formal APPROVE on the
# current head SHA, skips. Won't re-approve.
#
# Usage:
#   bash infra/backfill-approvals.sh [--dry-run]
#
# Reads verdicts from clawsreviewbotstg/verdicts. Posts as the gh CLI's
# active microsoft.ghe.com user (must be giodl).

set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=1; fi

ACCOUNT="${VERDICT_ACCOUNT:-clawsreviewbotstg}"
CONTAINER="${VERDICT_CONTAINER:-verdicts}"
HOSTNAME="${GHE_HOSTNAME:-microsoft.ghe.com}"
RG="${VERDICT_RG:-claws-review-bot-rg}"
SELF=$(gh api --hostname "$HOSTNAME" user --jq '.login')

ACCOUNT_KEY=$(az storage account keys list --account-name "$ACCOUNT" \
  --resource-group "$RG" --query '[0].value' -o tsv 2>/dev/null)
if [[ -z "$ACCOUNT_KEY" ]]; then
  echo "[backfill] FAIL — could not fetch storage key for $ACCOUNT" >&2
  exit 1
fi

echo "[backfill] running as @$SELF on $HOSTNAME (dry-run=$DRY_RUN)"

# List ALL bic/* verdicts, newest first. We'll pick the latest per PR.
mapfile -t BLOBS < <(
  az storage blob list \
    --account-name "$ACCOUNT" \
    --container-name "$CONTAINER" \
    --account-key "$ACCOUNT_KEY" \
    --prefix "bic/" \
    --query "reverse(sort_by([?starts_with(name, 'bic/')], &properties.creationTime))[].name" \
    -o tsv | tr -d '\r'
)
echo "[backfill] found ${#BLOBS[@]} total verdicts"

# Walk newest-first; first verdict per PR is the latest.
declare -A LATEST_BLOB
declare -A LATEST_SHA
for blob in "${BLOBS[@]}"; do
  IFS='/' read -ra parts <<<"$blob"
  if [[ ${#parts[@]} -lt 5 ]]; then continue; fi
  pr_key="${parts[0]}/${parts[1]}#${parts[2]}"
  if [[ -z "${LATEST_BLOB[$pr_key]:-}" ]]; then
    LATEST_BLOB[$pr_key]="$blob"
    LATEST_SHA[$pr_key]="${parts[3]}"
  fi
done
echo "[backfill] reduced to ${#LATEST_BLOB[@]} unique PRs (latest verdict each)"

SUBMITTED=0
SKIPPED_NOT_APPROVE=0
SKIPPED_STALE=0
SKIPPED_CLOSED=0
SKIPPED_OWN=0
SKIPPED_ALREADY=0
FAILED=0

is_approve_equivalent() {
  # Returns 0 if the verdict body is approve-equivalent, 1 otherwise.
  # Matches deployed bot's isApproveVerdict() in tick.ts.
  local body_file="$1"
  local marker
  marker=$(grep -oE '<!-- claws-lobster-architect:[^ ]+ -->' "$body_file" | head -1 | sed -E 's/<!-- claws-lobster-architect:([^ ]+) -->/\1/')
  case "$marker" in
    approve) return 0 ;;
    reeval*)
      # Empty findings: "Still open: <none>" OR no F/LQ headers
      if grep -qE '^\s*-\s*Still open:\s*<none>\s*$' "$body_file"; then return 0; fi
      if ! grep -qE '^### (F-new[0-9]+|F[0-9]+|LQ[0-9]+)\b' "$body_file"; then return 0; fi
      return 1
      ;;
    *) return 1 ;;
  esac
}

for pr_key in "${!LATEST_BLOB[@]}"; do
  blob="${LATEST_BLOB[$pr_key]}"
  short_sha="${LATEST_SHA[$pr_key]}"
  IFS='#' read -r repo pr <<<"$pr_key"

  # Download verdict body to inspect marker + findings.
  tmp=$(mktemp)
  dl_status=0
  az storage blob download \
    --account-name "$ACCOUNT" --container-name "$CONTAINER" \
    --account-key "$ACCOUNT_KEY" --name "$blob" --file "$tmp" --no-progress \
    >/dev/null 2>/dev/null || dl_status=$?
  if [[ "$dl_status" != "0" || ! -s "$tmp" ]]; then
    echo "[backfill] FAIL download ${blob}"
    FAILED=$((FAILED+1))
    rm -f "$tmp"
    continue
  fi

  if ! is_approve_equivalent "$tmp"; then
    SKIPPED_NOT_APPROVE=$((SKIPPED_NOT_APPROVE+1))
    rm -f "$tmp"
    continue
  fi

  # PR state check
  pr_info=$(gh api --hostname "$HOSTNAME" "repos/${repo}/pulls/${pr}" 2>/dev/null || echo "{}")
  state=$(jq -r '.state // "unknown"' <<<"$pr_info")
  current_sha=$(jq -r '.head.sha // ""' <<<"$pr_info")
  author=$(jq -r '.user.login // ""' <<<"$pr_info")

  if [[ "$state" != "open" ]]; then
    SKIPPED_CLOSED=$((SKIPPED_CLOSED+1))
    rm -f "$tmp"
    continue
  fi

  # Stale: head moved past the verdict's SHA — production bot will catch up.
  if [[ -n "$current_sha" && ! "$current_sha" == ${short_sha}* ]]; then
    echo "[backfill] skip ${pr_key} — verdict SHA ${short_sha} but head is ${current_sha:0:9} (production bot will re-review)"
    SKIPPED_STALE=$((SKIPPED_STALE+1))
    rm -f "$tmp"
    continue
  fi

  if [[ "$author" == "$SELF" ]]; then
    SKIPPED_OWN=$((SKIPPED_OWN+1))
    rm -f "$tmp"
    continue
  fi

  # SHA-aware existing-approve check: has @SELF formally APPROVED at the
  # CURRENT head SHA (not just any older SHA — those got auto-dismissed)?
  existing=$(gh api --hostname "$HOSTNAME" "repos/${repo}/pulls/${pr}/reviews" \
    --jq "[.[] | select(.user.login==\"$SELF\" and .state==\"APPROVED\" and ((.commit_id // \"\") == \"$current_sha\"))] | length" \
    2>/dev/null || echo "0")
  if [[ "${existing:-0}" -gt 0 ]]; then
    SKIPPED_ALREADY=$((SKIPPED_ALREADY+1))
    rm -f "$tmp"
    continue
  fi

  if [[ "$DRY_RUN" == "1" ]]; then
    echo "[backfill] DRY-RUN would approve ${pr_key}@${short_sha} (author=@${author})"
    SUBMITTED=$((SUBMITTED+1))
    rm -f "$tmp"
    continue
  fi

  if gh api --hostname "$HOSTNAME" \
       "repos/${repo}/pulls/${pr}/reviews" \
       -X POST \
       -f "body=$(cat "$tmp")" \
       -f "event=APPROVE" \
       --jq '.id' >/dev/null 2>&1; then
    echo "[backfill] OK  approved ${pr_key}@${short_sha} (author=@${author})"
    SUBMITTED=$((SUBMITTED+1))
  else
    echo "[backfill] FAIL approve ${pr_key}@${short_sha}"
    FAILED=$((FAILED+1))
  fi
  rm -f "$tmp"
done

echo ""
echo "[backfill] summary:"
echo "  submitted:               $SUBMITTED"
echo "  skipped (not approve-equivalent): $SKIPPED_NOT_APPROVE"
echo "  skipped (closed/merged):  $SKIPPED_CLOSED"
echo "  skipped (head moved):     $SKIPPED_STALE"
echo "  skipped (own PR):         $SKIPPED_OWN"
echo "  skipped (already approved at head SHA): $SKIPPED_ALREADY"
echo "  failed:                  $FAILED"
