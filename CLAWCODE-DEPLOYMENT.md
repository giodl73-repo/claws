# ClawCode deployment — handoff

A live OpenClaw harness ("ClawCode" technique from `galiniliev/ClawCode`) is deployed in a personal Azure VM. This file is the pointer for any Claude session in this repo that needs to operate, debug, or extend that deployment.

## What's deployed

| Layer                 | Detail                                                                                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Azure subscription    | `Visual Studio Enterprise Subscription` (id `148f5576-7098-45db-8258-76228e82ffdd`, tenant `d38cd9ac-c87b-4951-a895-1641af19db40`, account `giodl25@hotmail.com`)                             |
| Resource group        | `rg-clawcode`                                                                                                                                                                                 |
| VM                    | `clawcode-vm`, Ubuntu 24.04, `Standard_D2s_v5`, region `westus2`, public IP **`4.154.18.35`**                                                                                                 |
| SSH                   | key auth only, key at `~/.ssh/id_rsa` on the Windows host; admin user `azureuser`; NSG opens port 22 to `*`                                                                                   |
| OpenClaw checkout     | `~/openclaw` on the VM, fork `giodl73-repo/openclaw`, branch `substrate/policy` (5 substrate packages: oc-paths, pinch, oc-doctor, lkg, policy)                                               |
| Gateway               | systemd user service `openclaw-gateway.service`, version `2026.5.5`, bind `loopback` on `127.0.0.1:18789`, mode `local`, auth token in `~/.openclaw/openclaw.json` under `gateway.auth.token` |
| Workspace             | `~/.openclaw/workspace/` — `AGENTS.md`, `SOUL.md`, `IDENTITY.md` from ClawCode repo merged with OpenClaw defaults                                                                             |
| Worktree root         | `~/worktrees/` (per-issue worktrees go here)                                                                                                                                                  |
| Channel               | Telegram bot `@SebastianClaw22Bot` (id `8708834350`); group `ClawCode` (id `-1003587100153`); allowlisted user `8676892821` (Gio Della-Libera)                                                |
| Model provider        | Microsoft Foundry / Azure OpenAI                                                                                                                                                              |
| AI Foundry resource   | `clawcode-aoai` (kind `AIServices`) in `rg-clawcode`, region **`eastus2`** (westus2 has no OpenAI models), endpoint `https://clawcode-aoai.cognitiveservices.azure.com`                       |
| Deployment            | `coder` → `gpt-4.1-mini` v=2025-04-14, GlobalStandard SKU, 100K TPM (gpt-5.x/codex models have zero default quota — would need a quota request)                                               |
| Auth to model         | API key via env var `AZURE_OPENAI_API_KEY` in systemd drop-in (`~/.config/systemd/user/openclaw-gateway.service.d/secrets.conf`)                                                              |
| Target repo for agent | `giodl73-repo/clawcode-sandbox` (public TS project with deliberate `sum() returns a-b` bug, issue #1 labeled `agent-fix`)                                                                     |
| gh auth on VM         | logged in as `giodl73-repo` (token forwarded from Windows host); git identity `ClawCode Agent (giodl73-repo) <giodl25@hotmail.com>`                                                           |
| Bootstrap prompts     | `~/clawcode-prompts/05-09-*.md` on VM (already customized: `08-prompt-setup-cron-polling.md` points at `giodl73-repo/clawcode-sandbox` and group `-1003587100153`)                            |

## Where the secrets live

Not committed anywhere. They're in three places:

- Telegram bot token, AOAI endpoint, AOAI API key: systemd drop-in at `~/.config/systemd/user/openclaw-gateway.service.d/secrets.conf` on the VM (mode `0600`)
- Same plus gateway auth token: `~/.openclaw/openclaw.json` on the VM
- Bot token also in `~/.bashrc` on the VM (legacy from setup; can be removed)

Rotate via:

- Bot token: BotFather `/revoke` → update VM
- AOAI key: `az cognitiveservices account keys regenerate -g rg-clawcode -n clawcode-aoai --key-name key1`

## Common operations

```bash
# SSH in
ssh azureuser@4.154.18.35

# Gateway
systemctl --user status openclaw-gateway.service
systemctl --user restart openclaw-gateway.service
journalctl --user -u openclaw-gateway.service -f

# Re-validate config
cd ~/openclaw && pnpm openclaw doctor

# Pause cost (drops VM to ~$3/mo, storage only)
# Run from Windows host, not on the VM:
az vm deallocate -g rg-clawcode -n clawcode-vm
az vm start      -g rg-clawcode -n clawcode-vm

# Tear down completely
az group delete -n rg-clawcode --yes
```

## Connecting local OpenClaw work to the deployed gateway

The deployed gateway binds loopback only (`127.0.0.1:18789`). To talk to it from your Windows host (where this repo lives), open an SSH tunnel:

```bash
# In a dedicated terminal, leave running:
ssh -N -L 18789:127.0.0.1:18789 azureuser@4.154.18.35
```

Then `ws://127.0.0.1:18789/` on Windows reaches the remote gateway. Pair the auth token from `~/.openclaw/openclaw.json` (`gateway.auth.token`) on the VM with whatever local client you use.

## Pasteable prompt for a fresh Claude session in this repo

Paste this into a new Claude Code session inside `C:\src\claws` if you want it to operate the live deployment described above:

> I'm working in `C:\src\claws`. There's a live OpenClaw / ClawCode deployment in Azure that I want you to be able to operate from here. The full handoff is in `CLAWCODE-DEPLOYMENT.md` at the repo root — read it first. Key facts: Azure VM at `4.154.18.35` (admin `azureuser`, key `~/.ssh/id_rsa`), running OpenClaw fork `giodl73-repo/openclaw#substrate/policy` with the gateway as a systemd user service. Telegram channel is `@SebastianClaw22Bot` in supergroup `-1003587100153` (allowlisted user `8676892821`). Model provider is Microsoft Foundry / Azure OpenAI deployment `coder` (`gpt-4.1-mini`) at `https://clawcode-aoai.cognitiveservices.azure.com` in resource group `rg-clawcode`. Target repo for agent runs is `giodl73-repo/clawcode-sandbox`. Personal Azure sub is `148f5576-7098-45db-8258-76228e82ffdd`; switch to it with `az account set --subscription 148f5576-7098-45db-8258-76228e82ffdd`. Don't put any of these on Microsoft corp infra — this is the personal-tenant blast radius.

## Source of truth

Authoritative state lives on the VM, not in this file. If anything here drifts (region, version, model, IDs), prefer what the VM reports over what this doc claims.
