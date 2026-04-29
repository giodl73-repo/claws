---
name: daemon-lifecycle
description: openclaw gateway daemon lifecycle — managed (launchd/systemd) vs unmanaged, restart/status/--deep semantics, config hot-reload, logs, footguns
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Daemon / gateway lifecycle

## What's the daemon

The "gateway" is OpenClaw's core runtime process — Node.js server
handling agent execution, channel routing, config management, RPC
control. **It is not always a daemon.** Two modes:

| Mode | Behavior |
|---|---|
| **Managed daemon** (macOS / Linux) | launchd LaunchAgent (macOS) or systemd user service (Linux) supervises a background process. Spawned by `openclaw gateway start` or the macOS app. Auto-restart on crash. |
| **Unmanaged / inline** | CLI commands needing RPC (`openclaw agent`, `openclaw message send`) start the gateway in-process. Lifetime tied to the command. No supervision. |

`AGENTS.md:177`: *"Mac gateway: use app or `openclaw gateway
restart/status --deep`; no ad-hoc tmux gateway."*

[`gateway.md`](gateway.md) covered the runtime; this spec covers the
lifecycle (start / stop / restart / status / logs).

Sources: `src/daemon/launchd.ts:172+`, `src/cli/daemon-cli/lifecycle.ts:152-162`,
`openclaw.mjs`, `src/gateway/server.ts`.

## `openclaw gateway` subcommand surface

CLI surface in `src/cli/daemon-cli/`, integrating with
`src/daemon/service.ts`.

| Subcommand | Function | Behavior |
|---|---|---|
| `start` | `runDaemonStart` (`lifecycle.ts:152-162`) | Loads + starts the managed service. macOS LaunchAgent recovery if unmanaged process exists. |
| `stop` | `runDaemonStop` (`lifecycle.ts:165-178`) | SIGTERM to managed service or to unmanaged process by PID. |
| `restart` | `runDaemonRestart` (`lifecycle.ts:186-314`) | Graceful restart via launchctl/systemctl, or SIGUSR1 to unmanaged gateway on configured port. Waits for health checks post-restart. Validates `commands.restart=false` config can block. |
| `status` / `status --deep` | `runDaemonStatus` (`status.ts`) | Health probe (RPC), service-loader state, port usage, config validity. `--deep` adds extra-process discovery. |
| `start --force` | (mentioned in help text) | Kills port-bound processes and starts fresh. |

`restart` recommends `status --deep` for diagnostics before retrying on
failure.

## macOS app integration

The macOS app (`apps/macos/Sources/OpenClaw/*.swift`) **does not embed
the gateway.** It spawns and manages the launchd-supervised daemon via
the OpenClaw CLI.

Flow:

1. User toggles "Local Gateway" in app settings or app launches.
2. `GatewayAutostartPolicy.shouldEnsureLaunchAgent()` evaluates: start if `mode = .local` and not paused.
3. App calls `openclaw gateway start` (via `Process` / XPC) to ensure LaunchAgent is loaded.
4. Subsequent app restarts or config changes go via RPC over the gateway WebSocket (`GatewayConnection.swift` — WebSocket actor with methods `.status`, `.configPatch`, etc.).
5. User can pause the gateway in app UI (RPC call or pause flag, not a hard stop).

**No tmux**, no ad-hoc spawning — all lifecycle is routed through
launchd.

## Process supervision

OpenClaw self-supervises **via the OS service manager**, not internal
restart loops.

### macOS launchd (`src/daemon/launchd-plist.ts:~170`)

```xml
<key>KeepAlive</key>
<true/>
<key>ThrottleInterval</key>
<integer>1</integer>
<key>RunAtLoad</key>
<true/>
```

LaunchAgent restarts a dead gateway after a 1-second throttle. User is
not responsible for manual restart.

### Linux systemd

`src/daemon/service.js` constants imply `Restart=always` + `RestartSec=1`.
Same posture.

## `status --deep` semantics

| Surface | Plain `status` | `status --deep` |
|---|---|---|
| RPC health probe | ✓ | ✓ |
| Service loader state (loaded?) | ✓ | ✓ |
| Port usage on configured port | ✓ | ✓ |
| Basic config validity | ✓ | ✓ |
| Extra/stale gateway-process discovery | — | ✓ (`findExtraGatewayServices`, `src/daemon/inspect.ts`) |
| Plugin states | — | ✓ |
| Session counts | — | ✓ (if RPC available) |
| Detailed port diagnostics (listeners, PIDs) | — | ✓ |
| Config audit | — | ✓ |

`--deep` is the troubleshooting/forensic mode. Use when plain status
returns "healthy" but something is off.

Cite: `src/cli/daemon-cli/status.gather.ts:471-479`.

## Logs

### macOS — `scripts/clawlog.sh`

| Aspect | Detail |
|---|---|
| Backend | macOS unified log (subsystem: `ai.openclaw`) |
| Tail command | `sudo log show` |
| Categories | `gateway`, `ServerManager`, `SessionService`, `voicewake`, `screenshot`, … |
| Filter | `-c <category>` |
| Default tail | 50 lines from past 5 min |
| Override | `-n 100` for count, `-f` for follow, `--all` for entire history |
| Export | `-o <file>` |
| Rotation | Managed by macOS unified logging (system-wide) |
| Sudo | Script offers to configure sudoers for `/usr/bin/log` if password required |

### Linux

No `clawlog.sh` equivalent documented. Logs go to `~/.openclaw/logs/`
or journalctl. Path resolution: `src/logging/log-file-path.ts`,
`src/daemon/restart-logs.ts`.

## Multiple gateways

**Design assumes one gateway per user session.** Port conflicts are
guarded but not negotiated.

- Default port from config (env override `OPENCLAW_GATEWAY_PORT`).
- `openclaw gateway status` checks port via `src/infra/gateway-processes.ts`.
- If port is bound by an unrecognized process → CLI warns/errors.
- **Multiple gateways on the same port are not supported.** Second start fails on bind.

No automatic port negotiation. User must stop the first gateway or use
a different port via env/config.

Cite: `src/infra/gateway-processes.ts`,
`src/cli/daemon-cli/lifecycle.ts:104-108`.

## Config hot-reload

Hybrid: hot-reload when safe, full restart when not.

`src/gateway/config-reload-plan.ts:46-100` defines reload rules per
config-path prefix:

| Path prefix | Kind | Effect |
|---|---|---|
| `gateway.channelHealthCheckMinutes` | `hot` | Live patch — preserves sessions. |
| (most channel/agent/hook paths) | `hot` | Live patch. |
| `models.pricing` | `restart` | SIGUSR1, full restart. |
| (plugin loading, core paths) | `restart` | Full restart. |

Flow:

1. Gateway file-watches `~/.openclaw/config.json`.
2. On change: parse delta, classify by reload kind.
3. If `hot`: apply via `src/gateway/server-reload-handlers.ts`. Logged "config hot reload applied."
4. If `restart`: trigger SIGUSR1 → graceful restart.
5. If validation fails (bad JSON5 etc.): change rejected; config does not advance until user fixes.

Test coverage: `src/gateway/config-reload.test.ts`.

## Footguns

1. **No ad-hoc tmux gateway.** From `AGENTS.md:177`. If you spawn the gateway via tmux / shell script / any ad-hoc process manager:
   - LaunchAgent supervision bypassed → crash leaves no daemon.
   - `restart` won't work — looks for managed service or sends SIGUSR1 to a known port; ad-hoc processes are invisible.
   - Config hot-reload doesn't fire — out-of-band gateway isn't subscribed to the config watcher.
   - Multiple ad-hoc sessions can collide on port.
   **Always** use `openclaw gateway start` (installs LaunchAgent on first run) or let the macOS app manage it.
2. **`commands.restart: false` blocks the restart subcommand.** Set deliberately for environments where a wedge restart could cause harm.
3. **`status --deep` is expensive.** Process tree scans are slow. Don't poll on `--deep`.
4. **Linux logs are less standardized.** No `clawlog.sh` equivalent — operators need to know where logs land. Document per-deployment.
5. **Port conflicts fail loudly only on `start`.** Existing bound process from another tool surfaces as an opaque bind error. `status --deep` will identify; default `status` may not.

## Files I'd link from any daemon PR

1. `src/cli/daemon-cli/lifecycle.ts:152-314` — start/stop/restart.
2. `src/daemon/launchd.ts` + `src/daemon/launchd-plist.ts` — macOS service.
3. `src/gateway/config-reload-plan.ts:46-100` — hot-reload rules.
4. `src/gateway/server-reload-handlers.ts` — apply hot reload.
5. `scripts/clawlog.sh` — macOS log access.
6. `src/agents/tools/gateway-tool.ts` — agent-callable `gateway restart`.
7. `apps/macos/Sources/OpenClaw/GatewayAutostartPolicy.swift` — autostart logic.

## Read next

- [`gateway.md`](gateway.md) — runtime side; this spec covered the *lifecycle*.
- [`cli.md`](cli.md) — `openclaw gateway` subcommand registration.
- [`apps-and-swabble.md`](apps-and-swabble.md) (pending) — macOS app + mobile companions.
