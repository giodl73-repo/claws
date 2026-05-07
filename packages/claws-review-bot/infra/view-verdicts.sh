#!/usr/bin/env bash
# view-verdicts.sh — list / download recent verdicts from the bot's Storage.
#
# Requires az CLI authenticated to the sub. Reads STORAGE_ACCOUNT name
# from the deployment, or pass via env.
#
# Usage:
#   bash infra/view-verdicts.sh                # list 20 most recent verdicts
#   bash infra/view-verdicts.sh download all   # download all verdicts to ./verdicts/
#   STORAGE_ACCOUNT=foo view-verdicts.sh       # override the storage account name

set -euo pipefail

RG="${VERDICT_RG:-claws-review-bot-rg}"
STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-}"
CONTAINER="${VERDICT_CONTAINER:-verdicts}"

if [[ -z "$STORAGE_ACCOUNT" ]]; then
  STORAGE_ACCOUNT=$(az deployment group list --resource-group "$RG" --query '[0].properties.outputs.storageAccountName.value' -o tsv 2>/dev/null || true)
  if [[ -z "$STORAGE_ACCOUNT" ]]; then
    # Fall back to listing storage accounts in the RG
    STORAGE_ACCOUNT=$(az storage account list --resource-group "$RG" --query '[0].name' -o tsv 2>/dev/null || true)
  fi
fi

if [[ -z "$STORAGE_ACCOUNT" ]]; then
  echo "ERROR: could not infer STORAGE_ACCOUNT — set via env" >&2
  exit 1
fi

mode="${1:-list}"

case "$mode" in
  list)
    limit="${2:-20}"
    echo "[verdicts] account=$STORAGE_ACCOUNT container=$CONTAINER (showing $limit most recent)"
    az storage blob list \
      --account-name "$STORAGE_ACCOUNT" \
      --container-name "$CONTAINER" \
      --auth-mode login \
      --query "reverse(sort_by([], &properties.creationTime)) | [:$limit].{name:name, created:properties.creationTime, size:properties.contentLength}" \
      -o table
    ;;

  download)
    target="${2:-all}"
    dest="${3:-./verdicts}"
    mkdir -p "$dest"
    echo "[verdicts] downloading to $dest"
    if [[ "$target" == "all" ]]; then
      az storage blob download-batch \
        --account-name "$STORAGE_ACCOUNT" \
        --source "$CONTAINER" \
        --destination "$dest" \
        --auth-mode login
    else
      az storage blob download \
        --account-name "$STORAGE_ACCOUNT" \
        --container-name "$CONTAINER" \
        --name "$target" \
        --file "$dest/$(basename "$target")" \
        --auth-mode login
    fi
    ;;

  cat)
    blob_name="$2"
    echo "[verdicts] reading $blob_name" >&2
    az storage blob download \
      --account-name "$STORAGE_ACCOUNT" \
      --container-name "$CONTAINER" \
      --name "$blob_name" \
      --file - \
      --auth-mode login
    ;;

  *)
    echo "Usage: bash $0 [list [N] | download [path|all] [dest] | cat <blob-path>]"
    exit 2
    ;;
esac
