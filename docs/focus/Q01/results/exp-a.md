# Experiment a: One CLI vs Two — Re-Test with --fleet Scope Model

**Method**: design analysis
**Date**: 2026-04-11

---

## The --fleet Scope Model

Instead of two CLIs disambiguating scope, use one CLI with explicit scope escalation:

```
claws <command>                    # always workspace-scoped (safe default)
claws <command> --fleet            # fleet-scoped (explicit escalation)
claws <command> --fleet --confirm  # fleet destructive (double confirmation)
```

### Re-Running SU-01 Sentence Tests

**Test 1**: "I need to build my agent and check its policy"
→ `claws build && claws check` — **Natural.** Same CLI, same scope.

**Test 2**: "I need to build my agent and scan the whole org"
→ `claws build && claws scan` — **Natural.** Scan is read-only; no scope flag needed because scan is inherently fleet-scoped (you scan for workspaces across directories).

**Test 3**: "I need to check policy and broadcast to fleet"
→ `claws check && claws broadcast` — **Natural.** Broadcast is inherently fleet. No ambiguity.

**Test 4**: "I need to save a snapshot and restore a snapshot"
→ At workspace scope: `claws snapshot save v2 && claws snapshot restore v2` — **Safe.**
→ At fleet scope: `claws snapshot save v2 --fleet && claws snapshot restore v2 --fleet` — **Clear.**

**Test 5**: "I need to kill an agent and check drift"
→ `claws kill agent-x && claws drift` — **Natural.** Both fleet operations.

**Test 6**: "I need to rollback my fleet"
→ `claws rollback v1 --fleet --confirm` — **Safe.** Double gate (--fleet + --confirm).

### Inherently-Scoped Commands

Some commands don't need `--fleet` because their scope is unambiguous:

| Scope | Commands | Why |
|-------|----------|-----|
| **Always workspace** | compile, build, optimize, test, diff, import, inspect, amend, watch, session, doctor | Operate on source files in current directory |
| **Always fleet** | scan, broadcast, drift, report, history, push, promote | Inherently cross-workspace |
| **Scope-sensitive** | snapshot, rollback, check, comply, kill, budget, secrets | Default workspace; --fleet for fleet |

This means `--fleet` is only needed on ~6 commands. The rest are unambiguous.

### Safety Analysis

| Risk | Two CLIs | One CLI + --fleet |
|------|---------|-------------------|
| Accidental fleet rollback | Impossible (wrong CLI) | Protected by --fleet + --confirm |
| Forgetting --fleet on snapshot | N/A (using clawops) | Defaults to workspace (safe) |
| CISO using build commands | Confusing (wrong CLI) | Fine (one CLI does everything) |
| Onboarding complexity | Learn 2 CLIs | Learn 1 CLI |
| Documentation surface | 2 separate docs | 1 doc with fleet section |
| Tab completion | 2 namespaces | 1 namespace |

### The CISO Objection

"A CISO typing `claws build` is confusing."

**Counter**: A CISO doesn't type CLI commands. They use dashboards. The CLI users are developers and platform engineers — both of whom benefit from one tool.

For the rare CISO who does use the CLI, `claws --help` shows the 4-step quick start for workspace AND the fleet commands. Progressive disclosure means they see `scan → broadcast → drift → report` immediately.

### The Enterprise Separation Objection

"Large enterprises want different RBAC for build vs fleet commands."

**Counter**: RBAC isn't enforced by CLI binary name. It's enforced by the identity bridge (CP-4a). Whether the user types `claws broadcast` or `clawops broadcast`, the identity system checks their role. The CLI name doesn't provide security.

---

## Verdict: One CLI wins

| Criterion | Two CLIs | One CLI |
|-----------|---------|---------|
| **Onboarding** | Worse (2 tools) | Better (1 tool) |
| **Safety** | Slightly better (scope by binary) | Good enough (--fleet + --confirm) |
| **Discoverability** | Worse (which CLI has this?) | Better (one --help) |
| **Documentation** | Worse (2 docs, cross-references) | Better (1 doc) |
| **Installation** | Same (one package either way) | Same |
| **Tab completion** | Neutral | Slightly better (one namespace) |
| **Enterprise RBAC** | No benefit (RBAC is identity, not binary) | Same |
| **Brand simplicity** | Worse (two names) | Better (one name: claws) |

**One CLI (`claws`) with `--fleet` scope flag for the ~6 scope-sensitive commands.** Default is always workspace-safe. Fleet destructive operations require `--fleet --confirm`.

---

## Key Findings

1. **Most commands are inherently scoped** — only ~6 need the --fleet flag
2. **Safety is preserved** via --fleet + --confirm double gate on destructive fleet operations
3. **The CISO objection doesn't hold** — CISOs use dashboards, not CLIs
4. **Enterprise RBAC is enforced by identity, not CLI binary** — two CLIs don't add security
5. **One CLI is strictly simpler** to onboard, document, and discover
6. **Revise Q12 answer from two CLIs to one**
