#!/usr/bin/env bash
# probe-egress.sh — confirm Container Apps in this sub can reach microsoft.ghe.com.
#
# Usage:
#   az login --tenant <tenant-id>
#   az account set --subscription <sub-id>
#   bash infra/probe-egress.sh
#
# Prints OK + exits 0 if reachable; prints FAIL + exits 1 otherwise.
#
# Mechanism: spin a one-shot Container Apps Job running curl against
# api.microsoft.ghe.com (the GHE API endpoint). If curl gets HTTP 401
# (unauthenticated, but reachable) or 200, egress is fine. If it times
# out or gets DNS NXDOMAIN, egress is blocked.

set -euo pipefail

RG="${PROBE_RG:-claws-review-bot-probe-rg}"
LOCATION="${PROBE_LOCATION:-eastus2}"
ENV_NAME="${PROBE_ENV:-claws-review-probe-env}"
JOB_NAME="${PROBE_JOB:-egress-probe}"
TARGET_HOST="api.microsoft.ghe.com"

echo "[probe] using resource group: $RG (will create if missing)"
echo "[probe] target: https://$TARGET_HOST/"

# Ensure RG exists
if ! az group show --name "$RG" --query name -o tsv >/dev/null 2>&1; then
  echo "[probe] creating resource group $RG in $LOCATION"
  az group create --name "$RG" --location "$LOCATION" >/dev/null
fi

# Ensure Container Apps environment exists
if ! az containerapp env show --resource-group "$RG" --name "$ENV_NAME" --query name -o tsv >/dev/null 2>&1; then
  echo "[probe] creating Container Apps environment $ENV_NAME"
  az containerapp env create \
    --resource-group "$RG" \
    --name "$ENV_NAME" \
    --location "$LOCATION" \
    --logs-destination none \
    >/dev/null
fi

# Delete any prior probe job
az containerapp job delete \
  --resource-group "$RG" \
  --name "$JOB_NAME" \
  --yes >/dev/null 2>&1 || true

# Create + run the probe job
echo "[probe] running probe (30s timeout)"
EXEC_NAME=$(az containerapp job create \
  --resource-group "$RG" \
  --name "$JOB_NAME" \
  --environment "$ENV_NAME" \
  --image "mcr.microsoft.com/azurelinux/base/core:3.0" \
  --trigger-type Manual \
  --replica-timeout 30 \
  --replica-retry-limit 0 \
  --command "bash" \
  --args "-c" "tdnf install -y curl > /dev/null 2>&1 && curl -sS -o /dev/null -w 'HTTP %{http_code}\n' --max-time 20 https://$TARGET_HOST/" \
  --query "properties.provisioningState" -o tsv)

if [[ "$EXEC_NAME" != "Succeeded" ]]; then
  echo "[probe] FAIL — job creation did not succeed: $EXEC_NAME"
  exit 1
fi

EXECUTION=$(az containerapp job start \
  --resource-group "$RG" \
  --name "$JOB_NAME" \
  --query "name" -o tsv)

echo "[probe] execution: $EXECUTION"

# Poll for completion
for i in $(seq 1 30); do
  STATUS=$(az containerapp job execution show \
    --resource-group "$RG" \
    --name "$JOB_NAME" \
    --job-execution-name "$EXECUTION" \
    --query "properties.status" -o tsv 2>/dev/null || echo "Pending")

  case "$STATUS" in
    Succeeded)
      echo "[probe] OK — egress to $TARGET_HOST works (HTTP response received)"
      echo "[probe] cleanup: az group delete --name $RG --yes --no-wait"
      exit 0
      ;;
    Failed)
      echo "[probe] FAIL — execution failed; egress likely blocked"
      echo "[probe] inspect: az containerapp job execution show -g $RG -n $JOB_NAME --job-execution-name $EXECUTION"
      exit 1
      ;;
    *)
      sleep 2
      ;;
  esac
done

echo "[probe] FAIL — execution did not complete within timeout window"
exit 1
