---
name: sandbox
description: openclaw sandbox model — three Dockerfile variants, Docker vs Podman setup, mode/scope/workspaceAccess config, runtime exec-target decision, browser sandbox specifics
type: skunkworks-spec
applies_to: openclaw-core
source_version: HEAD 5e8cc1d9c (audit baseline)
authored: 2026-04-28
---

# Sandbox model

## What's sandboxed

The sandbox protects the host gateway from **plugin code execution**
and **tool execution**. Three categories with different policies:

| Category | Sandbox policy |
|---|---|
| **Agent code** (openclaw's own logic in `src/agents/`) | runs on host gateway. Sandbox is a runtime concern, not a loader concern. |
| **Tool execution** (`bash`, fetch, file I/O) | per-tool policy via `tools.sandbox.tools.allow|deny|alsoAllow` at agent or global scope. When `agents.defaults.sandbox.mode` enabled, tools marked for sandbox run in isolated Docker containers. |
| **Plugin code** | runs on host via plugin SDK. Sandboxing **not applicable** — plugins are trusted extensions. |

The decision is **runtime, not load time**. `resolveExecTarget()` in
`bash-tools.exec-runtime.ts:235-282` decides per-invocation whether a
tool runs in the sandbox vs the host based on config + request +
elevation flag + sandbox availability.

Confirmed in [`plugin-loader.md`](plugin-loader.md): *"Sandboxing is a
runtime concern, not a loader concern."*

## The three Dockerfile variants

### `Dockerfile.sandbox` — minimal base (24 lines)

| | |
|---|---|
| Base | `debian:bookworm-slim` |
| Packages | `bash`, `ca-certificates`, `curl`, `git`, `jq`, `python3`, `ripgrep` |
| User | unprivileged `sandbox` (non-root) |
| Default cmd | `sleep infinity` (idle, awaiting `docker exec`) |
| Excluded | development tools, browsers |

### `Dockerfile.sandbox-common` — dev-rich layer (48 lines)

Builds on top of any base (defaults to `openclaw-sandbox:bookworm-slim`).
Conditional via build args:

| Always | Conditional |
|---|---|
| `bash`, `curl`, `wget`, `jq`, `coreutils`, `grep`, `git`, `ca-certificates`, `build-essential`, `file`, `pkg-config`, `golang-go`, `rustc`, `cargo`, `nodejs`, `npm`, `python3` + dev headers, `libasound2-dev` | `INSTALL_PNPM=1` (default true) → npm + pnpm; `INSTALL_BUN=1` (default true) → Bun; `INSTALL_BREW=1` (default true) → Homebrew for Linux at `/home/linuxbrew/.linuxbrew` |

PATH prepends: `$BUN_INSTALL_DIR/bin`, `$BREW_INSTALL_DIR/bin`,
`$BREW_INSTALL_DIR/sbin`. Final user `${FINAL_USER}` (default `sandbox`).

Use case: default sandbox for tool execution needing package managers
+ compilers.

### `Dockerfile.sandbox-browser` — browser-augmented (36 lines)

Adds X11 graphics stack:

| | |
|---|---|
| Base | `debian:bookworm-slim` (same SHA as `sandbox`) |
| Extras | `chromium`, `fonts-liberation`, `fonts-noto-cjk`, `fonts-noto-color-emoji`, `xvfb`, `x11vnc`, `websockify`, `novnc`, `socat` |
| Ports | **9222** (CDP), **5900** (VNC), **6080** (noVNC web UI) |
| Entrypoint | `sandbox-browser-entrypoint.sh` (210 LOC) |

Use case: `target: sandbox` browser tool ([`extension-pattern-tool.md`](extension-pattern-tool.md)).

## `setup-podman.sh` + `docker-setup.sh` — both required, different runtimes

**Both are needed**, not alternatives — they serve different container
engines and user contexts.

### `docker-setup.sh` (~682 LOC)

Docker Desktop / system Docker integration for macOS / Windows / Linux.

What it does:

1. Validates Docker CLI (`docker compose version`).
2. Resolves Docker socket path (default `/var/run/docker.sock` or `$DOCKER_HOST`).
3. Detects Docker socket GID for sandbox group membership.
4. Builds/pulls image (default `openclaw:local` with `pnpm build`).
5. Bind-mount perms: chowns config + workspace dirs to container `node` (uid 1000).
6. Pins gateway to local mode, seeded Bonjour/mDNS state, gateway token.
7. Onboards agent config: `agents.defaults.sandbox.mode "off"` baseline.
8. **If `OPENCLAW_SANDBOX=1`:**
   - Builds `openclaw-sandbox:bookworm-slim` from `Dockerfile.sandbox`.
   - Verifies Docker CLI inside container.
   - Generates `docker-compose.sandbox.yml` overlay mounting `/var/run/docker.sock`.
   - Adds Docker group to container (`group_add: ["$DOCKER_GID"]`).
   - Sets config: `mode "non-main"`, `scope "agent"`, `workspaceAccess "none"`.
   - Restarts gateway with overlay.
   - **Rollback on failure** — reverts to `mode "off"` if config write fails (defense in depth).

### `setup-podman.sh` (~459 LOC)

Rootless Podman for unprivileged users.

| Step | Behavior |
|---|---|
| Enforce non-root | Errors if `id -u` == 0 |
| Resolve home + dirs | Validates no symlinks, no relative segments, no colons in mount sources (Podman parser strict) |
| Build/pull | User Podman store `~/.local/share/containers/` |
| Env file | `~/.openclaw/.env` (mode 600) with token + container name |
| Config seed | `~/.openclaw/openclaw.json` with `gateway.mode: local`, `controlUi.allowedOrigins` |
| Quadlet (optional, `--quadlet` or `OPENCLAW_PODMAN_QUADLET=1`) | Generates systemd user service in `~/.config/containers/systemd/openclaw.container`. `systemctl --user start/enable openclaw.service` for boot persistence + daemon mode. Linux + systemd only. |

**No sandbox setup in this script.** Deferred to runtime via
`OPENCLAW_SANDBOX` env if needed.

Pick by runtime + privilege model: Docker Desktop (macOS/Windows) or
system Docker on Linux; Podman for rootless Linux + Docker-API-compat
deployments.

## `agents.defaults.sandbox.mode` config

| Mode | Behavior | Sandbox available |
|---|---|---|
| `"off"` | Disable. Tools run on gateway host. | no |
| `"non-main"` | Sandbox all agents *except* `main`. | yes |
| `"all"` | Sandbox **all** agents including `main`. | yes |

`"auto"` is **not a valid value here.** Auto-selection lives in
`tools.exec.host` instead — see *Sandbox vs host decision*.

Related fields:

| Field | Values | Default | Purpose |
|---|---|---|---|
| `agents.defaults.sandbox.scope` | `"session"` / `"agent"` / `"shared"` | `"session"` | Container per-session vs per-agent vs shared. |
| `agents.defaults.sandbox.workspaceAccess` | `"none"` / `"ro"` / `"rw"` | `"none"` | Workspace mount mode. |

Per-agent overrides at `agents.list[].sandbox.{mode, scope, workspaceAccess}`.

## Sandbox-vs-host decision flow

`resolveExecTarget()` (`bash-tools.exec-runtime.ts:235-282`) per
invocation:

```
inputs:  configuredTarget (from config)
         requestedTarget  (from tool call)
         elevatedRequested
         sandboxAvailable

1. requestedTarget vs config policy
   ├── conflict → throw with allowed values
   └── ok → continue
2. selectedTarget = requestedTarget ?? configuredTarget
3. elevation:
   - elevated + selectedTarget="node" → nodeTarget
   - elevatedTarget → "gateway"
4. effectiveHost = (selectedTarget == "auto")
                 ? (sandboxAvailable ? "sandbox" : "gateway")
                 : selectedTarget
```

Output: `{ configuredTarget, selectedTarget, effectiveHost }`.

Config precedence:

- `tools.exec.host` (default `"auto"`) per-tool default.
- Tool invocation can request override (`host="gateway"` etc.).
- `agents.defaults.sandbox.mode` gates sandbox availability — `"off"` makes sandbox unavailable; `auto` falls back to gateway.
- Elevation forces gateway/node, never sandbox.

Example: config `tools.exec.host = "auto"`,
`agents.defaults.sandbox.mode = "non-main"`, sandbox available. A tool
call requesting `host="sandbox"` is allowed. A tool call requesting
`host="gateway"` is **denied** (config says auto + sandbox available;
explicit gateway not allowed when sandbox enabled).

Cite: `bash-tools.exec-runtime.ts:215-233` (`isRequestedExecTargetAllowed`),
`:235-282` (`resolveExecTarget`).

## Communication channel — stdio, not RPC

**Plain subprocess stdio.** Not HTTP, not named pipes.

```
host gateway
   │
   ▼ child_process.spawn() (docker.ts:73)
docker exec -i <container> /bin/sh -lc "<command>"
   │
   ▼ stdin / stdout / stderr captured (docker.ts:74-103)
buffers accumulated → concat → return on exit
```

Synchronous request-response. Simple, robust, fits the exec-tool model.
No persistent connection or polling.

Cite: `docker.ts:1-162` — `execDockerRaw`, spawn at `:73`, stdio pipes
at `:74-103`.

## Filesystem boundary

Mounts via `docker run -v` / `appendWorkspaceMountArgs()` (`docker.ts:495-501`,
`workspace-mounts.ts`):

| Path | Mode | Purpose | Default | Override |
|---|---|---|---|---|
| `/workspace` | depends on `workspaceAccess` | Tool/agent workspace | mounted (unless `workspaceAccess="none"`) | `agents.defaults.sandbox.docker.binds` |
| `/agent` | ro if `workspaceAccess="ro"` | Agent-specific subdirectory | mounted unless `workspaceAccess != "rw"` | `agents.defaults.sandbox.docker.bindSourceRoots` |
| `/` (rootfs) | **read-only** if `readOnlyRoot=true` | Container root | immutable (default) | `agents.defaults.sandbox.docker.readOnlyRoot` |
| tmpfs | rw in-memory | Scratch (`/tmp`, `/dev/shm`) | per `docker.tmpfs` | `agents.defaults.sandbox.docker.tmpfs` |

Read-only enforced via `--read-only` (`docker.ts:392`); tmpfs entries
overlay writable scratch mounts.

`validate-sandbox-security.ts` rejects binds targeting reserved paths
(`/workspace`, `/agent`) or sources outside workspace roots — unless
explicit override flags (`dangerouslyAllowExternalBindSources`,
`dangerouslyAllowReservedContainerTargets`).

## Network boundary

`agents.defaults.sandbox.docker.network` (`docker.ts:397-398`):

| Value | Meaning |
|---|---|
| `"bridge"` (default) | Standard Docker bridge. Reachable to host via `host.docker.internal`. |
| `"none"` | No network interface. Filesystem I/O only. |
| custom name | User-defined Docker network. |

**Outbound restrictions are implicit.** No automatic blocklist of model
provider endpoints. Operator's responsibility:

- Set `tools.sandbox.tools.deny` to block fetch/web tools for untrusted code.
- `tools.fs.workspaceOnly=true` to lock filesystem access.
- Restrict via Docker daemon / host firewall for multi-tenant.

DNS/extra-hosts knobs: `agents.defaults.sandbox.docker.dns` +
`extraHosts`.

Cite: `types.sandbox.ts:14-16`, `docker.ts:397-430`, `docker-setup.sh:614`.

## Browser sandbox specifics

From `Dockerfile.sandbox-browser` + `sandbox-browser-entrypoint.sh`.

Added components:

| | Purpose |
|---|---|
| Chromium | Debian package |
| Xvfb | Virtual framebuffer at `DISPLAY=:1` (`Xvfb :1 -screen 0 1280x800x24`) |
| x11vnc | RFB protocol on port 5900 |
| noVNC | WebSocket bridge to web UI on port 6080 |
| socat | Relay CDP from `127.0.0.1:9223` → `0.0.0.0:9222` (if `OPENCLAW_BROWSER_CDP_SOURCE_RANGE` set) |
| Fonts | Liberation, Noto CJK, Noto Color Emoji |

Entrypoint (`sandbox-browser-entrypoint.sh`, 210 LOC):

1. Launch Xvfb.
2. Launch Chromium with:
   - `--remote-debugging-address=127.0.0.1 --remote-debugging-port=9223` (CDP)
   - `--no-first-run --no-default-browser-check --disable-dev-shm-usage`
   - `--disable-gpu --disable-3d-apis` (default; override `OPENCLAW_BROWSER_DISABLE_GRAPHICS_FLAGS=0`)
   - `--renderer-process-limit=2`
   - Optional `--headless=new` if `OPENCLAW_BROWSER_HEADLESS=1`
   - Optional `--no-sandbox --disable-setuid-sandbox` if `OPENCLAW_BROWSER_NO_SANDBOX=1` **(dangerous; legacy only)**
3. Wait for CDP ready (probe `http://127.0.0.1:9223/json/version`, 12s default).
4. Launch socat if `CDP_SOURCE_RANGE` set.
5. Launch x11vnc + websockify if not headless.
6. `wait -n` monitors all subprocesses; restart on exit.

Browser config knobs at `agents.defaults.sandbox.browser.*`:

| Key | Default |
|---|---|
| `image` | `openclaw-sandbox-browser:bookworm-slim` |
| `cdpPort` / `vncPort` / `noVncPort` | port mapping |
| `cdpSourceRange` | CIDR for socat relay (e.g., `172.21.0.1/32` for bridge gateway) |
| `headless` | bool |
| `enableNoVnc` | true |
| `allowHostControl` | false (target host browser instead of sandbox) |
| `autoStart` | true |

## Trust + diagnostic events

Sandbox-emitted events are **untrusted** at the gateway boundary, per
[`trust-and-redaction.md`](trust-and-redaction.md).

```
container exits → docker exec returns stdout/stderr/code
emitExecProcessCompleted() (bash-tools.exec-runtime.ts:180-205)
   logs diagnostic event with target: "sandbox" or "host"
gateway event sink (server-node-events.ts) tags as trusted: false
audit/redaction code treats sandbox-sourced data as low-trust
```

The `trusted: false` boundary blocks sandbox events from reaching trace-
context propagation (the WeakSet anti-spoof in
[`diagnostic-event-stream.md`](diagnostic-event-stream.md)). Filesystem
paths and env vars from sandbox must not leak credentials.

## Footguns

| Footgun | Symptom | Fix |
|---|---|---|
| `host="sandbox"` request when `mode="off"` | tool call rejected: *"exec host not allowed (requested sandbox; configured host is gateway)"* | set `mode "non-main"` or `"all"` |
| Docker socket not mounted, `mode="non-main"` | `docker: not found` or `Cannot connect to Docker daemon` | enable `OPENCLAW_SANDBOX=1` in docker-setup, mount socket via compose overlay |
| `workspaceAccess="rw"` + untrusted tool | untrusted code overwrites workspace files | `workspaceAccess="ro"` or `"none"`; explicit `tools.sandbox.tools.deny` |
| Network unrestricted; sandbox can exfil | no built-in egress filter | host firewall, or `docker.network="none"` |
| `readOnlyRoot=false` allows `/etc/passwd` writes | container modifies system config | keep default `readOnlyRoot=true` |
| Custom binds target `/workspace` w/o override | config validator rejects mount | set `dangerouslyAllowReservedContainerTargets=true` only if intentional, document why |
| Agent in sandbox calls host-only tools | isolation crossed | sandbox is for *tool* execution, not agent isolation. Different trust model needed for full agent isolation. |

## Files I'd link from any sandbox PR

1. `Dockerfile.sandbox`, `Dockerfile.sandbox-common`, `Dockerfile.sandbox-browser` — image definitions.
2. `scripts/docker/setup.sh` — Docker integration + sandbox init.
3. `scripts/podman/setup.sh` — rootless Podman + Quadlet.
4. `src/agents/bash-tools.exec-runtime.ts:235-282` — `resolveExecTarget()`.
5. `src/agents/sandbox/docker.ts:1-511` — container lifecycle, stdio, mounts.
6. `src/config/types.sandbox.ts` — config schema.
7. `sandbox-browser-entrypoint.sh` — browser sandbox entrypoint.

## Read next

- [`extension-pattern-tool.md`](extension-pattern-tool.md) — browser tool's sandbox/host/node targets.
- [`trust-and-redaction.md`](trust-and-redaction.md) — sandbox-event trust handling.
- [`plugin-loader.md`](plugin-loader.md) — sandbox boundary section (loader is *not* a sandbox enforcer).
