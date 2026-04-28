---
spec: UG
version: 0.2
status: draft-amendment
extends: CL-11
applies_to: docs/upstream/specs/UG-upstream.md
applies_at: deploy stage of wave 260427+hapi-the-bringer+openclaw-upstream
source_version: 0.1
wave: 260427+hapi-the-bringer+openclaw-upstream
drives_r1_findings: [B2, W3, W4, W6, W8, W9]
companion_atoms_update: specs/drafts/ATOMS.amend.md
companion_changelog_update: specs/drafts/CHANGELOG.amend.md
---

# UG-upstream — Amendment v0.2 (DRAFT)

**Extends**: CL-11
**Source spec**: `docs/upstream/specs/UG-upstream.md` v0.1
**Wave**: `260427+hapi-the-bringer+openclaw-upstream`
**Status**: Draft amendment, pending review at scenarios stage

## Reader's guide — what changed in v0.2

v0.1 had five sections: Contribution roadmap, Decide/track/enforce+review, R5 pre-merge guard, PR sequencing, Scope-flip at publish.

v0.2 **reorganizes** v0.1 as follows:
- §1 (this amendment) replaces v0.1's "Contribution roadmap"
- §8 supersedes v0.1's "PR sequencing"
- §9 supersedes v0.1's "Scope-flip at publish"
- v0.1's "Decide / track / enforce+review" and "R5 pre-merge guard" sections **remain in force unchanged**

v0.2 **adds** §2–§7 and §10–§11 as entirely new sections covering: bot-reviewer operating constraints (§2), enforcement-model shift to runtime-gated (§3), trust-set lifecycle (§4), approval lifecycle audit events (§5), audit attribution (§6), temporal queries (§7), the diff-vs-v0.1 summary (§10), and open items deferred to scenarios stage (§11).

The five material changes:

1. **Revised OC-PR roadmap** — adapts to upstream HEAD `5e8cc1d9c` after ~4785 commits of drift since the OneDrive proposal was written 2026-04-18. Six of seven original PRs are dropped, moved, or narrowed; only OC-4 and OC-7 land as surgical upstream PRs.
2. **Bot-reviewer operating constraints** — surfaces upstream's actual review trio (Greptile + Copilot + chatgpt-codex) and the operational rules they enforce.
3. **Enforcement-model shift** — without OC-1/OC-2 hooks, file governance is runtime-gated (via `before_agent_start`), not write-blocked. Hosts requiring write-blocking deploy `@openclaw/snap` in `stage on` posture.
4. **Trust-set lifecycle** — addresses HC-BLOCK B2: ComplianceReport signature key rotation, versioning, and revocation policy.
5. **Approval lifecycle audit events + audit attribution + temporal queries** — addresses HC-WARN W3, W4, W6.

---

## §1. Revised contribution roadmap (replaces v0.1 § "Contribution roadmap")

**Original v0.1 plan**: 7 OC-core PRs (OC-1..OC-7) plus an optional first-class metadata path (OC-8..OC-10).

**Revised v0.2 plan**: 2 surgical OC-core PRs (OC-4 + OC-7); the remaining 5 are dropped, moved, or narrowed.

| # | Original v0.1 | Status v0.2 | Disposition |
|---|---|---|---|
| OC-1 | Hook: `before_workspace_file_ingest` | **DROPPED** | No upstream appetite for workspace-level hooks. Workaround: governance via `before_agent_start` + generated-policy runtime checks. **Note**: shifts enforcement model from write-time prevention to runtime gating; see §3. |
| OC-2 | Hook: `after_workspace_file_ingest` | **DROPPED** | Mirror to OC-1; same disposition. Audit file ingests via the policy plugin's internal event log, not OC's hook stream. |
| OC-3 | Content hash on workspace cache (`src/agents/workspace.ts`) | **MOVED** | Compute snapshotIds in `@openclaw/snap` at snapshot-commit time, not in OC-core's workspace cache. Cleaner separation; no upstream PR required. |
| OC-4 | Preserve originals in `stripFrontMatter` (`workspace.ts:91`) | **LANDING** | Surgical PR (~1 line). Preserves original bytes under sibling `raw` key. Non-breaking. Required for governance round-trip on templated SOUL.md / TOOLS.md. |
| OC-5 | Extend exec-approval audit event taxonomy | **NARROWED** | Original asked for 5 new categories (`file_ingest`, `policy_generate`, `snapshot_promote`, `snapshot_rollback`, `provider_quarantine`). Hardcoded enum upstream is unlikely to accept full reshape. Proposal narrowed to: add `custom_approval` extensible enum value. Our audit manifest carries the specific category in metadata. |
| OC-6 | Optional bootstrap deferral hook (`bootstrap-files.ts`) | **DROPPED** | Same as OC-1: hook surface won't land. Govern first-load via `before_agent_start` and block if unvetted bootstrap detected. |
| OC-7 | `requireApproval` envelope stickiness | **LANDING** (corrected) | **Original wording said "field-widening from `boolean` to `boolean \| ApprovalDescriptor \| ApprovalDescriptor[]`" — that is wrong vs current upstream.** Per `src/plugins/hook-types.ts:402-410`, the field is already object-only. The real bug is at `src/plugins/hooks.ts:889-893`: the merger uses `??` (nullish coalesce), absorbing all downstream approvals. Surgical PR (~5 lines): replace `??` with array accumulation; field type bumps from `ApprovalDescriptor` to `ApprovalDescriptor \| ApprovalDescriptor[]`. Codemod migration note covers array-coercion (no boolean was ever in scope). |
| OC-8/9/10 | First-class native risk + sensitivity metadata | **STAYS IN OUR DOMAIN** | Upstream has zero native concept of R0–R5 / PUBLIC–RESTRICTED. The R0–R5 + sensitivity taxonomy lives entirely in `@openclaw/policy`'s generator and emitted plugin. No upstream PR required. If upstream later adopts native risk metadata, we reduce the emitted plugin from ~200 lines to ~30; backward-compatible via generate flag. |

The four packages (`@openclaw/workspace`, `@openclaw/guardrails`, `@openclaw/policy`, `@openclaw/snap`) ship standalone against today's upstream hook surface. They function with or without OC-4 + OC-7 merging — those PRs are quality-of-life surgical fixes, not dependencies.

---

## §2. Bot-reviewer operating constraints (NEW — not in v0.1)

The OneDrive proposal assumed a human area-owner review team. That assumption was wrong. Upstream's review trio is:

- **`greptile-apps[bot]`** (Greptile)
- **`copilot-pull-request-reviewer[bot]`** (GitHub Copilot)
- **`chatgpt-codex-connector[bot]`** (ChatGPT Codex)

All three tag findings P1/P2/P3 inline. Maintainers self-merge after the author replies "Fixed in `<sha>`" to inline comments. Median time-to-merge is **<4 hours**. One review round is typical.

### §2.1 Operating constraints (authoritative; the companion guide is a tactical playbook)

The following constraints are the spec contract; the bot-preempt-checklist guide (H6 deliverable) is a tactical playbook that operationalizes them per-PR.

| # | Constraint | Source / mechanism |
|---|---|---|
| C1 | **10-PR-per-author cap** at `openclaw/openclaw` | Auto-close on PR #11; recorded in `CONTRIBUTING.md` |
| C2 | **≤ 2 PRs open simultaneously** by the same author | House culture; not enforced by bot but observed; pacing must respect it |
| C3 | **`plugin-sdk-api-baseline.sha256` must update** for any public-API addition | File at `docs/.generated/plugin-sdk-api-baseline.sha256`; CI fails on stale hash |
| C4 | **`docs/sdk-overview.md` table must update** for any public-API addition | Reviewers explicitly flag missing entries |
| C5 | **Swift protocol models must regenerate** for any gateway protocol change | Files at `apps/macos/Sources/OpenClawProtocol/GatewayModels.swift` and `apps/shared/OpenClawKit/Sources/OpenClawProtocol/GatewayModels.swift` |
| C6 | **CHANGELOG entries land at end-of-section**, never mid-section | Cited in PR review comments; `CLAUDE.md` references this rule |
| C7 | **`CLAUDE.md` is authoritative** | Reviewers cite it; read before opening any PR |
| C8 | **No refactor-only PRs accepted** | Cleanup must accompany a concrete fix |
| C9 | **`r:third-party-extension` and `r:skill` are auto-close labels** | If the package looks like it belongs on ClawHub instead of core, the PR auto-closes; PR description must lead with WHY governance must be core |
| C10 | **Plugins are treated as adversarial input** | Every new plugin API must scope by `pluginId`, never trust caller-supplied keys; host-boundary input validation is mandatory |

Companion guide (forthcoming H6 deliverable): `docs/upstream/guides/bot-preempt-checklist.md` operationalizes each constraint into a per-PR checkbox list with command snippets and citation anchors. The guide is tactical; this section is normative — if the guide and the spec disagree, the spec wins.

---

## §3. Enforcement model: runtime-gated, not write-blocked (NEW — addresses W9)

The original v0.1 spec assumed file-ingest hooks (OC-1/OC-2) would govern *file writes at persist-time* — catch edits to SOUL.md, TOOLS.md, AGENTS.md before they reach disk.

In v0.2, with OC-1/OC-2 dropped, enforcement shifts to **runtime gating**:

- The generated policy plugin's `before_agent_start` hook runs AFTER files load (`hook-before-agent-start.types.ts:59-68`).
- The plugin can audit + block agent execution but **cannot prevent the write itself**.
- Hostile-write-then-read flow: an attacker writes a malicious edit; the runtime gate catches it before the agent acts on it; the file remains on disk until manually rolled back.

**Mitigations**:

1. The runtime gate is sufficient if the threat model is "agent acts on bad file," not "bad file persists on disk."
2. Hosts that need write-time prevention deploy `@openclaw/snap` in `stage on` posture: edits land in `.openclaw/.stage/`, not canonical, until promoted. Validation runs against `.stage/` before promotion.
3. Hostile-write-then-read scenarios are exercised in the scenarios stage as L1 integration tests (per W9 apply-back).

**Adapter audit** (`docs/upstream/guides/adapter-audits.md`) must document this enforcement-model shift explicitly: "OC-1/OC-2 dropped; enforcement is runtime-gated via `before_agent_start`, not write-blocked. Hosts requiring write-blocking deploy snap in `stage on`."

---

## §4. Trust-set lifecycle (NEW — addresses HC-BLOCK B2)

ComplianceReports emitted by `openclaw policy comply` are signed. Without a key lifecycle policy, compromised keys break historical-report verifiability — a SOC 2 / HIPAA audit failure mode.

### §4.1 Key registry

The signing key registry is a content-addressable file at `.openclaw/trust-set/keys.json`:

```json
{
  "keys": [
    { "keyId": "ts-2026-q2", "algo": "hmac-sha256", "createdAt": "2026-04-01T00:00:00Z", "status": "active", "rotatedAt": null, "revokedAt": null },
    { "keyId": "ts-2026-q1", "algo": "hmac-sha256", "createdAt": "2026-01-01T00:00:00Z", "status": "rotated", "rotatedAt": "2026-04-01T00:00:00Z", "revokedAt": null }
  ],
  "active": "ts-2026-q2"
}
```

### §4.2 Key states

- **active** — used for new signatures
- **rotated** — superseded by a newer active key, but still valid for verifying historical reports signed by it
- **revoked** — compromised; reports signed by this key are flagged as potentially-tampered until counter-signed by an active key

### §4.3 Rotation policy

- **Cadence**: quarterly minimum, more often if compromise suspected
- **Grace period**: rotated keys remain valid for verification for 24 months minimum (regulatory retention floor)
- **Revocation**: triggered manually by the trust-set owner; once revoked, all reports signed by that key require counter-signing or re-issue

### §4.4 Key audit events

Every key lifecycle event emits an audit entry into the hash-chained audit log:

- `trust_set_key_created` — new key minted; includes `keyId`, `algo`, `createdAt`, `creatorPrincipal`
- `trust_set_key_rotated` — active key rotated; includes `oldKeyId`, `newKeyId`, `rotatedAt`, `rotatorPrincipal`
- `trust_set_key_revoked` — key revoked; includes `keyId`, `revokedAt`, `revokerPrincipal`, `reason`
- `trust_set_compliance_report_signed` — every signed report emits this with `reportId`, `keyId`, `signedAt`

### §4.5 Verification path

`openclaw policy verify --report <id>` checks the report's signature against the keys.json registry, returns one of:

- **valid** — signed by an active or rotated key, signature matches
- **expired** — signed by a rotated key past its grace period
- **revoked** — signed by a revoked key (no counter-sign present)
- **invalid** — signature mismatch (tamper-evident)

---

## §5. Approval lifecycle audit events (NEW — addresses HC-WARN W3)

The original v0.1 spec mentioned approvals but did not require lifecycle-event emission. Without these, e-discovery cannot answer "which approval handles were issued on date X and never executed?"

Every approval handle emits THREE audit events over its lifetime, all into the same hash-chained audit log:

1. **`approval_issued`** — at handle issue time
   - Fields: `handleId`, `providerId`, `sourcePluginId`, `categoryHint`, `severity`, `ttlSeconds`, `issuedAt`, `boundContentHash`
2. **`approval_resolved`** — at supervisor approval / denial / modify
   - Fields: `handleId`, `resolution: 'approved' | 'denied' | 'modified'`, `resolverPrincipal`, `resolvedAt`, `responseHash`
3. **`approval_expired`** — at TTL expiry without resolution
   - Fields: `handleId`, `expiredAt`, `wasUsed: false`

The `approval_expired` event is the key compliance gate: regulators querying "which approvals timed out unused" filter the audit log for this event over their date range. No separate "unused-handle registry" needed — the audit chain is the registry.

L1 integration test (per W3 apply-back): issue handle, let it expire, assert chain contains both `approval_issued` and `approval_expired` for the same `handleId`.

---

## §6. Audit attribution (NEW — addresses HC-WARN W6)

The original `AuditEntrySummary` had `actor` as optional. Per ciso review W6, audit events must be traceable to the plugin that emitted them, or chain of custody breaks.

### §6.1 Mandatory `sourcePluginId`

`AuditEntrySummary` (in `@openclaw/guardrails/audit`) gains a NON-OPTIONAL `sourcePluginId: string` field. The hash-chained audit verifier rejects entries missing this field; the registry's `postAudit()` cross-checks it against `providerId` from the originating decision, raising a chain-integrity violation if mismatched.

```ts
export interface AuditEntrySummary {
  // ... existing fields ...
  sourcePluginId: string;  // required, non-optional in v0.2
  actor?: { principal: string; identitySource: string };  // unchanged, optional
}
```

### §6.2 Migration

Existing audit entries in the wild lack the field. Verification mode `--lenient` accepts entries without `sourcePluginId` for entries timestamped before the v0.2 spec adoption date. Strict mode (default for new chains) rejects them.

### §6.3 Adversarial-plugin defense

A plugin attempting to spoof another plugin's audit attribution (e.g., plugin-A emits an entry claiming `sourcePluginId: 'plugin-B'`) is rejected at the registry's `postAudit()` boundary, which always overrides `sourcePluginId` to the authenticated caller's identity. Plugin-supplied `sourcePluginId` in the entry payload is treated as a hint, not as ground truth.

---

## §7. Temporal query semantics (NEW — addresses HC-WARN W4)

E-discovery requirement: "what policy was in force on 2026-09-15 at 14:32 UTC?"

The original v0.1 design produced content-addressable snapshotIds, but had no time-indexed query interface — answering this required manual reconstruction from snapshot list + audit log timestamps.

### §7.1 New CLI verb: `snap resolvePolicy`

```
openclaw snap resolvePolicy --at <iso8601-timestamp> [--workspace <name>]
```

Returns:
```json
{
  "snapshotId": "sha256:3a7f...",
  "policyIrPath": "oc://snapshot/3a7f.../policy/policy-ir.json",
  "promotedAt": "2026-09-15T13:42:00Z",
  "supersededAt": "2026-09-16T08:00:00Z",
  "queriedAt": "2026-09-15T14:32:00Z",
  "evidence": {
    "promote_event": "audit-entry-uuid-1",
    "supersede_event": "audit-entry-uuid-2"
  }
}
```

The query walks the audit log for `snapshot_promote` / `snapshot_rollback` / `snapshot_supersede` events; the snapshot whose promote-window contains the queried timestamp is the answer.

### §7.2 Synchronization invariant

- Every `snap promote` emits a `snapshot_promote` audit event with `promotedAt = systemClockMonotonic()`.
- Every subsequent promote / rollback emits `snapshot_supersede` against the previous current.
- The audit chain is the source of truth for "which snapshot was current when."

### §7.3 Scenario

`upstream/snap-policy-historical-query` (NEW) — given a workspace with three promoted snapshots over a two-day window, query at a timestamp inside each promote-window and assert the returned snapshotId matches.

---

## §8. Amended PR sequencing (replaces v0.1 § "PR sequencing")

Cross-package changes still land in dependency order: workspace → guardrails → policy/snap → claws-sdk → consumers. The change in v0.2: pacing is **2 PRs open at a time at upstream**, which translates to three sub-waves:

1. **Wave A** (PR-1 workspace + PR-2 OC-4) — open simultaneously
2. **Wave B** (PR-3 guardrails + PR-4 OC-7) — opens after Wave A merges
3. **Wave C** (PR-5 policy + PR-6 snap) — opens after Wave B merges; PR-5 and PR-6 open simultaneously since runtime-independent

Out-of-order commits within a sub-wave still fail the sequencing lint.

---

## §9. Amended scope-flip mechanics (replaces v0.1 § "Scope-flip at publish")

Per R1-consolidated finding B1, scope-flip (`@bic/openclaw-*` → `@openclaw/*` rename across our monorepo) is now **inside scope** as the closing deliverable of cp-4. The ordering invariant:

1. Four upstream package PRs (PR-1, PR-3, PR-5, PR-6) all merged at openclaw/openclaw
2. Internal scope-flip PR lands on this monorepo
3. `@openclaw/*` npm publish (gated on Microsoft public-release path)

Step 2 must precede step 3 to avoid the transient versioning gap where internal lockfiles still point at `@bic/*` while npm publishes `@openclaw/*`.

---

## §10. Diff vs v0.1 — summary

| Section | v0.1 | v0.2 |
|---|---|---|
| OC-PR count | 7 (+ optional 3) | 2 (OC-4 + OC-7) |
| Hook surface PRs | OC-1, OC-2, OC-6 | dropped |
| Workspace cache PR | OC-3 | moved to snap |
| Audit taxonomy PR | OC-5 (5 new categories) | OC-5 (narrowed: `custom_approval` enum) |
| Risk + sensitivity | optional first-class (OC-8/9/10) | stays in our domain |
| Reviewer model | human area-owner | bot trio (Greptile + Copilot + chatgpt-codex) |
| Enforcement model | write-time + runtime | runtime-only (write-time via snap stage-on opt-in) |
| Trust-set lifecycle | not specified | §4 NEW |
| Approval audit events | not specified | §5 NEW (issued / resolved / expired) |
| Audit attribution | optional `actor` | mandatory `sourcePluginId` |
| Temporal queries | not specified | §7 NEW (`snap resolvePolicy --at`) |
| PR sequencing | dependency order | + 2-PR-open concurrency |
| Scope-flip | out-of-scope | in-scope, cp-4 closing deliverable |

---

## §10a. URI scheme extension to runtime config (NEW — addresses PR-2 of revised wave plan)

The original `oc://` URI scheme addresses workspace files (`oc://TOOLS.md/Tools/send-email/args_from`). v0.2 extends the scheme to address openclaw's runtime config tree alongside workspace files.

### §10a.1 Dual addressing modes

Two URI forms, one vocabulary:

```
oc://{file}[/{section}[/{item}[/{field}]]]               # workspace files
oc://config/{section}[/{key}[/{subkey}]][/{index}]       # runtime config
```

Examples:
- `oc://TOOLS.md/Tools/send-email/args_from` — workspace tool field
- `oc://SOUL.md/Boundaries/deny-rule-1` — workspace deny rule
- `oc://config/channels/matrix/accessToken` — runtime config leaf
- `oc://config/channels/telegram/allowFrom/0` — array index in config
- `oc://config/plugins/installed/bundled-runtime-deps` — plugin config subtree

### §10a.2 Resolver semantics

`resolveConfigUri(uri, configRoot)` walks the OpenClawConfig object tree following the URI path; returns `{ value, parentNode, leafKey, found }`. Errors are structured:

- `OC_CONFIG_PATH_NOT_FOUND` — path component doesn't resolve
- `OC_CONFIG_PATH_AMBIGUOUS` — wildcard or pattern didn't reduce to a single leaf
- `OC_CONFIG_PATH_INVALID` — path syntax error (e.g., negative array index)

Workspace-file resolution (`resolveWorkspaceUri`) is unchanged from v0.1.

### §10a.3 Diagnostic-location format

Doctor's diagnostic emitter (extended in PR-1) accepts location as either `{file: string, line?: number}` (existing form) or `{ uri: string }` (new form). PR-1 introduces the URI form for workspace-file diagnostics; PR-2 extends use to runtime-config diagnostics.

### §10a.4 Snap HTTP resolution

`@openclaw/snap`'s HTTP server (PR-7) exposes `GET /v1/resolve?uri=oc://...` accepting BOTH forms. Workspace-file URIs resolve against the current snapshot's workspace files; config URIs resolve against the snapshot's captured runtime config.

### §10a.5 Backward compatibility

The v0.1 URI form (`oc://{file}/...`) is bit-for-bit unchanged. v0.2 only ADDS the `oc://config/...` form. Existing parsers reject the new form with their existing error envelope until they're upgraded; that's acceptable because the resolver is opt-in per consumer.

### §10a.6 Security note

`oc://config/...` URIs in audit logs may contain references to sensitive config fields (e.g., `oc://config/channels/matrix/accessToken`). The URI itself is just a path; it does NOT carry the value. SIEM exporters that today redact value fields continue to redact; URI fields are non-sensitive (they're paths, not data).

---

## §11. Open items for scenarios stage

Items deferred to scenarios stage (listed here so the scenario writer doesn't lose them):

- **W7 (ciso) — OC-7 merger crash-safety**: OC-7 adopts array accumulation (per §1's corrected disposition), so plugin-A's `requireApproval` cannot be silently overwritten by plugin-B's allow. The crash-safety question is: if plugin-A appends `requireApproval` and plugin-B THROWS before it returns, does the conjunctive invariant still hold? Scenario must verify the merger does NOT downgrade to allow when a downstream plugin crashes mid-emission. Maps to L1 integration test.
- **W9 (gateway-eng) — runtime-gated enforcement**: hostile-write-then-read flow exercising the runtime-gated model from §3. Attacker writes a malicious edit to SOUL.md / TOOLS.md; assert that the runtime gate (`before_agent_start`) catches the violation BEFORE the agent acts on the file. Writes still land on disk; rollback is via `snap rollback`. Scenario must distinguish "write-time prevention" (only available with snap stage-on) from "runtime-gated catch" (always available).
- **N4 (compliance) — rubric → control mapping**: map SOC 2 + HIPAA rubric requirements to specific audit predicates. Concrete targets: SOC 2 CC6.1 (logical access), CC7.2 (audit log coverage), CC7.3 (security incident response); HIPAA §164.312(b) (audit controls), §164.312(d) (information access management). Each rubric requirement must trace to ≥1 audit predicate.

### §11.1 Companion-guide flag

`docs/upstream/guides/contribution-workflow.md` is currently aligned with v0.1 of this spec. After v0.2 deploys, it must be amended (or marked superseded) to reflect:

- The runtime-gated enforcement model (§3)
- The bot-reviewer trio + 10-PR cap + 2-open concurrency (§2.1)
- The new bot-preempt-checklist + adapter-audits companion guides
- The corrected OC-7 disposition (array adoption, not field-widening)

This update is part of the H6 deliverable bundle; the contribution-workflow guide and the new bot-preempt-checklist guide land together.
