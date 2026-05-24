# Claws Review Bot / Azure Ops Snapshot

Last refreshed: 2026-05-22

## Scope

- Azure subscription: `Visual Studio Enterprise Subscription`
- Subscription id: `148f5576-7098-45db-8258-76228e82ffdd`
- Tenant: `Default Directory`
- Azure CLI user observed: `giodl25@hotmail.com`
- GitHub.com CLI user observed: `giodl73-repo`
- GHE CLI host observed: `microsoft.ghe.com`, user `giodl`

## Intended Review Bot Shape

Local package: `packages/claws-review-bot`

Tracked file currently present:

- `packages/claws-review-bot/infra/bot.parameters.json`

Local untracked build/runtime directories observed:

- `packages/claws-review-bot/dist`
- `packages/claws-review-bot/dogfood`
- `packages/claws-review-bot/node_modules`

Built CLI in `dist/cli.js` exposes:

- `claws-review-bot tick <repo>#<number>`
- `claws-review-bot poll --repo <repo> --seen <path> --interval-min <minutes> --post --skip-author <login>`
- `claws-review-bot preflight`
- `claws-review-bot voice`

Built code targets `microsoft.ghe.com` by default and polls open PRs via `gh api --hostname microsoft.ghe.com`.

Observed intended production env/config from built code and parameter file:

- watched repo: `bic/lobster`
- skip author: `giodl`
- poll interval: 15 minutes
- posts formal PR reviews/comments when enabled
- LLM backend: Azure OpenAI when `LLM_BACKEND=azure-openai`
- Azure OpenAI env contract: `AOAI_ENDPOINT`, `AOAI_DEPLOYMENT`, `AOAI_API_KEY`, optional `AOAI_API_VERSION`
- AOAI resource group/account/deployment from parameter file: `rg-clawcode` / `clawcode-aoai` / `reviewer-gpt5`
- ACR image from parameter file: `clawsreviewbotacr.azurecr.io/claws-review-bot:13add525`
- storage lock/verdict code uses Azure Blob container default `verdicts`

Security note: `packages/claws-review-bot/infra/bot.parameters.json` previously contained a plaintext GitHub token value. It was redacted locally on 2026-05-22, but the token must still be treated as exposed and rotated before trusting any deployment.

## Azure Resources Observed

Resource groups:

- `rg-clawcode`
- `claws-review-bot-rg`
- `NetworkWatcherRG`

`rg-clawcode`:

- VM `clawcode-vm`, size `Standard_D2s_v5`, location `westus2`
- VM power state on 2026-05-22: `VM deallocated`
- Azure AI account `clawcode-aoai`, kind `AIServices`, SKU `S0`, location `eastus2`, provisioning `Succeeded`
- endpoint: `https://clawcode-aoai.cognitiveservices.azure.com/`
- resource `openclaw-msteams-sdk-review` also present

`claws-review-bot-rg`:

- ACR `clawsreviewbotacr`, Basic, public network access enabled
- managed identity `claws-review-bot-mi`
- storage account `clawsreviewbotstg`
- Log Analytics workspace `claws-review-bot-logs`
- Key Vault `claws-review-bot-kv`
- Container Apps environment `claws-review-bot-env`
- Container Apps job `claws-review-bot-job`

Current Container Apps job health on 2026-05-22:

- `claws-review-bot-job` provisioning state: `Failed`
- trigger type: `Schedule`
- schedule config: null
- container template: null
- registry config: null
- identity: null
- replica timeout/retry limit: 0
- execution list failed with `Precondition Failed`

Conclusion: the Azure Container Apps job is not currently a valid running bot deployment. It has no runnable template or schedule.

Access gaps observed:

- Current Azure identity can list resource metadata.
- Current Azure identity cannot list Key Vault secret metadata for `claws-review-bot-kv` (`ForbiddenByRbac`).
- `az acr repository list -n clawsreviewbotacr` failed with registry access/connectivity authorization error, even though ACR metadata is visible.

## Latest Review Activity Observed

Enterprise repo access works with:

```powershell
$env:GH_HOST='microsoft.ghe.com'
gh repo view bic/lobster --json nameWithOwner,viewerPermission,defaultBranchRef,url
```

Observed permission: `WRITE`.

Latest explicit Codeclaw/Claws review found:

- repo: `bic/lobster`
- PR: `#1670`
- title: `Enable Graph proxy approvals`
- URL: `https://microsoft.ghe.com/bic/lobster/pull/1670`
- submitted: `2026-05-22T16:13:52Z`
- author shown by GitHub: `edpiva`
- state: `CHANGES_REQUESTED`
- heading: `Codeclaw review — REQUEST CHANGES · 2 findings · 2026-05-22 16:13 UTC`

Findings:

- stale Redis relay miss could cancel an approval already delivered locally or to another remote pod
- PR head conflicted with current `origin/main` in runtime bootstrap wiring

Follow-up:

- `dspektor` commented at `2026-05-22T17:08:26Z` that Codeclaw feedback was addressed in `04946243`
- later approval observed from `Ryan-Gregg` at `2026-05-22T17:35:57Z`

Important distinction: recent reviews are visible in the repo, but the healthy runner path is not proven to be the Azure Container Apps job because that job is failed/malformed.

## Cost Snapshot

Cost query used:

```powershell
$bodyPath = Join-Path $env:TEMP 'openclaw-cost-query.json'
# body: ActualCost, MonthToDate, grouped by ResourceGroupName and ServiceName
az rest --method post --headers 'Content-Type=application/json' --url 'https://management.azure.com/subscriptions/148f5576-7098-45db-8258-76228e82ffdd/providers/Microsoft.CostManagement/query?api-version=2021-10-01' --body @$bodyPath -o json
```

Month-to-date actual cost returned on 2026-05-22: about `$157.29` USD.

Breakdown:

`rg-clawcode`: about `$153.99`

- Foundry Models: `$112.95`
- Virtual Machines: `$36.54`
- Storage: `$2.52`
- Virtual Network: `$1.95`
- Bandwidth: `$0.02`

`claws-review-bot-rg`: about `$3.25`

- Container Registry: `$2.45`
- Azure Container Apps: `$0.50`
- Storage: `$0.18`
- Log Analytics: `$0.11`
- Key Vault: `$0.01`
- Bandwidth: near `$0.00`

Other small proof/probe groups:

- `claws-review-bot-probe-rg`: near `$0.00`
- `rg-pr83753-proof-20260518210011`: about `$0.05`

Cost interpretation:

- The main spend is not the failed review-bot job. It is `rg-clawcode`, especially Foundry Models and earlier VM runtime.
- The OpenClaw VM was deallocated at refresh time, so ongoing VM compute spend should be stopped, but disk/network/storage charges remain.
- The review-bot resource group is cheap so far, but the job is not healthy.

## Recovery Plan

1. Rotate the plaintext GitHub token that was previously present in `packages/claws-review-bot/infra/bot.parameters.json`.
2. Decide the authoritative runner:
   - Azure Container Apps scheduled job, or
   - local/manual dogfood runner, or
   - another VM/container not yet identified.
3. If Azure Container Apps is authoritative, redeploy `claws-review-bot-job` with:
   - user-assigned identity or explicit registry credentials
   - valid container image
   - schedule config
   - required env/secrets for GHE, AOAI, and storage
   - persistent `seen.json` or storage-backed dedupe/locks
4. Grant the operating Azure identity enough RBAC to inspect:
   - `claws-review-bot-kv` secret metadata
   - `clawsreviewbotacr` repository manifests/tags
   - Container Apps job logs/executions
5. Verify runner by posting a dry-run or controlled review against a known test PR, then confirm the author/account shown in GHE matches expectations.
6. Re-run Cost Management after repair and after any review burst to separate model usage from idle platform cost.

## Foundry Cost Controls

Meter rollup on 2026-05-22 for `rg-clawcode` / `Foundry Models` showed month-to-date model spend dominated by GPT-5-family output tokens:

- GPT-5 output: `$47.10`
- GPT-5-mini output: `$33.11`
- GPT-5 input: `$13.62`
- GPT-5-mini input: `$8.30`
- GPT-4.1-mini input: `$6.83`
- cached input discounts are present but small compared with output spend

Cheapest controls to apply first:

1. Route routine review passes to `reviewer-gpt5-mini` or `coder` (`gpt-4.1-mini`) and reserve `reviewer-gpt5` for security/high-risk/escalated diffs.
2. Cap completion tokens for normal reviews and require concise findings. Output tokens are the largest cost center.
3. Keep stable prompt prefixes and run related reviews close together so Azure prompt caching can hit. Cache only helps matching prompt prefixes and does not reduce output-token cost.
4. Add a per-run budget guard in the bot before posting: estimate diff size, choose model tier, and skip/escalate if projected spend is too high.
5. Add Azure budgets/alerts for `rg-clawcode` and service `Foundry Models`; Azure OpenAI/Foundry does not provide native hard budget stops, so alerts need automation if we want shutdown behavior.
6. Keep `clawcode-vm` deallocated except during active OpenClaw work; this does not reduce Foundry token spend but protects the same `$150/month` credit pool.

Cost hotfix applied locally on 2026-05-22 in `packages/claws-review-bot/dist/chunk-WEIWYJCG.js`:

- reasoning deployments default `max_completion_tokens` from `32000` to `6000`
- standard deployments default `max_completion_tokens` from `8000` to `3000`
- env overrides:
  - `AOAI_REASONING_MAX_COMPLETION_TOKENS`
  - `AOAI_STANDARD_MAX_COMPLETION_TOKENS`
- reviewer prompt now asks for concise output: blocking findings only, essential proof, no dismissed-role appendices/category inventories, target 1-3 findings and under 1,200 words
- `promptCacheKey` remains stable as `claws-lobster-architect-reviewer-v1`

## Sebby / OpenClaw Teams Dogfood

Last refreshed: 2026-05-22 17:55 PDT.

Sebby runs in WSL under isolated state:

- WSL distro: `Ubuntu-24.04`
- state dir: `/root/.openclaw-sebby`
- config: `/root/.openclaw-sebby/openclaw.json`
- workspace: `/root/src/sebby`
- agent id/name: `sebby` / `Sebby`
- gateway service: `openclaw-gateway.service`
- gateway port: `18789`
- Teams webhook: WSL port `3978`, path `/api/messages`

Teams app:

- name: `OpenClaw Teams SDK Review`
- app/bot id: `b5293084-e629-45d9-a830-947d5535babb`
- tenant: `3fkdcm.onmicrosoft.com`
- tenant id: `1a1b3577-b40e-4ab8-945c-4b8ee2bf9454`
- current quick tunnel endpoint: `https://calvin-roses-entertainment-phentermine.trycloudflare.com/api/messages`

Secrets are not stored in the repo. Current local secret files:

- Teams app secret env: `/root/.openclaw-sebby/secrets/msteams.env`
- Azure OpenAI env: `/root/.openclaw-sebby/secrets/azure-openai.env`
- gateway systemd drop-ins load both env files from `/root/.config/systemd/user/openclaw-gateway.service.d/`

Azure OpenAI / Microsoft Foundry config:

- Azure account: `clawcode-aoai`
- endpoint: `https://clawcode-aoai.cognitiveservices.azure.com`
- OpenClaw provider: `microsoft-foundry`
- Sebby default model: `microsoft-foundry/reviewer-gpt5-mini`
- lower-cost deployment alternatives available: `microsoft-foundry/coder` (`gpt-4.1-mini`)
- higher-cost deployment available: `microsoft-foundry/reviewer-gpt5`

Proof on 2026-05-22:

- `openclaw models --agent sebby status --json` resolved `microsoft-foundry/reviewer-gpt5-mini` with no missing providers.
- `openclaw gateway status --json --timeout 10000` reported service `running`, config audit OK, RPC OK.
- `openclaw agent --agent sebby --message "Reply with exactly AZURE_OK." --timeout 120 --json` completed with provider `microsoft-foundry`, model `reviewer-gpt5-mini`, reply `AZURE_OK`.
- `openclaw channels status --channel msteams --deep --probe --timeout 20000` reported the Teams provider configured and running.

Operational caveats:

- The Cloudflare quick tunnel is ephemeral. If the `cloudflared` process exits or the URL changes, update the Teams app endpoint with `teams app update <app-id> --endpoint <new-url>/api/messages`.
- The older Azure public endpoint `https://openclaw-teams-review.westus2.cloudapp.azure.com/api/messages` currently points at a deallocated VM and should not be assumed live.
- The local CLI device needed an operator scope upgrade after model/provider changes; paired device state now allows read/write/pairing/admin for the WSL CLI device.

Verification:

- `node --check packages/claws-review-bot/dist/chunk-WEIWYJCG.js` passed.
- `node --check packages/claws-review-bot/dist/cli.js` passed.

Packaging repair applied locally on 2026-05-22:

- added `packages/claws-review-bot/package.json`
- added `packages/claws-review-bot/package-lock.json` via `npm install`
- added `packages/claws-review-bot/Dockerfile`
- added `packages/claws-review-bot/.dockerignore`
- added the missing `packages/claws-review-bot/voice` prompt files required by `loadVoice`
- added `packages/claws-review-bot/infra/restore-containerapp-job.ps1`
- redacted `packages/claws-review-bot/infra/bot.parameters.json`

Packaging verification:

- `npm run check` passed in `packages/claws-review-bot`
- `npm run smoke` passed in `packages/claws-review-bot`
- `restore-containerapp-job.ps1` PowerShell parser check passed
- token-pattern check found no `gho_`, `ghp_`, or `github_pat_` value in `packages/claws-review-bot/infra/bot.parameters.json`

Cloud deployment remains blocked:

- Resolved on 2026-05-22 after billing/card/spending-limit propagation. ARM subscription state changed to `Enabled` and writes succeeded.
- Docker Desktop Linux daemon was not running locally, but `az acr build` worked and was used for cloud image builds.

Deployment repair on 2026-05-22:

- Live job `claws-review-bot-job` recovered to `Succeeded` with user-assigned identity, ACR registry identity, schedule `*/15 * * * *`, and image `clawsreviewbotacr.azurecr.io/claws-review-bot:13add525`.
- Built and pushed `clawsreviewbotacr.azurecr.io/claws-review-bot:cost-controls`.
- Added `GH_ENTERPRISE_TOKEN=secretref:ghe-pat`; `gh api --hostname microsoft.ghe.com` needed this for Enterprise auth.
- Built and pushed `cost-controls-r2` with one-shot poll failure propagation and an attempted `gh api --slurp` pagination fix.
- `cost-controls-r2` failed in the container because Debian `gh` 2.23 does not support `--slurp`.
- Built and pushed `cost-controls-r3`, removing `--paginate`/`--slurp` and relying on first-page `per_page=100` PR/comment/review queries.
- Updated `claws-review-bot-job` to image `clawsreviewbotacr.azurecr.io/claws-review-bot:cost-controls-r3`.
- Recovered TypeScript source from sourcemaps into `packages/claws-review-bot/src`, added package scripts/docs, rebuilt `dist` from source, and pushed source-built image `clawsreviewbotacr.azurecr.io/claws-review-bot:cost-controls-source`.
- Updated `claws-review-bot-job` to image `clawsreviewbotacr.azurecr.io/claws-review-bot:cost-controls-source`.
- Job env now includes:
  - `AOAI_REASONING_MAX_COMPLETION_TOKENS=6000`
  - `AOAI_STANDARD_MAX_COMPLETION_TOKENS=3000`
  - `GH_ENTERPRISE_TOKEN=secretref:ghe-pat`

Cloud verification:

- Manual execution `claws-review-bot-job-ybyirgs` on `cost-controls` started and exited, but failed Enterprise auth before `GH_ENTERPRISE_TOKEN` was added.
- Manual execution `claws-review-bot-job-v69i485` authenticated but hit concatenated paginated JSON parsing.
- Manual execution `claws-review-bot-job-5l25m1j` on `cost-controls-r2` failed because the container's `gh` lacks `--slurp`; this now fails the execution instead of silently succeeding.
- Manual execution `claws-review-bot-job-rrtm2rt` on `cost-controls-r3` listed PRs, skipped cached/approved PRs, called AOAI, and posted `bic/lobster#1272` comment `160668436`.
- AOAI usage from that proof: `prompt=17215 completion=5058 total=22273`, proving the reasoning completion cap is active (`5058 < 6000`).
- The manual proof execution and two overlapping scheduled executions were stopped afterward to avoid a review burst.
- Source package verification passed: `npm run check`, `npm run smoke`, and ACR build `chd` for `cost-controls-source`.
