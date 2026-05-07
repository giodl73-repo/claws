# code.md — code-side lenses

These are the lenses the bot evaluates on every PR after R0 (sources of truth) and R2 (drift) but before R4 (counter-search) and R5 (challenge). Each lens may cite a spec section located in R0; findings without spec grounding are weaker and live in the LQ stream by default.

## L1 — Rust safety

Lobster runtime is Rust. The clippy gates (Tier 1, Tier 2) are the contract.

**Watch for:**
- New `#[allow(<lint>)]` sites without a `reason = "..."` string. Convention from PR `bic/lobster#668` requires every allow site to document why the lint's auto-suggestion would be unsound.
- New `.unwrap()` / `.expect()` in production code without a documented invariant in a comment immediately above. PR `bic/lobster#657` landed `clippy::expect_used = deny`; new escapes need explicit allow + reason.
- `.await` while holding a non-async lock (`std::sync::Mutex`, `RwLock`). Use `tokio::sync` types or drop the guard explicitly before `.await`.
- New `Drop` impls that call `.await` (impossible — flag as definite bug) or that rely on async cleanup.
- Public APIs that take `String` where `&str` would do, or `Vec<T>` where `&[T]` would do, without justification.
- `unsafe` blocks without a `// SAFETY:` comment naming the invariant being upheld.

**Don't watch for** (handled elsewhere): formatting (`cargo fmt`), generic style (`harryf`), basic lints (CI enforces).

## L2 — plex-mock contract

`lobster_runtime` and `lobster_plex_mock` evolve in lockstep — this is the contract that lets PR-time CI run the same tests against both. The PR #618 family established the convention.

**Watch for:**
- New behavior added to `lobster_runtime` without matching support in `lobster_plex_mock`. Look for: new public functions / endpoints / event types, new error variants, new config fields used in dispatch.
- `Cargo.toml` version bumps in one but not the other (lockstep).
- Any test that passes against `lobster_runtime` but is `#[cfg(not(plex_mock))]`-gated or otherwise skipped against `plex_mock` without a justification.
- New `clippy::allow` site present in one and not the other — divergence in the lint contract.

**Yield**: divergence is not automatically a finding. The PR may have a justification ("plex-mock parity will land in the follow-up") — but that justification must be in the PR body. If absent, raise as Major drift:pr-code finding.

## L3 — OpenClaw integration shard

The OpenClaw container shard depends on lobster-side runtime contracts. Changes to dispatch, gateway routing, snap-restore, or the shard's expected wire format ripple into `bic/aether` and the public `openclaw/openclaw` fork.

**Watch for:**
- Changes to gateway routing logic (`gateway/`, dispatch table, route registration) — must be cross-checked against any paired `bic/aether` PR for the OpenClaw runtime side.
- snap-restore path changes — see `.craft/plans/claws-snap-restore.md` if present.
- New container-shard env vars, mount paths, or filesystem assumptions — these surface in aether's container spec.
- Anything that affects the openclaw upstream fork relationship — flag for cross-repo paired-PR coordination (W5 non-negotiable if no paired PR exists).

**Cross-references**: memory `project_openclaw_upstream.md`, `reference_eduardo_governance_design.md`.

## L4 — Azure Linux build resilience

Lobster builds on Azure Linux via OneBranch. Transient `tdnf` HTTP 429 rate limits are a recurring failure mode. PR `bic/lobster#648` extracted `scripts/tdnf-install-with-retry.sh` as the canonical retry path.

**Watch for:**
- New Dockerfiles or pipeline YAMLs invoking `tdnf install` directly without going through `scripts/tdnf-install-with-retry.sh`.
- New ADO tasks that don't set `retryCountOnTaskFailure: 1` (or higher) on image-build steps where transient failures are expected.
- Image-build context paths where `.dockerignore` is missing or stale — bloated context inflates push times and obscures which files are actually used.
- Backoff strategy regressions — current convention is linear (15/30/45/60/75s, ~3.75 min total). Changes to this need justification.

## L5 — lobster_web wire-format

Lobster_web (`bic/lobster`'s web host) consumes aether endpoints by exact field name. The wire format is **additive-only**.

**Watch for:**
- Pydantic alias changes (rename, removal) on response models consumed by lobster_web — non-negotiable W1 break unless paired with a lobster_web PR.
- SSE event name changes — the canonical set is `dx`, `fr`, `tool_use_start`, `message_end`, `error`, `cv`. Adding new is safe; renaming is breaking.
- camelCase vs snake_case drift — wire is camelCase via Pydantic alias; internal is snake_case. Verify the alias config is correct on every new field.
- Response field order/structure changes that would break consumers reading positionally (rare in JSON but happens with arrays-of-tuples).
- Streaming-response semantics — chunked vs buffered, content-length presence, `transfer-encoding: chunked` introduction or removal.

## L6 — Feature-flag and rollback discipline

Production behavior changes need a rollback story.

**Watch for:**
- New behaviors not gated by a feature flag where comparable past behaviors were gated. Look for `FEATURE_FLAGS__*`, runtime config keys, env-var-driven toggles.
- Per-route mounts that bypass per-request gating — see `bic/aether#7229` reviews where the lobster_workspace_router was initially conditionally mounted; the correct shape is unconditional mount + per-request gate so the kill-switch flips without a pod restart.
- Removed feature flags (W3 Strong) — yield only on evidence the flag has been measurably no-op.
- Default-on FF additions for risky surfaces — needs justification.

## L7 — Cross-repo ripples

Many lobster PRs have implications outside lobster.

**Watch for:**
- Changes that imply or require updates to:
  - `bic/aether` (paired PR for runtime / wire format / container shard)
  - `openclaw/openclaw` public fork (anything that should land upstream — refactors that benefit upstream, security fixes, public API extensions)
  - `bic/lobster-web` if separate from `bic/lobster` (host UI consumer)
  - `openclaw-maintainers` / openclaw upstream PR rules (see memory `project_openclaw_pr_rules.md`)
- Documentation drift surfaces:
  - `docs/API-REFERENCE.md` — endpoints / events / response shapes
  - `aether_runtime/CLAUDE.md` — cross-component contracts
  - `.craft/plans/` — if a plan exists for this area, does this PR change anything that plan asserts?
  - Memory references in this repo — see if any `reference_*.md` would now be stale.
- W8 boundary leak check — internal repo names, internal user emails, internal incident IDs in fork-bound files.
