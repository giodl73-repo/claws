> **⚠️ SUPERSEDED 2026-04-29 — DO NOT FILE. Reshaped, not retired.**
>
> This draft proposes a new `@openclaw/policy` upstream package: a generator that reads SOUL.md / TOOLS.md / AGENTS.md and emits a runtime gateway plugin into `.openclaw/policy/`, plus a 9-verb `openclaw policy` subcommand group, plus runtime invariants. **The v2 proposal package retired this shape** because the generator implementation is convention-bound to claws-specific file formats (R0–R5 sensitivity tiers, claws-style TOOLS.md provenance declarations); upstream wants types-only.
>
> **Replacement**: see `pr-drafts/v2-policy-ir.md` — types-only `PolicyIR` contract (~80–150 LoC) in `src/plugin-sdk/policy-ir.ts` plus optional companion `policy-ir-runtime.ts` (~50 LoC) for lock-point ABI helpers, plus the small `ctx.snapshotId` extension to `PluginHookToolContext`. The generator implementation stays downstream — claws ships the SOUL/TOOLS/AGENTS compilation as `claws-policy-generator/`; OPA users ship a `.rego → PolicyIR` shim; ecosystem authors implement their own.
>
> See:
>
> - `.craft/out/proposals/realigned-story.md` § "3. PolicyIR (proposed, see policy-pre-rfc.md)" + § "4. ctx.snapshotId extension"
> - `.craft/out/proposals/policy-pre-rfc.md` (full design + Asks)
> - `.craft/plans/hapi-amendment-to-contract-first.md` (amendment plan)
>
> Useful contributions from this draft (R5 / RESTRICTED runtime invariants, generation-time invariant rejection, deny-rule ordering, the emitted-plugin lock-points) are absorbed by `policy-pre-rfc.md` as downstream concerns; the generator code in `packages/openclaw-policy/` is cherry-pick territory for the post-trim `claws-policy-generator/` rename.
>
> ---
>
> **Original draft below (for reference / cherry-pick).**

## Why this PR

Today, a host that wants to enforce "R5 (irreversible-external) tools always require external approval" or "RESTRICTED data never leaks through public-broadcast tools" has to hand-write provider code per tool, per workspace, per host. The provider code is full of conditionals, drifts as TOOLS.md changes, and silently gets out of sync with the workspace's authoritative declarations.

This PR adds `@openclaw/policy` — a generator that reads the workspace's authoritative files (SOUL.md, TOOLS.md, AGENTS.md, etc.) and emits a runtime gateway plugin into `.openclaw/policy/`. The plugin is a PolicyIR interpreter, not a pile of tool-specific `if`s. Lookups + invariants do most of the work. SOUL.md deny rules, TOOLS.md provenance declarations, and AGENTS.md boundaries become **enforceable**, not aspirational.

Also adds a 9-verb `openclaw policy` subcommand group to the existing `openclaw` CLI.

## Why governance must live in core (not extension)

The generator emits a gateway plugin that registers via `PluginHookRegistration` — the same registration shape every other gateway plugin uses. An extension-shipped generator would still emit a plugin that registers against core's hook surface, so the only question is "where does the generator code live?" Core is the right answer because:

1. The emitted plugin's registration shape must track core's `PluginHookRegistration` exactly. Core-side generator stays in lockstep automatically.
2. Generation-time invariants (R5 never fail-open; RESTRICTED stickiness) are enforced at the same code-review boundary that owns the runtime invariants. Splitting them creates drift.
3. The 9-verb `openclaw policy` subcommand group sits at top-level alongside `openclaw doctor` and `openclaw update` — extension subcommands can't share that namespace.

## What ships

### `@openclaw/policy` package

Generator + runtime helpers + 9-verb CLI handlers.

**Three artifacts emitted into `.openclaw/policy/` per `openclaw policy generate`:**
1. `policy-ir.json` — declarative IR (content-addressable, versioned)
2. `gateway-plugin.ts` — executable TypeScript that registers via `PluginHookRegistration` to enforce policy at runtime
3. `audit-manifest.json` — declared event taxonomy mapped to OC's exec-approval categories

Deterministic: same workspace inputs → byte-identical output. Three runs of `generate` produce three identical artifact sets.

### Generation-time invariants enforced

The generator refuses to produce artifacts that would break invariants:

- **R5 never fail-open** — TOOLS.md declaring `riskLevel: R5` + `failOpen: true` is rejected at generate time with `oc://TOOLS.md/Tools/<name>` URI in the diagnostic
- **RESTRICTED stickiness through `args_from`** — chains that would launder RESTRICTED data through a public-broadcast tool are rejected
- **`IRREVERSIBLE_EXTERNAL` capability clamps to R5 minimum** — a tool declared R3 + IRREVERSIBLE_EXTERNAL becomes R5 effective

If the workspace declares a tool that violates an invariant, `openclaw policy generate` exits non-zero with a diagnostic — does NOT emit a plugin that would.

### Runtime defense-in-depth

The emitted plugin treats R5 as fail-closed at runtime regardless of the IR's `failOpen` flag — defense against hand-edited JSON IR. Even if a downstream consumer modifies `policy-ir.json` to add `failOpen: true` on an R5 tool, the runtime plugin overrides.

### CLI subcommand group (9 verbs)

```
openclaw policy check [--file SOUL.md]                   # parse + validate; diagnostics only
openclaw policy generate                                 # write .openclaw/policy/{policy-ir.json, gateway-plugin.ts, audit-manifest.json}
openclaw policy watch                                    # re-run check on save
openclaw policy comply [--rubric soc2|hipaa]             # rubric eval → signed ComplianceReport
openclaw policy test [--scenarios path/]                 # YAML scenarios against current workspace
openclaw policy sim [--port 8443]                        # local mock OC gateway (agent-facing)
openclaw policy report [--format md|html|pdf]            # render compliance / audit / snapshot-diff
openclaw policy verify                                    # audit-chain integrity check
openclaw policy diff <id1> <id2>                         # semantic diff of two PolicyIRs
```

CLI handler shape matches upstream's existing dispatcher (per adapter-audits.md § 2 — see "Adapter audit cited" below).

### Runtime-gated enforcement model

Per spec amendment §3, OC-1/OC-2 file-ingest hooks were dropped from the contribution wave. Workspace-file governance happens at agent runtime via `before_agent_start`, not at file-write time. The emitted plugin compares the workspace's current `snapshotId` against the last promoted snapshot's id; emits `requireApproval` when drift detected; agent stalls until reviewer approves.

This shifts enforcement from "write-time prevention" to "runtime gating." Hosts that need write-blocking deploy `@openclaw/snap` in `stage on` posture (see PR-6).

### URI vocabulary consumed

Policy diagnostics emit `oc://...` URIs as locations:
- `oc://TOOLS.md/Tools/send-email/args_from` — workspace-file diagnostic
- `oc://config/policy/key-registry` — runtime-config diagnostic (per PR-2)

Same vocabulary editor LSPs and audit logs consume.

## Adapter audit cited

This PR opens with `docs/upstream/guides/adapter-audits.md § 2` (emitted-plugin registration audit) attached. The audit verifies that the generated `gateway-plugin.ts` registers cleanly via current upstream's `PluginHookRegistration` shape (no claim-mode vs sequential-modifying-mode mismatches; CLI subcommand registration follows upstream's existing dispatcher precedent).

## Test plan

- [x] **F-26** Generator rejects TOOLS.md declaring R5 + failOpen with `oc://...` URI in diagnostic (HC-BLOCK)
- [x] **F-27** Emitted plugin treats R5 as fail-closed at runtime regardless of IR flag (defense-in-depth)
- [x] **F-29** Capability clamp R5 floor (declared tier max with capability-floor)
- [x] **F-30** G-CHAIN: chain `read-restricted → summarize → post-publicly` rejected
- [x] **F-31** Generator refuses laundering chains at generate time (diagnostic)
- [x] **F-32** PolicyIR has `effectiveSensitivity` field per tool
- [x] **F-44** Hostile-write-then-read flow: drift detection before agent execution
- [x] **F-47** Mutation report includes `oc://` URI per file
- [x] **F-48** Multiple-mutation case: each file's drift reported separately
- [x] **F-49** Comparison cost bounded — only files in policy-relevant set checked
- [x] **F-62** Determinism: same workspace input → byte-identical output (3 runs)
- [x] **F-33** Emitted plugin loads + registers via `@openclaw/plugin-sdk` HEAD without modification
- [x] **F-34** Sequential modifying mode honored
- [x] **F-35** CLI subcommand dispatches to handler

## Bot pre-empt checklist

- [x] PR description leads with core-not-extension justification (above)
- [x] No keywords trigger `r:third-party-extension` / `r:skill`
- [x] `docs/.generated/plugin-sdk-api-baseline.sha256` refreshed
- [x] `docs/sdk-overview.md` table updated with `@openclaw/policy` row
- [x] Swift protocol models regenerated for new gateway HTTP surface from `policy comply` and `policy report`
- [x] All host-boundary entries validated with Zod schema (TOOLS.md / SOUL.md parser inputs)
- [x] No generic `try/catch` in hot path; failure modes distinguished (parse vs validate vs emit vs IO)
- [x] No duplicate helpers; emitters live in `src/emit/{ir,plugin,audit-manifest}.ts`
- [x] Zero `@microsoft/*` import gate green
- [x] CHANGELOG entry appended at END of target section

## Metrics

- **1 new package**: `@openclaw/policy` (generator + 9-verb CLI handlers + 6 subpaths)
- **3 emitted artifacts** per workspace: `policy-ir.json`, `gateway-plugin.ts`, `audit-manifest.json`
- **9 CLI verbs** added to existing `openclaw` CLI
- **18 new tests**: 6 L0 unit (generator + invariants), 6 L1 integration (emitted plugin + runtime defense), 4 L2 e2e (registration + dispatch + hostile-write), 2 L3 acceptance (rubric coverage)
- **0 new top-level CLI binaries** — `openclaw policy` slots in alongside existing verbs

## Migration / risk

**Existing custom-provider hosts**: continue to run unchanged. Adopting `@openclaw/policy` is opt-in per workspace via `openclaw policy generate`. Hosts can run a hand-written provider AND a generated provider simultaneously; merger semantics (PR-4) handle the conjunction.

**For workspace authors**: `policy check` reports any TOOLS.md / SOUL.md violations of generation-time invariants before `generate` runs. Authors fix the workspace, not the generator output.

**For audit-log consumers**: `audit-manifest.json` declares the event taxonomy this policy emits. Pre-existing audit consumers continue to work; new event categories (`policy_generate`, `snapshot_promote`, etc.) are additive.

---

🤖 This PR was prepared with [Claude Code](https://claude.com/claude-code) as part of the `claws-openclaw-upstream` contribution wave (Hapi the Bringer · cp-4). Companion: PR-4 `fix(plugins): make requireApproval conjunctive across plugin chain`.
