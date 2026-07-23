# OC-POLICY-E Diagnostic ID Registry

**Purpose**: the authoritative registry of diagnostic IDs under the `OC-POLICY-E<nnn>` namespace. IDs are **permanent once assigned** — a rule may be retired but its ID is never reused.

**Scope**: governance-affecting diagnostics emitted by `@openclaw/policy` (the generator library) and `openclaw policy check` / `openclaw policy generate`. Structural / grammar-level diagnostics from `@openclaw/workspace/ast` live in a separate `OC-WS-E<nnn>` namespace (see that package's spec).

**Assignment process**: before filing any PR that introduces a new diagnostic, add a row here with a draft ID one greater than the highest assigned. Draft rows get finalised at merge. The registry is mutated in the same PR as the code that emits the diagnostic — no silent renumbering post-merge.

---

## Active diagnostics

| ID             | Rule                                                                       | Severity | Source                                  | Assigned   | Status |
| -------------- | -------------------------------------------------------------------------- | -------- | --------------------------------------- | ---------- | ------ |
| OC-POLICY-E001 | R5 rule must fail-closed (fail-open forbidden)                             | error    | `claws-sdk/src/ir/fail-mode.ts`         | 2026-04-19 | active |
| OC-POLICY-E020 | G-PERM: non-standard / unrecognized capability                             | error    | rule-family R01 validator               | 2026-04-19 | active |
| OC-POLICY-E025 | G-DATA: data-label synonym suggestion                                      | error    | rule-family R02 validator               | 2026-04-19 | active |
| OC-POLICY-E030 | G-A2A-TRUST: delegation-without-trust                                      | error    | rule-family R03 validator               | 2026-04-19 | active |
| OC-POLICY-E040 | G-PERM: fleet mandatory capabilities / emit-phase IR serialization         | error    | emit phase                              | 2026-04-19 | active |
| OC-POLICY-E042 | G-ELICIT-TIMEOUT: approveOnTimeout true / emit-phase plugin-code synthesis | error    | emit phase                              | 2026-04-19 | active |
| OC-POLICY-E060 | G-CONTEXT: per-sub-rule diagnostic codes (E060-01 through -08)             | error    | rule-family R06 validator               | 2026-04-19 | active |
| OC-POLICY-E065 | G-ELICIT: unmatched policy                                                 | error    | rule-family R07 validator               | 2026-04-19 | active |
| OC-POLICY-E066 | G-ELICIT: R5 tool without policy                                           | error    | rule-family R08 validator               | 2026-04-19 | active |
| OC-POLICY-E101 | Invalid .crest / workspace-file syntax                                     | error    | parse phase                             | 2026-04-19 | active |
| OC-POLICY-E201 | Rule conflict detected                                                     | error    | rule phase                              | 2026-04-19 | active |
| OC-POLICY-E230 | `args_from` transitive chains don't cycle                                  | error    | generator analyze phase                 | 2026-04-17 | active |
| OC-POLICY-E231 | R3+ tool consuming non-`user_prompt` without declared provenance           | error    | generator analyze phase                 | 2026-04-17 | active |
| OC-POLICY-E233 | IRREVERSIBLE_EXTERNAL capability without `args_from`                       | error    | generator analyze phase                 | 2026-04-17 | active |
| OC-POLICY-E301 | Emit-phase: empty artifact for platform                                    | error    | `claws-sdk/src/emit/platform-router.ts` | 2026-04-19 | active |
| OC-POLICY-E302 | Emit-phase: forbidden import in emitted artifact                           | error    | `claws-sdk/src/emit/platform-router.ts` | 2026-04-19 | active |
| OC-POLICY-E310 | Platform blocked by `--strict-loss`                                        | error    | emit phase                              | 2026-04-19 | active |
| OC-POLICY-E311 | No adapter registered for platform                                         | error    | emit phase                              | 2026-04-19 | active |
| OC-POLICY-E401 | Modifications by unauthorized roles                                        | error    | compile phase                           | 2026-04-19 | active |

(Gap at OC-POLICY-E232 reserved; do not reassign.)

---

## Retired diagnostics

| ID  | Former rule | Retired | Reason | Replacement |
| --- | ----------- | ------- | ------ | ----------- |
| —   | (none yet)  | —       | —      | —           |

---

## Legacy-prefix consolidation (Ra pulse 59)

Diagnostic IDs previously lived under a craftworks-internal prefix that used the scope name the packages carried before the pre-extraction consolidation (`claws` shortcode, suffixed `-E`). Pulse 59 (wave `ra-the-radiant`, checkpoint 12) renamed all such IDs to the `OC-POLICY-E<nnn>` namespace with the numeric suffix preserved across code, tests, docs, design specs, scenarios, and wave records. The rename was executed by a commit-level regex sweep before the Horus filter-repo step, so the pre-filter working tree and the post-filter `bic/claws` tree share a single namespace.

Audit summary:

- 1 deterministic rewrite script (`/c/src/craftworks/.craft/out/p59-rename.py`, self-excluded)
- 95 files touched (see `/c/src/craftworks/.craft/out/p59-rename-report.txt` for the full list)
- 270+ occurrences replaced, numeric suffixes preserved
- The registry is the only place documenting the rename; git history carries the full audit trail

Any new diagnostic introduced between now and extraction-time gets its `OC-POLICY-E<nnn>` ID assigned in this registry at authoring-time.

---

## Adjacent namespaces

- `OC-WS-E<nnn>` — workspace-file structural / grammar diagnostics from `@openclaw/workspace/ast` (parse errors, schema violations). Maintained separately in that package's `diagnostic-registry.md`.
- `OC-POLICY-SECRET-<level>` — `@openclaw/guardrails/secrets` findings surfaced as diagnostics (e.g., `OC-POLICY-SECRET-HIGH` per `guardrails.md` `/secrets` subpath). Not numeric-ID-assigned; level is the identifier.

---

## Open items

- Whether this registry lives alongside the upstream proposal (current location) or moves to `openclaw-core/packages/policy/docs/` post-extraction. Current assumption: the final home is the openclaw-core tree, but the pre-extraction copy here starts the process.
- Owner assignment for the registry post-extraction (suggested: `@openclaw/policy` maintainer, whoever that is after the contribution lands).
- Numeric-suffix preservation: the Ra pulse 59 rename kept every suffix identical; any post-extraction renumber collisions are resolved here by retiring and replacing (never re-using the retired number).
