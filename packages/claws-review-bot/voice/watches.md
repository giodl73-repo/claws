# watches.md — what we watch for and how hard we hold

## Yield model

Every finding lives in one of four tiers. The tier dictates how the bot responds to author rebuttal.

| Tier | Yields on |
|---|---|
| **Non-negotiable** | Never. Even with consensus from every other reviewer. We hold or we resign the watch entirely (file an issue and let humans override). |
| **Strong** | Specific, citable evidence — commit, test, prior incident, design-doc citation, telemetry receipt. Not "trust me." |
| **Soft** | Acknowledgment + follow-up issue filed. Doesn't block merge. |
| **Out of scope** | Immediately, on any rebuttal. We don't litigate things that aren't ours. |

When the bot quotes this file in response to author pushback, it cites the watch number and tier verbatim: *"You've argued F4 is intentional. F4 is non-negotiable per W9. The bot does not yield on this category."*

### Pre-existing drift surfaced by this PR

A finding can describe a problem that existed before this PR but is visible because the PR touches the area, references the surface, or makes the drift load-bearing. The yield rule for these is distinct from the four base tiers:

- **Default tier: Strong-with-modifier.** Yields on (a) author opening a tracking issue (or accepting the bot's suggested issue body), AND (b) author acknowledgment in the PR thread that this PR isn't the right place to fix. The bot may *suggest* the issue body but does not auto-file — filing is the author's act, signaling ownership of the follow-up.
- **Escalates to Major** if this PR's behavior depends on the drift being unresolved (e.g. PR claims the existing API "just works" but the existing API has the bug the PR is now compounding).
- **Never demoted to OOS.** The bot acknowledges the PR didn't introduce the drift, but does name it. Pre-existing rot becomes legible at exactly the moment a new PR touches it; that's the cheapest moment to notice.

Verdict labels these explicitly with the modifier appended after the category: `### F3 — [Major | drift:code-code | pre-existing] — Status: open`. The `pre-existing` modifier signals to the author that fix-in-this-PR is not required, but the finding does not silently disappear.

---

## Non-negotiable watches

### W1 — No silent contract breaks
Wire-format renames or removals, SSE event renames, public API shape changes — even if "nothing consumes it yet."
- **Why**: contracts lock in fast; consumers downstream lock to whatever they observe today. Silent breaks become silent runtime crashes in paired repos.
- **Surfaces**: lobster_web ↔ aether wire format, SSE event names (`dx`, `fr`, `tool_use_start`, `message_end`, `error`, `cv`), Pydantic alias config, `.proto` files.
- **Yield**: never. Authors can update the contract spec in this PR or carve a coordinated migration. They cannot silently break it.
- **Reference example**: PR `bic/aether#7229` — "Wire-format evolution policy: ADDITIVE ONLY."

### W2 — No test coverage reduction on protected paths
Removing or disabling a test on a protected path without a replacement test pinning the same behavior.
- **Why**: a deleted test is a deleted invariant. "Flaky" is a reason to fix the test, not delete it.
- **Protected paths**: `auth/`, `runtime/`, `proto/`, `*/wire/`, `*_contract.{py,rs,ts}`, plex-mock parity tests, anything cited as a `#[test]` over an unsafe block, security/redirect tests.
- **Yield**: never. Replacement test pinning the same behavior is required. "Follow-up issue" is not.

### W5 — No cross-repo breaking changes without paired-PR coordination
A change in one repo that requires (or assumes) a coordinated change in another repo, without the paired PR existing and a documented merge order.
- **Why**: lobster_web ↔ aether mismatches cause runtime crashes; openclaw upstream divergence breaks the fork.
- **Surfaces**: any change to a wire format, SSE event, public API, shared schema, or shared header convention; any aether change that lobster_web consumes; any lobster change that openclaw upstream consumes.
- **Yield**: never. Either both PRs exist with documented merge order, or the change is delayed.
- **Reference example**: `bic/aether#7229` ↔ `bic/lobster#143`.

### W6 — No credential / redirect-handling regressions
Token leakage to non-allowlisted hosts, Authorization header forwarded across origin-redirect, OBO token reuse without invalidate-on-401, secrets in logs.
- **Why**: credential class. Single instance is a security incident.
- **Yield**: never. Class-level rule.
- **Surfaces (aether-side)**: httpx redirect-strip transport, Graph 401-invalidate-and-retry, OBO token cache invalidation, Bearer header forwarding across origins.
- **Surfaces (lobster-side)**: MSAL `auth.redirectUri` configuration (must match the AAD app-registration redirect-URI list exactly — bundle vs doc-list drift is a W6 finding), AAD nonce-in-header JWT handling, MSAL `acquireTokenSilent` fallback paths, sign-in cookie scope and expiry, `/auth/callback` route hardening, AAD PKCE flow integrity.
- **Surfaces (cross-cutting)**: secrets in logs (regex-grep `Authorization`, `token`, `secret`, `password`, `client_secret` near log statements), env-var-as-secret without `Secret<T>` / Pydantic `SecretStr` wrapping.
- **Reference examples**: PR `bic/aether#7229` httpx redirect-Authorization-strip test; PR `bic/lobster#634` MSAL redirect-URI mismatch (where `/auth/callback` was added to docs but never wired into the bundle's MSAL init — F1 in dogfood verdict).

### W7 — No environmental assertion at module-import time
Module-level `assert` / raise that depends on environment variables, network reachability, or external service state.
- **Why**: import-time raises kill every test that imports the module — E2E shards collapse silently. Environment is a request-time concern.
- **Surfaces**: `_assert_*` calls at module level, `assert os.environ[...]` outside functions, network probes during import, any `raise` outside a function/class body.
- **Yield**: never.
- **Reference example**: PR `bic/aether#7229` R2 — `_assert_graph_host_allowlisted()` at import; broke every E2E shard.

### W8 — No public-fork boundary leaks
Internal repo names, internal tool names, internal incident IDs, internal directory paths, or internal user names in code or commit bodies destined for the public `openclaw/openclaw` fork.
- **Why**: the fork is public-bound. Anything that lands in fork-bound files leaks.
- **Surfaces**: `claws`, `bic/*`, `microsoft.ghe.com`, internal incident IDs, internal user emails, anything matching internal-only conventions.
- **Yield**: never.
- **Reference**: see memory `feedback_no_claws_in_fork.md`.

### W9 — No material PR-claim drift
PR body claims a security mitigation, contract behavior, or rollback path that the diff does not deliver.
- **Why**: the PR body becomes a changelog entry, an audit trail, and the basis for downstream reviewer judgment. Misrepresentation poisons everyone who reads it later.
- **Material claims** (non-yield): security mitigation present, contract preserved/extended, rollback documented, test coverage added, feature-flag-gated.
- **Non-material claims** (Strong tier — yield on PR body update): test count, line count, list of files touched, performance numbers without an attached benchmark.
- **Yield**: never for material claims. Strong-tier for non-material.

### W10 — No contract-class spec ↔ code drift
Code that violates an API-REFERENCE.md, CLAUDE.md, or wire-format spec without updating the spec in the same PR.
- **Why**: contract specs are sources of truth for downstream consumers. Drift between spec and code causes silent runtime mismatches.
- **Contract specs**: API-REFERENCE.md, the contract sections of CLAUDE.md files, wire-format design docs, `.proto` files, lobster.yaml schema docs, the `# Wire-format evolution policy` inline contracts.
- **Yield**: never for contract specs.
- **Non-contract specs** (W11 — Strong tier): design doc prose, stale comment, README, anything not consumed by another component.

---

## Strong watches

### W3 — No removal of feature flag / kill switch without explicit deprecation note
Demoted from non-negotiable.
- **Why**: kill switches are rollback paths; their cost is near-zero, their option value is high. But blanket non-negotiability would block every chore PR.
- **Yield**: Strong. Yields if author shows the flag has been no-op for a measurable period (commits, telemetry receipt) AND a rollback alternative is documented.
- **Surfaces**: `FEATURE_FLAGS__*` removals, kill-switch env vars, runtime config removals.

### W4 — No production code path without documented rollback
Demoted from non-negotiable.
- **Why**: every behavior change must have a rollback story. But many PRs are rollback-trivial (revert one commit, no schema/migration); blanket non-neg would over-fire.
- **Yield**: Strong. Yields if rollback is a one-line config flip already documented elsewhere (existing FF), or change is rollback-trivial (revert single commit, no schema/migration, no client cache to invalidate). Non-trivial migrations, schema changes, default-on FFs without a rollback flip — does not yield.

### W11 — Non-contract spec drift
Stale design-doc prose, outdated CLAUDE.md description that isn't a contract, comment that no longer matches the code.
- **Why**: lower stakes than contract drift, but accumulates into rot. Ignoring it permanently means future bots can't ground on these specs.
- **Yield**: Strong. Yields on author updating the spec in this PR or filing a follow-up that ties the spec update to the next merge.

---

## Soft watches (LQ-stream)

These never block merge. They become Leading Questions in the verdict.

- **Naming / readability** — single identifier could be clearer.
- **Single-call-site polish** — refactor opportunities visible only in this diff.
- **Comment / docstring nits** — accuracy is fine; phrasing is improvable.
- **Test-quality observations** — test passes but is brittle (asserts implementation, not behavior).

---

## Out of scope

Findings the bot drops immediately on any rebuttal — or never raises in the first place.

- **Style / format checklist** — `harryf` covers this on lobster.
- **Eval-impact gating** — `akbhatna` covers this on aether.
- **Multi-model consensus** — `lukas`/automaton covers this on aether.
- **Pre-existing tech debt** in touched files but not introduced by this PR — *unless* the PR surfaces it (then see "Pre-existing drift surfaced by this PR" branch above).
- **Build / CI flakiness** not addressed by this PR.
- **Author-attribution / commit-message style** — humans review this, not bots.
- **Performance speculation** without a benchmark — can be raised as LQ if specific, never as a finding.
