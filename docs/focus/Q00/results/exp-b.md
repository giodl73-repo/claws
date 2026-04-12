# Experiment b: CLI Split Validation

**Method**: design analysis (applying SU-01 verb-family separation test)
**Date**: 2026-04-11
**Sources**: design/suite/specs/SU-01-architecture.md (§1.1-§1.4), Q12 working notes

---

## SU-01 Separation Test

SU-01 §1.1 defines the decisive test: **"Can one persona use verbs from two families in the same sentence?"** If yes, they belong in the same CLI. If no, they belong in separate CLIs.

The original three-CLI split passed this test:
- "I need to **build** a workspace and **approve** a gate" — No. Different personas, different moments. → craft + fleet
- "I need to **check** policy and **kill** an agent" — No. Different moments. → guard + fleet

### Applying the Test to clawsc + clawops

**Test 1**: "I need to **build** my agent and **check** its policy" — **Yes.** Same developer, same moment (compile then check). → Same CLI (clawsc).

**Test 2**: "I need to **build** my agent and **scan** the whole org" — **No.** Different persona (developer vs platform lead), different scope. → Different CLIs.

**Test 3**: "I need to **check** policy and **broadcast** to fleet" — **No.** Different scope. Checking one workspace vs broadcasting to 200. → Different CLIs.

**Test 4**: "I need to **save a snapshot** and **restore a snapshot**" — **Yes.** But at what scope? Developer saves workspace snapshot. Ops restores fleet snapshot. Same verb, different scope. → Snapshot appears in BOTH CLIs with scope qualifier.

**Test 5**: "I need to **amend** a concept and **watch** for recompile" — **Yes.** Same developer, same session, same workspace. → Same CLI (clawsc).

**Test 6**: "I need to **kill** an agent and **check drift**" — **Yes, arguably.** Ops person responds to incident: kill, check drift, broadcast fix. → Same CLI (clawops).

**Test 7**: "I need to **set secrets** and **configure SSO**" — **Yes.** Same admin, same setup session. → Same CLI (clawops).

**Test 8**: "I need to **watch** my workspace and **broadcast** a fleet policy" — **No.** Developer watching their own workspace vs ops broadcasting to everyone. → Different CLIs.

### Verb Family Analysis

| Family | Verbs | Persona | CLI |
|--------|-------|---------|-----|
| **Build + Govern-Local** | compile, build, optimize, check, comply, assess, audit, amend, watch, session, diff, import, inspect, test, doctor, init | Developer, Compliance Officer | `clawsc` |
| **Operate + Govern-Fleet** | scan, drift, broadcast, report, history, status, kill, budget, secrets, identity, push, rollback, promote | Platform Lead, CISO | `clawops` |
| **Snapshot (dual-scope)** | snapshot save/restore/diff/deploy/prune/verify | Both (scope determines CLI) | Both |

### Collision Test

SU-01 §1.4 defines collision commands with helpful redirects. For clawsc/clawops:

| Typed | Error Message |
|-------|--------------|
| `clawsc scan` | `Did you mean 'clawops scan'? clawsc governs your workspace; clawops governs your fleet.` |
| `clawsc broadcast` | `Did you mean 'clawops broadcast'? clawsc governs your workspace; clawops governs your fleet.` |
| `clawsc kill` | `Did you mean 'clawops kill'? clawsc builds agents; clawops operates them.` |
| `clawops compile` | `Did you mean 'clawsc compile'? clawops governs your fleet; clawsc builds your workspace.` |
| `clawops build` | `Did you mean 'clawsc build'? clawops governs your fleet; clawsc builds your workspace.` |
| `clawops amend` | `Did you mean 'clawsc amend'? Amendments are workspace-local; use clawsc.` |
| `clawops watch` | `Did you mean 'clawsc watch'? Watch mode is workspace-local; use clawsc.` |

---

## Cross-Reference: craft/guard/fleet → clawsc/clawops

The mapping between the 3-CLI and 2-CLI surfaces:

```
craft (16 commands) ──────────► clawsc (all 16, re-skinned)
                                    + amend, watch, session (new)
                                    + snapshot (workspace-scope)

guard (6 commands) ───┬────────► clawsc (check, comply, assess, audit, init, budget)
                      │              workspace-scoped governance
                      └────────► clawops (scan, budget-fleet, secrets, monitor)
                                    fleet-scoped governance

fleet (25 commands) ──────────► clawops (status, kill, scan, drift, broadcast,
                                    report, history, push, rollback, promote,
                                    budget, secrets, identity)
                                    + snapshot (fleet-scope)
```

### Why NOT Three CLIs for OpenClaw?

Could we mirror craft/guard/fleet exactly? `clawsc` / `clawguard` / `clawfleet`?

**No.** The three-CLI split works for Craftworks because the personas are distinct professionals with different mental models (maker vs CISO vs ops manager). For OpenClaw enterprise users, governance isn't a separate product — it's the reason they're using the tool at all. `clawsc check` is as natural as `clawsc build`. Separating them would force the developer to switch CLIs mid-workflow.

The two-CLI split maps to the actual mental model: **"my workspace"** vs **"my org."**

### Why NOT One CLI?

Could we merge everything into `clawsc`? No fleet commands, just scope flags?

**Test**: `clawsc broadcast --scope fleet` vs `clawops broadcast`
**Problem**: One CLI with scope flags creates dangerous ambiguity. `clawsc snapshot restore production` — is that your workspace or your entire fleet? The scope flag is too easy to omit, and the consequences of restoring the wrong scope are severe.

Two CLIs make scope unambiguous by construction. You can't accidentally fleet-rollback from `clawsc`.

---

## Verdict

**The two-CLI split (clawsc + clawops) passes the SU-01 separation test.**

- Build + govern-local = one verb family (clawsc)
- Operate + govern-fleet = one verb family (clawops)
- Snapshots span both at different scopes (safe because CLI name disambiguates)
- 7 collision redirects cover the most likely mistakes
- Three CLIs would be over-separated; one CLI would be under-separated

---

## Key Findings

1. **Two CLIs pass the SU-01 separation test** — 8 sentence tests confirm the split
2. **The boundary is scope, not function** — governance exists in both CLIs; workspace-scope in clawsc, fleet-scope in clawops
3. **Snapshots are the only cross-CLI capability** — scope (workspace vs fleet) determines which CLI
4. **Three CLIs (mirroring craft/guard/fleet) would over-separate** — OC users see governance as integral to building
5. **One CLI would under-separate** — dangerous scope ambiguity on destructive operations (rollback)
6. **7 collision redirects needed** — same pattern as SU-01 §1.4
