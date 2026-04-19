# `claws-cli` → `openclaw policy` + `openclaw snap` Carve-Out Mapping

**Purpose**: enumerate every `claws-cli` subcommand that exists today and decide its fate under extraction: **kept** (rehomed on `openclaw` CLI with new name), **dropped** (claws-internal only, not contributed upstream), or **merged** (folded into an existing OC command).

**Scope**: this is a mapping table, not a migration script. The filter-repo step in `claws-pre-extraction-packaging` uses this as the source of truth for which handler sources survive extraction.

**Companion to**: `policy-commands.md`, `snap-commands.md`, `openclaw-upstream-spec.md §3.2`, `openclaw-upstream-extraction.md §9`.

---

## Summary

`claws-cli` has 20+ subcommands today. The upstream contribution rehomes 9 of them as the `openclaw policy` group, 5 as the `openclaw snap` group, extends 2 existing `openclaw` commands (`doctor`, `upgrade`), drops 6 as claws-internal, and leaves 2 open for per-command decisions.

---

## Mapping table

| `claws` subcommand | Disposition | `openclaw` surface | Notes |
|---|---|---|---|
| `check` | **Kept → `openclaw policy check`** | `openclaw policy` | Same semantics; add `--file <path>` scoping per `policy-commands.md`. |
| `build` | **Renamed → `openclaw policy generate`** | `openclaw policy` | Verb rename (compile→generate). Drop `--target` flag. Writes to `.openclaw/policy/`. |
| `watch` | **Kept → `openclaw policy watch`** | `openclaw policy` | Re-run `check` on file change. |
| `comply` | **Kept → `openclaw policy comply`** | `openclaw policy` | Rubric eval; signed `ComplianceReport`. |
| `comply-eu-ai-act` | **Merged → `openclaw policy comply --rubric eu-ai-act`** | `openclaw policy` | Specific-rubric aliases become `--rubric` values on `comply`. |
| `test` | **Kept → `openclaw policy test`** | `openclaw policy` | YAML scenarios against current workspace. |
| `report` | **Kept → `openclaw policy report`** | `openclaw policy` | Compliance / audit / snapshot-diff rendering. |
| `snap` (subgroup today: list/diff/rollback) | **Kept + expanded → `openclaw snap` group** | `openclaw snap` | Promoted to top-level peer group. Eleven subcommands: `stage on/off` (staging toggle — new; status rolls into `snap status`), `status` (working tree + stage + drafts, new), `diff --staged` (new), `discard --stage` (new), `upload` (new), `list`, `diff <a> <b>`, `checkout` (new), `promote` (was HTTP-only), `rollback`, `discard <id>` (new), `serve`. Git-parallel mental model. |
| `serve` | **Kept → `openclaw snap serve`** | `openclaw snap` | Was a `claws` top-level; now a `snap` subcommand. No `/v1/compile` endpoint. |
| `diff` (part of snap subgroup today) | **Kept → `openclaw snap diff`** | `openclaw snap` | Composes `@openclaw/policy`'s `diffPolicyIR` at the CLI-handler layer. |
| `scan` | **Dropped — claws-internal** | — | Secret scanning inside the workspace is driven by `@openclaw/guardrails/secrets` findings surfaced via `openclaw policy check` (rule: high-confidence findings → error). No separate `scan` command upstream. |
| `keys` | **Dropped — claws-internal** | — | HMAC key rotation is an ops concern of the host, not an openclaw-core command. Document in host docs. |
| `protect` | **Dropped — claws-internal** | — | claws-specific internal protection flags; no upstream equivalent. |
| `annotate` | **Dropped — claws-internal** | — | Internal authoring affordance for our workspace editor; not a contribution. |
| `init` | **Dropped — claws-internal** | — | OC-core has its own bootstrap; we don't contribute our `init` template. |
| `extract` / `extract-watch` | **Dropped — claws-internal** | — | Used during the Horus migration; not a user-facing command post-extraction. |
| `doctor` | **Merged → `openclaw doctor` extension** | `openclaw doctor` | Existing OC-core command grows a policy-compiler-checks section (compiler version match, hook wiring, cache state, permissions). No `openclaw policy doctor` subcommand. |
| `upgrade` | **Merged → `openclaw upgrade` extension** | `openclaw upgrade` | Existing OC-core command grows policy-artifact migration (regenerate snapshots against new PolicyIR). No `openclaw policy upgrade`. |
| `publish` | **Open decision** | — | `claws publish` today pushes a generated workspace to an internal registry. Upstream equivalent would be `openclaw snap <id> publish --to <registry>` if we want a first-class push verb, or simply documentation: "use `snap serve` on the target side + HTTPS POST." Leaving out of the first wave pending Peter's input. |
| `broadcast` | **Open decision** | — | `claws broadcast` today is a fleet-wide promote across tenants. Upstream equivalent is a `snap`-client-side concern (iterate tenants, call `promote` for each). Likely kept as a `bic/claws` internal command; not contributed. |
| `drift` | **Merged → `openclaw policy check`** | `openclaw policy` | Drift detection (workspace has diverged from last-generated policy) already runs as part of `check`. No separate command. |
| `amend` | **Dropped — claws-internal** | — | Internal authoring affordance for editing staged content; not a contribution. |
| `kill` | **Dropped — claws-internal** | — | Kill-switch is explicitly out of scope for the contribution (spec §5.9). Lives in the supervisor companion app. |
| `uninstall` | **Dropped — claws-internal** | — | Removes claws artifacts from a workspace. Not an openclaw-core concern. |
| `cache` | **Merged → `openclaw doctor --fix`** | `openclaw doctor` | Cache reset functionality folds into the existing OC doctor's `--fix` surface. No separate command. |

---

## New `openclaw policy` verb not in `claws-cli` today

| Upstream command | Why it's new | Source |
|---|---|---|
| `openclaw policy verify` | Hash-chain integrity check on audit stream. New command per the upstream proposal (was part of `ops audit verify` in an earlier draft; flattened in this version). Handler calls `verifyAudit` from `@openclaw/policy`. | policy-commands.md |
| `openclaw policy sim` | Local mock OC gateway for the dev loop. Agent-facing endpoints. Distinct from `snap serve`. Handler calls `startMockGateway` from `@openclaw/policy`. | policy-commands.md |
| `openclaw policy diff` | Semantic PolicyIR diff between two snapshots. Delegates to `diffPolicyIR` library export. `snap diff` composes this at the CLI handler layer. | policy-commands.md |

These three have no direct `claws-cli` ancestor. They're new public surface introduced in the upstream contribution.

---

## Deliverable scope breakdown

- **Kept + renamed, contributed upstream**: 9 subcommands ⇒ `openclaw policy` (check/generate/watch/comply/test/sim/report/verify/diff) + 11 subcommands ⇒ `openclaw snap` (stage on/off, status, diff --staged, discard --stage, upload, list, diff, checkout, promote, rollback, discard, serve) = **20 handler sources contributed**.
- **Merged into existing `openclaw` commands**: `doctor` extensions, `upgrade` extensions, `cache` → `doctor --fix`, `drift` → `check`, `comply-eu-ai-act` → `comply --rubric eu-ai-act`.
- **Dropped — claws-internal only**: scan, keys, protect, annotate, init, extract, extract-watch, amend, kill, uninstall.
- **Open decisions**: publish, broadcast.

**Upstream contribution total**: one PR (PR-16 in the extraction plan) that lands `src/cli/policy/**`, `src/cli/snap/**`, and extends `src/cli/doctor.ts` + `src/cli/upgrade.ts`.

---

## Open items

- `openclaw-core`'s CLI extensibility model is undocumented in our proposal. PR-16 can't be written without confirming whether `openclaw` uses a plugin-style CLI or a direct-source-edit style. Phase 0 Discord thread should confirm this explicitly.
- Whether `openclaw doctor` and `openclaw upgrade` accept extensions from an external package, or whether the policy-aware checks need to live in openclaw-core source directly.
- Whether the filter-repo step retains git-history for the dropped subcommands (helpful for archaeology if we ever want to resurrect one) or aggressively prunes.
