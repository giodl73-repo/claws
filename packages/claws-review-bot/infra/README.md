# claws-review-bot infra (P2)

Azure deployment for the polling daemon. Personal VS Enterprise sub (`148f5576-7098-45db-8258-76228e82ffdd`, tenant `d38cd9ac-c87b-4951-a895-1641af19db40`).

## Files

- `probe-egress.sh` — confirms Azure resources in this sub can reach `microsoft.ghe.com`. Already run; passed.
- `bot.bicep` — Container Apps Job + KeyVault + Storage Account + Managed Identity. References existing AOAI in `rg-clawcode`.
- `bot.parameters.example.json` — copy to `bot.parameters.json` (gitignored) and fill in.
- `view-verdicts.sh` — list / download verdicts from the Storage Account for inspection.

## Architecture

```
+--------------------+      +-----------------------+
| Container Apps Job |      | KeyVault              |
| cron */10 min      |--->  | - ghe-pat             |
|                    |      | - aoai-api-key        |
|                    |      | - storage-conn-string |
+---------+----------+      +-----------------------+
          |
          | gh API           +-----------------------+
          +---------->       | microsoft.ghe.com     |
          |                  | (PR data + post)      |
          |                  +-----------------------+
          |
          | LLM call         +-----------------------+
          +---------->       | clawcode-aoai         |
          |                  | (GPT-5.5 deployment)  |
          |                  +-----------------------+
          |
          | verdict archive  +-----------------------+
          +---------->       | Storage Account       |
                             | verdicts/<repo>/      |
                             |   <pr>/<sha>/<m>.md   |
                             +-----------------------+
```

Verdicts are **always written to Storage Blob**, regardless of the `POST_COMMENTS` toggle. Posting to GHE is the additional opt-in step.

## Deploy

```bash
# 1. Resource group
az group create --name claws-review-bot-rg --location eastus2

# 2. Build + push the container image (one-time + on changes)
#    See: ../Dockerfile
#    Push to GHCR or your preferred registry, update parameters.json containerImage.

# 3. Fill parameters
cp infra/bot.parameters.example.json infra/bot.parameters.json
#    - ghePat: paste output of `gh auth token --hostname microsoft.ghe.com`
#    - containerImage: image you pushed in step 2
#    - aoaiDeploymentName: Azure deployment name for GPT-5.5, e.g. reviewer-gpt-5.5
#    - aoaiDeploymentNameReeval: cheaper GPT-5.x deployment for reevals, or "" to disable
#    - postComments: false for first 6h (dry-run), then flip to true

# 4. Deploy
az deployment group create \
  --resource-group claws-review-bot-rg \
  --template-file infra/bot.bicep \
  --parameters @infra/bot.parameters.json

# 5. Wait for first cron fire (up to 10 min) then inspect verdicts:
bash infra/view-verdicts.sh
```

## Toggling POST_COMMENTS without redeploy

The `POST_COMMENTS` env var is a runtime toggle. After 6 hours of dry-run inspection:

```bash
az containerapp job update \
  --name claws-review-bot-job \
  --resource-group claws-review-bot-rg \
  --set-env-vars POST_COMMENTS=true
```

Next cron fire onward, the bot will post verdicts to PRs in addition to archiving them.

## Cost

| Component | Approx cost |
|---|---|
| Container Apps Job (cron 10 min, ~30s execution) | ~$1-2/month |
| KeyVault | ~$0.50/month |
| Storage (verdicts ~10 KB each, indefinite retention) | ~$0.01/month |
| Log Analytics | $1-3/month |
| **Azure OpenAI GPT-5.5 inference** (50 reviews/day, ~50k tokens/review) | **~$1,250/month at full-tier list price before cache/reeval savings** |

Cost ceiling: AOAI dominates. To cap, lower `pollIntervalMinutes`, or set `replicaTimeout` lower (currently 30 min).

## GPT-5.5 setup

Deploy a GPT-5.5 model in the existing `clawcode-aoai` Azure OpenAI account and name the deployment `reviewer-gpt-5.5` (or update `aoaiDeploymentName` to match the actual deployment name). Keep `aoaiReasoningEffort=high` unless the deployed model explicitly supports `xhigh` and the extra latency/cost is intended. `aoaiMaxCompletionTokens=32000` is the operational default; raise it only for reviews that genuinely need longer verdicts.

The bot still calls Chat Completions because the current harness is text-only and does not use hosted tools. GPT-5.5 deployments are sent the reasoning-model request shape: developer messages, `max_completion_tokens`, `reasoning_effort`, optional `verbosity`, and no `temperature`.

## If egress is blocked

Egress was confirmed working (HTTP 401 from `api.microsoft.ghe.com` via probe — see commit `cc2f6650`). If it ever stops working:

1. Run the daemon locally on the dev machine — same `claws-review-bot poll` command, just doesn't deploy to Azure.
2. Request a corp-tenant Azure subscription and redeploy there. Corp-tenant Azure has direct routing to `*.microsoft.ghe.com`.
