# claws-review-bot infra (P2)

Azure deployment artifacts for the polling daemon. Personal VS Enterprise sub (`148f5576-7098-45db-8258-76228e82ffdd`, tenant `d38cd9ac-c87b-4951-a895-1641af19db40`).

## Files

- `probe-egress.sh` — 30-second probe to confirm Container Apps in this sub can reach `microsoft.ghe.com`. **Run this before deploying the bot.**
- `bot.bicep` — Container Apps Job + KeyVault + Managed Identity. Single template; `az deployment group create` against an empty resource group.
- `bot.parameters.example.json` — parameters template; copy to `bot.parameters.json` (gitignored) and fill in.

## Pre-flight

```bash
# 1. Authenticate
az login --tenant d38cd9ac-c87b-4951-a895-1641af19db40
az account set --subscription 148f5576-7098-45db-8258-76228e82ffdd

# 2. Create resource group
az group create --name claws-review-bot-rg --location eastus2

# 3. Run egress probe — confirms personal-tenant Azure can reach microsoft.ghe.com
bash infra/probe-egress.sh

#   Expected output: "OK — egress to microsoft.ghe.com works"
#   On failure: see "If egress is blocked" below.
```

## Deploy

```bash
# After probe passes:
cp infra/bot.parameters.example.json infra/bot.parameters.json
# Fill in the GHE_PAT and ANTHROPIC_API_KEY (these become KeyVault secrets)

az deployment group create \
  --resource-group claws-review-bot-rg \
  --template-file infra/bot.bicep \
  --parameters @infra/bot.parameters.json
```

## If egress is blocked

If `probe-egress.sh` reports the Container can't reach `microsoft.ghe.com`, the personal-tenant Azure egress is blocked at the network layer. Two fallbacks:

1. **Run the daemon locally** on the dev machine — same `claws-review-bot poll` command, just doesn't deploy to Azure. Trade reliability for not solving the egress puzzle.
2. **Request a corp-tenant Azure subscription** and redeploy there. Corp-tenant Azure has direct routing to `*.microsoft.ghe.com`. Slower setup but the right long-term home.

## Cost ceiling

Container Apps Jobs charge per execution. At 10-min cron with ~30s execution:
- ~144 executions/day × ~30s = ~72 vCPU-min/day
- Storage: KeyVault (~$0.50/mo), Container Registry if used (~$5/mo), Log Analytics (variable)
- Anthropic API cost is the dominant variable — review run budget is the actual cost ceiling, not the Azure infra

Set the Container Apps Job `replicaTimeout` to 30 minutes (kill long reviews).
