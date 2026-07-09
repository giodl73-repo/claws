# Running Scout Against A Local OpenClaw Gateway

Source: Lorant's 2026-06-26 guide for dev / E2E testing Scout against a local
OpenClaw gateway.

This runbook explains how to point a Scout dev build at a local OpenClaw
gateway instead of the production Lobster runtime, so gateway node-tier features
such as `system.run`, the `exec.approval` card, node pairing, and related
flows can be tested end to end.

This recipe is for the no-auth / token local gateway. The production AAD /
Lobster path remains the default and needs no setup. The dev build is
non-destructive to installed production Scout because it runs on its own
channel data directory, identity, and single-instance lock.

The important thing to remember: four independent settings must line up.
Miss any one of URL, auth mode, shared token, or environment propagation and the
failure often appears as a confusing `401` or `gateway token mismatch`.

## TL;DR

1. Start the local gateway in token-auth loopback mode and note its token.
2. Confirm `system.run` and `system.run.prepare` are allow-listed.
3. Flip the dev build gateway credential to `no-auth` in `m-gateway-auth.json`
   after backing up the existing file.
4. Launch through a `.cmd` wrapper that sets `OPENCLAW_GATEWAY_URL`,
   `OPENCLAW_GATEWAY_URL_AAD`, and `OPENCLAW_GATEWAY_TOKEN`. Inline PowerShell
   `$env:` assignments in detached launches do not propagate reliably.
5. Verify the log shows `role=node`, `authToken=absent`, and
   `node connection ready`.
6. Restore credential backups when done.

## 0. Prerequisites: Local Gateway

Start a local OpenClaw gateway in token-auth mode:

```powershell
node <openclaw-checkout>\openclaw.mjs gateway run --port 18789 --bind loopback
```

Its config lives at `~/.openclaw/openclaw.json`. Confirm:

```jsonc
{
  "gateway": {
    "auth": { "mode": "token", "token": "<GATEWAY_TOKEN>" },
    "nodes": { "allowCommands": ["system.run", "system.run.prepare"] },
    "bind": "loopback"
  }
}
```

Check these values:

- `auth.token`: copy this exact shared secret into the Scout launch env.
- `nodes.allowCommands`: must include the command being tested, such as
  `system.run`. If the node declares a command that the gateway does not
  allow-list, the gateway rejects it.
- Endpoint: use the bare websocket endpoint, for example
  `ws://localhost:18789`. Do not use `/v1/openclaw-gateway` for this
  windows-node-style local gateway.

Scout's own local default is `ws://localhost:8001/v1/openclaw-gateway`, so the
URL override is mandatory.

Sanity check:

```powershell
Test-NetConnection 127.0.0.1 -Port 18789
```

## 1. Environment Overrides

Resolved in `electron/backend/create-backend.ts`:

| Env var | Overrides | Default |
| --- | --- | --- |
| `OPENCLAW_GATEWAY_URL` | no-auth gateway URL | `ws://localhost:8001/v1/openclaw-gateway` |
| `OPENCLAW_GATEWAY_URL_AAD` | AAD gateway URL | production Lobster `/v1/openclaw-gateway` |
| `OPENCLAW_GATEWAY_TOKEN` | shared gateway token | `aether-internal-gateway-token` |

For a local token-auth gateway on port `18789`, set all three:

```text
OPENCLAW_GATEWAY_URL=ws://localhost:18789
OPENCLAW_GATEWAY_URL_AAD=ws://localhost:18789
OPENCLAW_GATEWAY_TOKEN=<GATEWAY_TOKEN>
```

Set `OPENCLAW_GATEWAY_URL_AAD` too. If the build briefly tries an AAD connect,
it still points at localhost rather than production.

## 2. Auth Mode Gotcha

Gateway auth mode is persisted credential state, not an env var. It lives at:

```text
<channel-data-dir>/m-gateway-auth.json
```

`<channel-data-dir>` comes from `getAppDataDir()` in `electron/app-paths.ts`:

- dev build: `~/.scout-dev`
- cloud build: `~/.scout-cloud`

Cloud outranks dev. An unpackaged cloud profile can use `~/.scout-cloud` even
when Electron user data says `.scout-dev`.

If the credential mode is `aad`, the build connects to the production AAD URL,
or sends an AAD weave token to the local gateway and gets
`gateway token mismatch`. For local token gateway testing, force `no-auth` so
the build sends the shared token:

```jsonc
{
  "mode": "no-auth",
  "roleMode": "operator-and-node",
  "nodeName": "local-gw-test"
}
```

Back up existing credentials first. If unsure which channel the build uses,
set both:

```powershell
foreach ($d in '.scout-dev','.scout-cloud') {
  $f = "$env:USERPROFILE\$d\m-gateway-auth.json"
  if (Test-Path $f) { Copy-Item $f "$f.aad-backup" -Force }
  '{"mode":"no-auth","roleMode":"operator-and-node","nodeName":"local-gw-test"}' |
    Set-Content -Path $f -Encoding utf8 -NoNewline
}
```

To identify the channel actually used, grep the launch log for:

```text
DEV MODE - isolated userData:
```

## 3. Launch Via `.cmd`

`scripts/launch-electron.cjs` inherits `process.env`, but inline PowerShell
assignments such as `$env:VAR='...'; node ...` do not reliably propagate through
detached launches. Use a `.cmd` wrapper so `set` runs in the same process that
spawns Node.

Create `launch-scout-local.cmd` outside the repo, for example in a scratch dir:

```bat
@echo off
cd /d <path-to-your-m-checkout>
set OPENCLAW_GATEWAY_URL=ws://localhost:18789
set OPENCLAW_GATEWAY_URL_AAD=ws://localhost:18789
set OPENCLAW_GATEWAY_TOKEN=<GATEWAY_TOKEN>
echo PRELAUNCH OPENCLAW_GATEWAY_URL=%OPENCLAW_GATEWAY_URL%
node scripts/launch-electron.cjs --remote-debugging-port=9223
```

Build artifacts once:

```powershell
pnpm run prebuild
pnpm exec vite build
```

If `prebuild:skills` hangs, see troubleshooting below.

Run the wrapper and tee the log:

```powershell
cmd /c <scratch>\launch-scout-local.cmd *>&1 |
  Tee-Object -FilePath <scratch>\scout-local.log
```

CDP port `9223` is optional and only needed for attaching tooling. Avoid
`9222` if production Scout is already using it:

```powershell
Get-NetTCPConnection -LocalPort 9222
```

Separate CDP port plus the separate `.scout-dev` channel lets the dev build
coexist with production Scout without identity or single-instance collision.

## 4. Verify The Connection

Success in the launch log looks like:

```text
[GatewayBackend] init() ... url=ws://localhost:18789 authToken=absent
[GatewayWsClient] connecting role=operator url=ws://localhost:18789 authToken=absent
[GatewayWsClient] connecting role=node     url=ws://localhost:18789 authToken=absent
[GatewayWsClient] <- event node.pair.requested ...
[GatewayNodeBackend] node connection ready
[GatewayNodeBackend] node.presence.alive (connect) -> persisted
```

Health checklist:

- `authToken=absent`, not `authToken=present`
- URL is `ws://localhost:18789`, not `:8001` and not production Lobster
- zero occurrences of `token mismatch`, `Connect rejected`, `status=401`, or
  `mode=aad`
- exactly one `node connection ready`

If the sign-in card appears with `401` or `gateway token mismatch`, the
no-auth auto-connect failed. Recheck env overrides, credential mode, and launch
wrapper propagation.

## 5. Cleanup / Restore

Restore AAD credentials:

```powershell
foreach ($d in '.scout-dev','.scout-cloud') {
  $f = "$env:USERPROFILE\$d\m-gateway-auth.json"
  if (Test-Path "$f.aad-backup") { Move-Item "$f.aad-backup" $f -Force }
}
```

Remove user-scope env vars if you used that approach instead of the `.cmd`:

```powershell
[Environment]::SetEnvironmentVariable('OPENCLAW_GATEWAY_URL', $null, 'User')
[Environment]::SetEnvironmentVariable('OPENCLAW_GATEWAY_URL_AAD', $null, 'User')
```

Kill the dev build by process name `electron`. Production Scout is
`Microsoft Scout.exe`; leave it alone.

```powershell
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
```

## Failure Quick Reference

| Symptom | Cause | Fix |
| --- | --- | --- |
| `url=wss://lobster...prod...` and `401` | AAD mode or WAM auto-signed-in M365 | Set credential `no-auth`; point `OPENCLAW_GATEWAY_URL_AAD` at localhost |
| `url=ws://localhost:8001` and `ECONNREFUSED` | Env override did not reach Electron | Launch via `.cmd`, not inline `$env:` |
| `gateway token mismatch (provide gateway auth token)` | Wrong or missing shared token, or still in AAD mode | Set `OPENCLAW_GATEWAY_TOKEN` to gateway `auth.token`; ensure `no-auth` |
| Command runs but gateway rejects invoke | Command not allow-listed | Add command to `gateway.nodes.allowCommands` |
| Mixed AAD/no-auth log | Stale overlapping launches sharing a log | Kill all `electron` and launcher processes, use a fresh log, relaunch |

## Troubleshooting

- `prebuild:skills` can hang at `Need to install the following packages:
  skills@...` because `npx` is waiting for interactive confirmation. For a quick
  dev launch, skip it and run:

  ```powershell
  node scripts/fix-keytar-arch.mjs
  node scripts/prepare-bundled-node.mjs
  pnpm exec vite build
  ```

- Driving `exec.approval` from Scout's own composer also requires the composer
  session-rebind fix, tracked around `#3738`. Without that fix, sending from
  the composer can no-op. Drive the `exec host=node` request from an operator or
  cloud path instead; it renders the same card in Scout.

## Reference

- URL/token resolution: `electron/backend/create-backend.ts`
- Channel data dir: `electron/app-paths.ts` (`getAppDataDir`)
- Gateway auth credential store: `electron/auth/gateway-auth-store.ts`
- Local-vs-remote URL classification: `electron/backend/gateway/local-detect.ts`
- Launcher: `scripts/launch-electron.cjs`
- Gateway URL env hint on 403: `electron/backend/gateway/ws-client.ts`
