# Kill Switch

<!-- atom:kill-switch (C17) -->

> **Status: Design** -- this guide describes planned functionality.
> Implementation has not started. See `design/claws/CLAUDE.md` for current status.

The agent is exfiltrating data. The Gateway is compromised. Your governance
plugin is not responding. You need everything stopped, right now, and it
needs to work when the normal control plane is down.

`claws kill` has three paths. At least one works in every failure scenario.

## Three kill paths

```
Path 1: KILL file       Filesystem level    Works when Gateway is hung
Path 2: OS signal       Process level       Works when filesystem is slow
Path 3: Sidecar         External process    Works when Gateway is compromised
```

All three produce the same result: every `before_tool_call` handler
immediately returns `{ block: true }`. The agent cannot execute any tool.
The audit chain records the kill.

### Path 1: KILL file

The governance plugin watches for `.claws/KILL`. When the file appears,
all tool calls are blocked. The file content is the kill reason.

```bash
echo "CVE-2026-99999 — data exfiltration" > .claws/KILL
```

No Gateway API, no CLI, no network. Just write a file. Polling interval: 1s.
To resume: delete the file and run `claws resume`.

### Path 2: OS signal

**Unix:**

```bash
kill -USR1 $(cat .claws/runtime/gateway.pid)
```

**Windows:**

Windows does not support SIGUSR1. Use the CLI wrapper, which triggers the
named event internally:

```bash
claws kill --signal
```

Alternatively, Path 1 (KILL file) works identically on all platforms.

Immediate delivery (no 1s polling). Same effect, same audit trail. Use this
in automated incident response scripts.

### Path 3: Sidecar

The L5 sidecar monitors the governance plugin health endpoint. If it fails
to respond within 5 seconds, the sidecar:

1. Writes `.claws/KILL` (triggers Path 1)
2. Sends `SIGUSR1` (triggers Path 2)
3. If both fail within 10s: `SIGTERM` then `SIGKILL` to the Gateway process
4. Emits SIEM alert

The sidecar is the only path that works when the Gateway is compromised.
Enterprise deployments install it by default (`claws init --enterprise`).

## Using claws kill

For most situations, use the CLI:

```
$ claws kill agent-research --reason "data exfiltration detected"
  ✓ KILL file written
  ✓ Audit event recorded
  ✓ All tool calls blocked
  Agent stopped. Resume with: claws resume agent-research
```

### Fleet kill

```
$ claws kill --fleet --confirm --reason "active incident IR-2026-0411"
  WARNING: This will kill ALL 47 agents across the fleet.
  Type 'KILL FLEET' to confirm: KILL FLEET

  ████████████████████████████████████████████████  47/47
  ✓ 47 agents killed. Event ID: kill-fleet-2026-0411-001
  Resume with: claws resume --fleet
```

Fleet kill requires `--confirm` and typing the confirmation phrase. The
`--yes` flag is rejected — no shortcut for stopping 47 agents.

## Audit trail

Every kill creates an immutable, hash-chained record. Kills cannot be hidden.

```
$ claws audit history --filter kill
  kill-2026-0411-001
    Agent:  agent-research     By: platform-eng@corp.com
    Reason: data exfiltration  At: 2026-04-11T14:32:01Z
    Path:   CLI (→ KILL file)  Resumed: 2026-04-11T15:10:00Z
```

## Kill vs bypass

| | `claws kill` | `CLAWS_BYPASS=1` |
|---|---|---|
| **Effect** | Blocks all tool calls | Allows all calls ungoverned |
| **Use when** | Agent is doing harm | Governance is blocking legitimate work |
| **Audit** | Records kill + blocked calls | Records bypass + ungoverned calls |

Kill is for incidents. Bypass is for emergencies where governance itself is
the problem and a policy fix cannot wait.

## When to use each path

| Scenario | Path |
|----------|------|
| Normal incident response | CLI (`claws kill`) |
| Gateway is hung | KILL file |
| Automated IR script | OS signal |
| Gateway is compromised | Sidecar |

## Scenario-Driven Additions

### From fleet-operations scenarios (89 findings applied)
- Kill switch semantics: deny-all, not disable-governance -- killed workspaces block all tool calls and continue recording audit events rather than running ungoverned (P-177)
- Synchronous kill with per-workspace acknowledgment: fleet kill waits for each workspace to confirm the kill took effect before reporting success
- Kill partial failure escalation: unreachable workspaces during fleet kill trigger CRITICAL alert with no silent pass (P-178)
- Automatic pre-kill snapshot with failure tolerance: snapshot is attempted before kill; if snapshot fails, kill proceeds but the failure is logged
- Post-kill restoration command: `claws resume` or `claws snap restore` provides documented recovery path
- Structured kill reason format for incident correlation: kill reason includes incident ID, timestamp, and operator identity for SIEM matching
- Double-kill prevention and state check: repeated kill on already-killed workspace is a no-op; does not overwrite the pre-kill snapshot with killed state (P-179)
- Kill-to-restore latency SLA: documented maximum time from kill activation to full workspace halt

## Further reading

- [Three Rings](three-rings.md) — kill switch is the emergency exit
- [Fleet Drift](fleet-drift.md) — drift may reveal why a kill was needed
- [Upgrade Lifecycle](upgrade-lifecycle.md) — snapshot before investigating
