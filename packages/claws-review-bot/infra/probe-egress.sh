#!/usr/bin/env bash
# probe-egress.sh — confirm Azure resources in this sub can reach microsoft.ghe.com.
#
# Usage:
#   az login --tenant <tenant-id>
#   az account set --subscription <sub-id>
#   bash infra/probe-egress.sh
#
# Prints OK + exits 0 if reachable; prints FAIL + exits 1 otherwise.
#
# Mechanism: spin a one-shot Azure Container Instance running curl against
# api.microsoft.ghe.com. If curl gets HTTP 401 (unauthenticated, but
# reachable) or 200/3xx, egress is fine. If it times out or DNS fails,
# egress is blocked at the network layer.
#
# Why ACI instead of Container Apps Job: ACI supports plain `--command-line`
# without the multi-arg parsing surprises. Single-shot, single-container,
# no environment to provision.

set -euo pipefail

RG="${PROBE_RG:-claws-review-bot-probe-rg}"
LOCATION="${PROBE_LOCATION:-eastus2}"
ACI_NAME="${PROBE_ACI:-egress-probe}"
TARGET_HOST="api.microsoft.ghe.com"

echo "[probe] resource group: $RG (will create if missing)"
echo "[probe] target: https://$TARGET_HOST/"

# Ensure RG exists
if ! az group show --name "$RG" --query name -o tsv >/dev/null 2>&1; then
  echo "[probe] creating resource group $RG in $LOCATION"
  az group create --name "$RG" --location "$LOCATION" >/dev/null
fi

# Delete any prior probe (reuse name)
az container delete --resource-group "$RG" --name "$ACI_NAME" --yes >/dev/null 2>&1 || true

# Create + run ACI synchronously (defaults to RestartPolicy=Always; we
# want Never so the container exits after curl finishes)
echo "[probe] running probe (60s timeout, public mcr.microsoft.com image)"
az container create \
  --resource-group "$RG" \
  --name "$ACI_NAME" \
  --image "mcr.microsoft.com/azurelinux/base/nginx:1.25" \
  --restart-policy Never \
  --location "$LOCATION" \
  --os-type Linux \
  --cpu 0.5 \
  --memory 0.5 \
  --command-line "/usr/bin/curl -sS -o /dev/null -w 'EGRESS_HTTP_CODE=%{http_code}\n' --max-time 30 https://$TARGET_HOST/" \
  >/dev/null

# Wait for terminal state
echo "[probe] waiting for completion"
for i in $(seq 1 30); do
  STATUS=$(az container show \
    --resource-group "$RG" \
    --name "$ACI_NAME" \
    --query "containers[0].instanceView.currentState.state" -o tsv 2>/dev/null || echo "Waiting")

  if [[ "$STATUS" == "Terminated" ]]; then
    break
  fi
  sleep 2
done

# Read logs
LOGS=$(az container logs --resource-group "$RG" --name "$ACI_NAME" 2>&1 || echo "")
echo "[probe] container output:"
echo "$LOGS" | sed 's/^/  /'

# Parse the result
if echo "$LOGS" | grep -qE "EGRESS_HTTP_CODE=(2[0-9]{2}|3[0-9]{2}|401|403|404)"; then
  echo "[probe] OK — egress to $TARGET_HOST works (HTTP response received)"
  echo "[probe] cleanup: az group delete --name $RG --yes --no-wait"
  exit 0
elif echo "$LOGS" | grep -qE "EGRESS_HTTP_CODE=000"; then
  echo "[probe] FAIL — curl reached the network but no HTTP response (likely TCP reset or proxy block)"
  exit 1
elif echo "$LOGS" | grep -qE "Could not resolve|name resolution"; then
  echo "[probe] FAIL — DNS resolution failed for $TARGET_HOST"
  exit 1
else
  echo "[probe] FAIL — unrecognized output (see logs above)"
  exit 1
fi
