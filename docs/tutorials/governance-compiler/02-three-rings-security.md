# Lesson 2: Three Rings Security

<!-- atoms: three-rings, three-engine-model, obo-boundary -->

claws enforces governance across three concentric rings -- from real-time file watching to fleet-wide scanning. Each ring operates at a different scope and latency.

## What You'll Learn

- How the inner, middle, and outer rings work together
- How OBO (On Behalf Of) boundaries prevent unauthorized delegation
- How to configure ring behavior for your workspace

## Prerequisites

- A workspace with governance from [Lesson 1](01-init-and-first-check.md)

## Step by Step

### 1. Three rings, three scopes

Governance enforcement happens at three levels:

```
  ┌─────────────────────────────────────────┐
  │  Outer Ring: Fleet scan (minutes)       │
  │  ┌─────────────────────────────────┐    │
  │  │  Middle Ring: CLI commands (ms)  │    │
  │  │  ┌─────────────────────────┐    │    │
  │  │  │  Inner Ring: File watch  │    │    │
  │  │  │  (< 300ms batch)        │    │    │
  │  │  └─────────────────────────┘    │    │
  │  └─────────────────────────────────┘    │
  └─────────────────────────────────────────┘
```

| Ring | Trigger | Latency | Scope |
|------|---------|---------|-------|
| Inner | File save | < 300ms batch | Single workspace, governance rules |
| Middle | CLI command | Sub-second | Single workspace, full pipeline |
| Outer | Fleet scan | Minutes | All workspaces in fleet |

### 2. The inner ring: file watcher

Start the inner ring watcher:

```bash
claws watch
```

```
  WATCH    monitoring 9 workspace files
  [10:00]  TOOLS.md saved → G-CLASS: PASS, G-INPUT: PASS
  [10:01]  AGENTS.md saved → G-A2A-TRUST: PASS
```

The watcher monitors the 9 workspace files and re-evaluates affected rules on save. Rapid saves within 300ms are batched to prevent thrashing. Only changed files trigger re-evaluation -- unchanged files use cached GovernanceIR.

On Windows, the watcher deduplicates events (Windows file watchers emit duplicates for a single save). A PID file prevents multiple watcher instances per workspace.

### 3. The middle ring: CLI commands

The middle ring is what you've been using -- `claws check`, `claws doctor`, `claws snap`. These run the full pipeline on demand:

```bash
claws check     # evaluate all governance rules
claws doctor    # diagnose configuration issues
claws snap      # capture workspace snapshot for audit
```

Middle ring commands run the complete three-engine pipeline (parse, governance, report). They're slower than the inner ring but more thorough -- the inner ring only re-evaluates affected rules, while the middle ring evaluates all rules.

### 4. The outer ring: fleet scanning

The outer ring scans multiple workspaces. It's covered in detail in the fleet documentation, but the key command is:

```bash
claws fleet scan
```

```
  SCAN     3 workspaces found
  [1/3]    my-agent: 5/5 rules passed
  [2/3]    data-pipeline: 4/5 rules passed (1 medium)
  [3/3]    customer-service: 5/5 rules passed

  Fleet: 2/3 workspaces fully compliant
```

The outer ring runs middle-ring checks in parallel across all workspaces in the fleet, aggregating results into a fleet-level report.

### 5. OBO boundaries

OBO (On Behalf Of) is the delegation model. When agent A asks agent B to do something, B acts "on behalf of" A. The OBO boundary is the governance line that controls who can delegate to whom:

```yaml
# claws.json
obo:
  allow:
    - from: orchestrator
      to: researcher
      scope: [read-file, web-search]
    - from: orchestrator
      to: writer
      scope: [read-file, write-file]
  deny:
    - from: researcher
      to: writer
      reason: "researchers cannot delegate writing tasks"
```

When an agent attempts delegation, claws checks the OBO boundary:

```bash
claws check
```

```
  G-OBO     OBO delegation boundaries           PASS
            orchestrator → researcher: allowed (2 tools)
            orchestrator → writer: allowed (2 tools)
            researcher → writer: denied (explicit deny rule)
```

If an agent attempts unauthorized delegation at runtime, the L2 plugin intercepts and blocks the tool call. The OBO boundary is enforced at compile time (via `claws check`) and at runtime (via the governance plugin).

### 6. Ring configuration

Configure ring behavior in `claws.json`:

```json
{
  "rings": {
    "inner": {
      "enabled": true,
      "batch_window_ms": 300,
      "rules": ["G-CLASS", "G-INPUT", "G-A2A-TRUST"]
    },
    "middle": {
      "rules": "all"
    },
    "outer": {
      "parallel": 4,
      "timeout_per_workspace_s": 30
    }
  }
}
```

The inner ring can be limited to a subset of rules for faster feedback. The middle ring always runs all rules. The outer ring controls parallelism and per-workspace timeouts.

## What You Learned

- Three concentric rings enforce governance at different scopes and latencies
- The inner ring watches files for real-time feedback (< 300ms batch)
- The middle ring runs full pipeline checks on CLI command
- The outer ring scans fleets of workspaces in parallel
- OBO boundaries control who can delegate to whom, enforced at compile and runtime
- Ring behavior is configurable per workspace in `claws.json`

## Next

[Lesson 3: Three-Tier Packages](03-three-tier-packages.md) explains the package ecosystem that powers claws governance.
