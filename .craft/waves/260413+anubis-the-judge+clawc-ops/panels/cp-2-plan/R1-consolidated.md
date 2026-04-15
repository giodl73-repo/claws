---
panel: cp-2-plan
round: R1
date: 2026-04-12
roles: [claws:gateway-eng, claws:platform-eng, craft:architect, claws:skill-author]
pulse_range: [10, 18]
verdict: CONDITIONAL PASS — 4 Majors require pulse edits before implementation
---

# CP-2 Plan Review: R1 Consolidated

## Severity Summary

| Severity | Count |
|----------|-------|
| Major    | 4     |
| Warning  | 7     |
| Note     | 5     |

---

## Major Findings

### M-01: Amend pipeline violates lossless OC fidelity constraint (CL-08)

**Roles**: claws:gateway-eng, craft:architect
**Pulse**: 17 (amend-pipeline)
**Consensus**: 4/4

Pulse 17 delivers `amend/apply.ts` that "modifies workspace files" (line 39: "apply amendment to workspace files, trigger re-compile, verify post-state"). The acceptance criteria explicitly say "Apply modifies workspace files." This directly contradicts the CL-08 lossless OC constraint and the recorded project invariant: claws NEVER modifies original OC workspace files. The amend pipeline must not write to SOUL.md, TOOLS.md, AGENTS.md, etc. directly.

The pulse needs to specify which files `amend apply` actually writes. If amendments modify policy files in `.claws/policies/` or `claws.json`, that is fine (those are claws-owned). If amendments modify OC files, this is a hard block. The pulse text is ambiguous enough that an implementer could write code that mutates OC files.

**Required edit**: Pulse 17 must explicitly state that `apply.ts` writes ONLY to `.claws/` files and `claws.json` — never to OC workspace files (SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md, skills/*/SKILL.md). Add acceptance criterion: "No OC file is modified by any amend operation."

### M-02: `claws watch` <1s latency unverified on Windows — fs.watch behavior differs

**Roles**: claws:platform-eng, claws:gateway-eng
**Pulses**: 13 (watch-core), 14 (watch-recompile)
**Consensus**: 3/4

The CP-2 exit criterion says "claws watch reports TOOLS.md violation within 1s of save." Pulse 14 has an L2 e2e test asserting this. However, neither pulse addresses the well-known Windows `fs.watch()` behavior differences:

1. **Windows `fs.watch` emits duplicate events** — a single file save can fire 2-4 `change` events on NTFS. The 300ms debounce window helps, but the pulse text never acknowledges this platform-specific behavior.
2. **Windows `fs.watch` event type is unreliable** — on Windows, `rename` events fire for modifications in some editors (VS Code save-to-temp-then-rename pattern). The watcher must normalize these.
3. **Latency budget**: 300ms debounce + SHA-256 hash + incremental parse + 29 governance rules = tight budget to land under 1s, especially on spinning-disk or antivirus-scanned paths.

The debounce layer (Pulse 13) and the auto-analyze layer (Pulse 14) each need explicit Windows considerations in their deliverables and test gates.

**Required edit**: Pulse 13 must add a deliverable or acceptance criterion for Windows event normalization (duplicate suppression, rename-as-change handling). Pulse 14 should add a warning in its acceptance criteria that the 1s budget includes 300ms debounce, so the analyze+recompile pass has only ~700ms. Consider adding an explicit Windows integration test.

### M-03: Init orchestrator (P10) has SDK-owns-logic gap — existing init.ts has business logic in CLI

**Roles**: craft:architect
**Pulse**: 10 (init-orchestrator)
**Consensus**: 3/4

Pulse 10 says the existing `claws-cli/src/commands/init.ts` is "refactored to be a thin CLI adapter that calls the SDK." But the current init.ts (132 lines) already contains business logic: platform detection fallback to `'openclaw'`, config object construction (`{ platform, trustTier: 2, suppress: [] }`), `writeFile` for claws.json, and the idempotency check via `fileExists`.

Pulse 10 creates new SDK modules (`orchestrator.ts`, `platform-detect.ts`, `config-create.ts`, `sidecar-scaffold.ts`, `gitignore-update.ts`) but doesn't explicitly address migrating the existing CLI logic. An implementer might create parallel code paths (SDK modules + old CLI logic) instead of replacing the CLI logic with SDK calls.

Additionally, the sidecar directory list diverges: Pulse 10 says "13 subdirectories (compiled, policies, keys, secrets, cache, audit, snapshots, migrations, plugins, templates, reports, logs, temp)" but `sidecar.ts` already defines 13 different directories (compiled, staging, keys, audit, cache, policies, secrets, config, snapshots, runtime, fleet, compliance, supply). These are incompatible lists.

**Required edit**: Pulse 10 must (a) explicitly state that all business logic is removed from init.ts during refactor, (b) reference the canonical sidecar layout from `claws-sdk/src/types/sidecar.ts` instead of listing a different 13-directory set. The pulse must use the existing `CLAWS_SIDECAR_LAYOUT` constant, not invent a new one.

### M-04: Dependency ordering allows batch parallelism that isn't safe

**Roles**: craft:architect, claws:platform-eng
**Pulses**: 10-11 (batch 1), 12-13 (batch 2)
**Consensus**: 3/4

The CP-2 dispatch plan puts Pulses 10 and 11 in Batch 1 (parallel). But Pulse 11 (init-templates) `depends_on: [10]` — it requires the init orchestrator to exist before templates can be integrated. The frontmatter correctly declares this dependency, but the batch plan contradicts it by placing them in parallel.

Similarly, Batch 2 pairs Pulse 12 (uninstall-bypass, depends_on: [10]) with Pulse 13 (watch-core, depends_on: [6]). These are genuinely independent — 12 depends on the init orchestrator, 13 depends on base-cli config. This batch is correctly parallelizable.

The conflict between the CP-2 dispatch plan (P10 and P11 in parallel) and the pulse frontmatter (P11 depends_on P10) must be resolved.

**Required edit**: Move Pulse 11 to Batch 2 (after Pulse 10 completes), or restructure Pulse 11 to not depend on Pulse 10's orchestrator (e.g., templates are standalone generators that the orchestrator discovers at runtime).

---

## Warning Findings

### W-01: Doctor migration backup (P16) doesn't specify backup location collision handling

**Roles**: claws:platform-eng
**Pulse**: 16

`backup.ts` backs up config before migration and restores on failure. But what if a prior backup already exists at the backup path? The pulse doesn't address collision (overwrite? versioned? fail?). Since the dead man's switch pattern chains `snap save -> migrate -> check -> snap restore`, there could be both a snap backup and a migrate backup active simultaneously. The relationship between these two backup mechanisms needs clarification.

### W-02: Template-generated policy YAML has no schema validation against `claws check`

**Roles**: claws:skill-author, claws:gateway-eng
**Pulse**: 11

Pulse 11 says "Each template produces syntactically valid YAML policy files." But syntactically valid YAML is not the same as semantically valid policy. The acceptance criteria should require that `claws check` can parse the generated policies without errors. Currently Pulse 15 (doctor-checks) adds `policy-syntax` validation, but that comes 4 pulses later. Pulse 11's tests should verify template output against the policy schema, not just YAML syntax.

### W-03: Uninstall .gitignore revert is fragile

**Roles**: claws:platform-eng
**Pulse**: 12

Pulse 12 says uninstall "reverts any .gitignore additions made by init." But Pulse 10 (init) adds `.claws/keys/` and `.claws/secrets/` while `sidecar.ts` defines `CLAWS_GITIGNORE_DIRS` as `.claws/keys`, `.claws/secrets`, `.claws/cache`, `.claws/runtime` (4 entries). If init uses `CLAWS_GITIGNORE_DIRS`, the uninstall must remove all 4, not just the 2 mentioned in Pulse 10. Additionally, if the user manually added other `.claws/` entries to `.gitignore`, the uninstall should not remove those.

### W-04: Watch monitors "9 OC files" but the OC file list is hardcoded

**Roles**: claws:gateway-eng
**Pulse**: 13

Pulse 13 says "fs.watch on 9 files (SOUL.md, TOOLS.md, AGENTS.md, IDENTITY.md, USER.md, MEMORY.md, HEARTBEAT.md, skills/*/SKILL.md, lobster.yaml)." But `skills/*/SKILL.md` is a glob pattern, not a single file — in a real workspace there could be 0-50 skill files. The watcher needs to handle dynamic discovery of skill files (new skill added, skill deleted). `fs.watch` on a glob is not straightforward. The pulse should specify whether it watches the `skills/` directory for new entries or only watches skills that exist at startup.

### W-05: E2E test (P18) depends on gateway-sim but doesn't declare it

**Roles**: claws:gateway-eng
**Pulse**: 18

Pulse 18 step 7 says "Load into gateway-sim -> shell-exec BLOCKED." Gateway-sim was built in CP-1 (Pulse 2). But Pulse 18's `depends_on: [14, 16, 17]` doesn't include Pulse 2 or any CP-1 reference. The dependency is implicit through `depends_on_cp: 1` in the checkpoint frontmatter, but the pulse itself should declare the gateway-sim dependency for implementer clarity.

### W-06: Test count mismatch between checkpoint and pulse sum

**Roles**: claws:platform-eng
**Pulse**: all

CP-2 exit criteria require "L0: 38+ unit tests, L1: 16+ integration, L2: 7+ e2e." Summing pulse frontmatter test_tiers:

| Tier | Sum from pulses | CP-2 target | Delta |
|------|----------------|-------------|-------|
| L0   | 42             | 38+         | +4 OK |
| L1   | 18             | 16+         | +2 OK |
| L2   | 3              | 7+          | **-4** |
| L3   | 1              | —           | — |

L2 e2e tests total only 3 (P12: 1, P14: 1, P18: 1) vs the checkpoint target of 7+. Either more pulses need L2 tests or the checkpoint target needs revision.

### W-07: `claws init` exit code semantics diverge between P10 and existing init.ts

**Roles**: claws:skill-author
**Pulse**: 10

Pulse 10 says "exit code 2 for already-initialized workspaces." The existing `init.ts` returns 2 for this case too (line 64). But the acceptance criteria also list "exit code 0 on fresh workspace." There is no mention of exit code 1. The existing init.ts module comment suggests 0=success, 1=warning, 2=error. If the SDK orchestrator redefines exit codes, it should be explicit about the full exit code contract, including whether warnings (e.g., "initialized but .gitignore was read-only") produce code 1.

---

## Note Findings

### N-01: Pulse 15 says "5 checks" in objective but "4 checks" in deliverables

**Roles**: claws:skill-author
**Pulse**: 15

The objective says "Five checks ship initially" and lists config-schema, artifact-compat, dependency-check, policy-syntax, and "a health summary aggregator." But the deliverables list only 4 check files and the acceptance criteria say "Doctor orchestrator runs all 4 checks." The health summary aggregator appears to be the orchestrator itself, not a separate check. Clarify whether it is 4 or 5.

### N-02: Pulse 12 references `~/.claws-backups/` — home directory on Windows

**Roles**: claws:platform-eng
**Pulse**: 12

`~/.claws-backups/{workspace-hash}/{timestamp}/` uses Unix home-dir tilde expansion. On Windows, `~` resolves differently across shells. The SDK should use `os.homedir()` or `process.env.USERPROFILE` explicitly. This is not a blocker but should be noted in the pulse for the implementer.

### N-03: Template names use hyphens (eu-ai-act) — flag parsing consideration

**Roles**: claws:skill-author
**Pulse**: 11

`--template eu-ai-act` uses hyphens in the template name. Most CLI parsers handle this fine, but if the `--template` flag uses `=` syntax (`--template=eu-ai-act`), some parsers may interpret the hyphens as flag boundaries. The pulse should note that the template name is the remainder after `--template` regardless of parsing mode.

### N-04: `claws doctor --fix` and `claws amend` share apply semantics — no shared infrastructure specified

**Roles**: craft:architect
**Pulses**: 16, 17

Both `doctor --fix` (P16) and `amend apply` (P17) modify workspace state through validated pipelines. They share the pattern: validate -> backup -> apply -> verify. There is no mention of shared infrastructure between these two modules. This is fine for CP-2 but could lead to duplication. A note for CP-3+ to consider abstracting the apply-with-rollback pattern.

### N-05: Pulse 18 is the checkpoint gate — single point of failure

**Roles**: claws:gateway-eng
**Pulse**: 18

Pulse 18 (`checkpoint_gate: true`) is the only gate pulse. If the e2e test is flaky (common for tests involving file watchers and timing), it blocks the entire checkpoint. Consider whether Pulse 18 should have a retry mechanism or whether the 1s latency assertion should have a tolerance window (e.g., 1.5s) for CI environments.

---

## Role-Level Raw Findings (Pre-Dedup)

### claws:gateway-eng (runtime enforcement, watch latency, plugin integration)

| ID | Sev | Finding | Pulse |
|----|-----|---------|-------|
| GE-1 | M | Amend pipeline "modifies workspace files" — violates CL-08 lossless OC | 17 |
| GE-2 | M | Watch 1s latency unverified on Windows | 13, 14 |
| GE-3 | W | Watch OC file list is hardcoded; skills/*/SKILL.md is a glob, not a file | 13 |
| GE-4 | W | E2E test uses gateway-sim without declaring dependency | 18 |
| GE-5 | N | Checkpoint gate e2e is single point of failure for flaky watcher timing | 18 |

### claws:platform-eng (cross-platform Windows, CI readiness, packaging)

| ID | Sev | Finding | Pulse |
|----|-----|---------|-------|
| PE-1 | M | fs.watch Windows: duplicate events, rename-as-change, editor temp files | 13, 14 |
| PE-2 | W | Doctor migration backup collision handling unspecified | 16 |
| PE-3 | W | Uninstall .gitignore revert uses wrong entry count (2 vs 4) | 12 |
| PE-4 | W | L2 e2e test sum (3) < CP-2 target (7+) | all |
| PE-5 | N | ~/.claws-backups tilde expansion unreliable on Windows | 12 |

### craft:architect (SDK-owns-logic, dependency ordering, package boundaries)

| ID | Sev | Finding | Pulse |
|----|-----|---------|-------|
| AR-1 | M | Init CLI has business logic; SDK migration not explicit | 10 |
| AR-2 | M | Batch 1 parallelism contradicts P11 depends_on P10 | 10, 11 |
| AR-3 | M | Sidecar directory list in P10 diverges from CLAWS_SIDECAR_LAYOUT | 10 |
| AR-4 | N | Doctor --fix and amend share apply-with-rollback; no shared infra | 16, 17 |

### claws:skill-author (developer experience, onboarding, error clarity)

| ID | Sev | Finding | Pulse |
|----|-----|---------|-------|
| SA-1 | W | Template YAML validated for syntax only, not against policy schema | 11 |
| SA-2 | W | Exit code contract incomplete (no code 1 specified) | 10 |
| SA-3 | N | P15 says 5 checks, delivers 4 | 15 |
| SA-4 | N | eu-ai-act hyphens in template name — parser edge case | 11 |

### Dedup Map

| Consolidated | Source IDs |
|-------------|------------|
| M-01 | GE-1 |
| M-02 | GE-2 + PE-1 |
| M-03 | AR-1 + AR-3 |
| M-04 | AR-2 |
| W-01 | PE-2 |
| W-02 | SA-1 |
| W-03 | PE-3 |
| W-04 | GE-3 |
| W-05 | GE-4 |
| W-06 | PE-4 |
| W-07 | SA-2 |
| N-01 | SA-3 |
| N-02 | PE-5 |
| N-03 | SA-4 |
| N-04 | AR-4 |
| N-05 | GE-5 |

---

## Verdict

**CONDITIONAL PASS** — The CP-2 plan is well-structured with clear batch ordering, good test coverage targets, and comprehensive deliverable lists. The 4 Major findings require pulse edits before implementation can begin:

1. **M-01**: Amend pipeline must explicitly prohibit OC file modification
2. **M-02**: Watch pulses must address Windows fs.watch behavior
3. **M-03**: Init orchestrator must reference canonical sidecar layout and explicitly migrate CLI business logic
4. **M-04**: Batch 1 parallelism must be fixed (P11 cannot parallel with P10)

Once these 4 edits land, CP-2 is ready for implementation.
