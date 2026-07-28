# code.md — code-side lenses

These are the lenses the bot evaluates on every PR after R0 (sources of truth) and R2 (drift) but before R4 (counter-search) and R5 (challenge). Each lens may cite a spec section located in R0; findings without spec grounding are weaker and live in the LQ stream by default.

## L1 — Rust safety

Lobster runtime is Rust. The clippy gates (Tier 1, Tier 2) are the contract — but the contract is broader than clippy. The watches below are grounded in patterns we run in our own Rust codebases (`icelines`, `apportionment`, `craft`); when an author challenges a watch, the bot cites the cross-repo precedent.

### Memory and unsafe discipline

- **`unsafe` blocks without a `// SAFETY:` comment** naming the OS contract or invariant being upheld. *Cross-repo: `craft` uses `#![forbid(unsafe_code)]` in every library crate; `icelines` has 2 unsafe blocks (libc::signal at startup) each with a SAFETY comment naming the contract; `apportionment` has 0 unsafe blocks and uses `// SAFETY:` to document why patterns are safe (not why unsafe was needed).* The lobster bar should be: every `unsafe` block names the invariant that makes the operation sound.
- **New `unsafe` in a library crate** that doesn't already have an opt-in justification at the module or crate level. Library crates should aim for `#![forbid(unsafe_code)]` (craft pattern); when they can't, the deviation should be explicit.

### Error handling

- **Public library APIs returning `anyhow::Result<T>`** instead of a typed `Result<T, MyError>`. *Cross-repo: `apportionment` and `icelines` use `thiserror` for library errors and `anyhow` only at the CLI/orchestration layer; `craft` uses `thiserror` exclusively with typed Diagnostic builders.* Library callers can't pattern-match on `anyhow::Error` — typed errors force the producer to enumerate failure modes.
- **Public error enums without `#[non_exhaustive]`** (craft Rule 5). Future additions become breaking changes without it. Demote to LQ if the convention isn't established for the touched crate; promote to Major if the crate already follows it.
- **Errors propagated without context** in the orchestration layer. *Cross-repo: `icelines` carries 227 `.context()` / `.with_context()` decoration calls; `craft` uses typed Diagnostic builders that self-redact for `Secret<T>`.* New `?` chains in orchestration code should add context at the point where the error crosses a meaningful boundary (operation, request, file).

### Async and concurrency

- **`.await` while holding `std::sync::Mutex`, `parking_lot::Mutex`, or `RwLock`.** *Cross-repo: `icelines` has zero `std::sync::Mutex` in production, all locks are `tokio::sync::Mutex`; `craft` carries `CancellationToken` through context and uses `tokio::sync::Semaphore` for bounded concurrency, never blocking-locks across `.await`.* Use `tokio::sync` types or drop the guard explicitly before `.await`.
- **`Drop` impls that rely on async cleanup.** Async work in `Drop` is fundamentally broken; flag as a definite bug.
- **Unbounded channels in hot paths.** *Cross-repo: `craft` uses `mpsc::channel(N)` not `unbounded_channel()`.* New `tokio::sync::mpsc::unbounded_channel()` without a justification (typically: "this is bounded by upstream throttling at ...") is a backpressure hole.
- **Unbounded `tokio::spawn` in a hot loop without a Semaphore.** *Cross-repo: `craft` providers hold `Semaphore::new(8)`-style gates.* Every fan-out site should have an upper bound.
- **`Send` regressions on public types** that were previously `Send`. Check `cargo check --tests` reasoning when public types add a `Rc<T>`, `RefCell<T>`, or `dyn Trait` without `+ Send`.

### Panic discipline

- **New `.unwrap()` / `.expect()` in production code without a documented invariant** in a comment immediately above. *Cross-repo: `apportionment` has 1032 `.unwrap()` calls but most are in test code; `icelines` reserves `.expect("infallible with these options")`-style strings for cases where the contract makes failure impossible; `craft` has zero unwrap/expect in production paths because `clippy::expect_used = deny` is on.* PR `bic/lobster#657` landed the same gate on lobster — new escapes need explicit `#[allow(clippy::expect_used)]` + reason.
- **`panic!` outside test code or impossible-branch match arms.** *Cross-repo: `apportionment` uses `panic!` only in tests and unreachable match arms (e.g., `panic!("expected Singular, got {:?}", other)` after exhaustive enum match).* Production `panic!` is a category-error in this codebase.

### Lint posture

- **New `#[allow(<lint>)]` sites without a `reason = "..."` string.** Convention from PR `bic/lobster#668`: every allow site documents why the lint's auto-suggestion would be unsound. *Cross-repo: `craft` makes this strict via `#![deny(clippy::pedantic)]` everywhere with surgical per-crate allows that name the rationale (e.g., `module_name_repetitions` global, `missing_panics_doc` only in `craft-agent`).*
- **Lint posture changes** (`#![deny(...)]`, `#![warn(...)]`, `#![allow(...)]`) at crate root without a comment naming the reason. Crate-level lint posture is a contract with the rest of the workspace.

### Visibility and API design

- **New `pub` items where `pub(crate)` would suffice.** *Cross-repo: `apportionment` 6 `pub(crate)`, `icelines` 54, `craft` enforces visibility via compile-fail doctest (`FormaIR` cannot be re-exported by external code).* The lobster default should be `pub(crate)` first, `pub` only when crossing the crate boundary deliberately.
- **Magic-string literals for evolving values.** *Cross-repo: `apportionment` requires lowercase_underscores constants for state names (CLAUDE.md line 77); `icelines` requires `CURRENT_SEASON` constant, never `"20252026"` inline (CLAUDE.md line 116); `craft` uses typed slug newtypes.* Watch for: hardcoded version strings, route paths, identifier patterns, environment names that should be constants or typed wrappers.
- **Public APIs that take `String` where `&str` would do, or `Vec<T>` where `&[T]` would do**, without justification. Owned types in public signatures force the caller into allocations they may not need.

### Test coverage

- **New public API without a test** at any tier. *Cross-repo: `apportionment` mandates "Add tests for EVERY enhancement" with a unit/integration/e2e/dashboard decision tree; `icelines` requires L0 (inline) for new features and L2 (subprocess) for new commands; `craft` is integration-first with golden tests in `tests/`.* The tier should match the surface — internal helper gets L0; new endpoint gets L1+L2.
- **Removed or disabled test without a replacement** pinning the same behavior. (Reinforces W2 non-negotiable; surfaces here as the diff-side detection of W2.)

### Cargo / workspace hygiene

- **Dependency bumps in one crate without sibling crates that should evolve together.** *Lobster: `lobster_runtime` + `lobster_plex_mock` lockstep (PR #618 family); `icelines` uses `[workspace.dependencies]` for shared deps.* Watch for: new direct dep in a leaf crate that should be inherited via `workspace = true`.
- **`Cargo.toml` MSRV (`rust-version = "..."`) drift.** *Cross-repo: `craft` pins MSRV at `clippy.toml` (currently 1.94.1).* Bumping MSRV is a downstream-consumer-impacting change.

### Don't watch for (handled elsewhere)

- Formatting (`cargo fmt --check` is a CI gate)
- Basic clippy lints (CI enforces with `-D warnings`)
- Generic style — `harryf` peer-review covers this with named PASS rules
- Imports ordering (rustfmt handles)

### Skip when

**Whole-lens skips:**
- The PR touches no `*.rs` files. Don't fabricate Rust findings on a TS-only or Python-only diff.
- The PR is a `Cargo.lock`-only change (dependency update auto-PR). Apply only the cargo-hygiene watches; skip safety/error/async/panic.
- The PR is in a known no-Rust directory (`lobster_web/`, `docs/`, `.craft/`, `pipelines/`).

**Sub-section skips** (saves evaluation cost on Rust PRs that touch only some surfaces):

| Sub-section | Skip when |
|---|---|
| Memory & unsafe | Diff contains no `unsafe` blocks AND no removal of existing `#![forbid(unsafe_code)]` |
| Error handling | Diff contains no new public function/method signatures returning `Result<...>`, no new public error enums, no change to `?`-chain depth in orchestration code |
| Async & concurrency | Diff contains no `.await`, no `tokio::`, no `async fn`, no new `Mutex`/`RwLock`/`Semaphore` |
| Panic discipline | Diff contains no new `.unwrap()` / `.expect()` / `panic!()` / `unreachable!()` in production code, and no new public function that could panic |
| Lint posture | Diff contains no `#![...]` attribute changes at crate root, no new `#[allow(...)]` sites |
| Visibility & API design | Diff contains no `pub` keyword changes, no new `String`/`Vec` parameters in public signatures, no new magic-string literals in production code |
| Test coverage | Diff contains no new public API surface AND no test removals/disabling |
| Cargo / workspace | Diff contains no `Cargo.toml` changes, no `[workspace.dependencies]` changes, no `rust-version` field changes |

When ALL sub-sections skip, the lens emits a single line in R3 notes: "L1: nothing applicable on this diff." Don't write empty findings.

## L2 — plex-mock contract

`lobster_runtime` and `lobster_plex_mock` evolve in lockstep — this is the contract that lets PR-time CI run the same tests against both. The PR #618 family established the convention.

**Watch for:**
- New behavior added to `lobster_runtime` without matching support in `lobster_plex_mock`. Look for: new public functions / endpoints / event types, new error variants, new config fields used in dispatch.
- `Cargo.toml` version bumps in one but not the other (lockstep).
- Any test that passes against `lobster_runtime` but is `#[cfg(not(plex_mock))]`-gated or otherwise skipped against `plex_mock` without a justification.
- New `clippy::allow` site present in one and not the other — divergence in the lint contract.

**Yield**: divergence is not automatically a finding. The PR may have a justification ("plex-mock parity will land in the follow-up") — but that justification must be in the PR body. If absent, raise as Major drift:pr-code finding.

### Skip when

- The PR touches neither `lobster_runtime/` nor `lobster_plex_mock/`. No Rust runtime change → no parity check.
- The PR is `lobster_web/` only or `docs/` only.
- Both `lobster_runtime` and `lobster_plex_mock` are touched in the diff with matching shape (e.g. both Cargo.toml bumps to the same version, both have a new public function with the same signature) — note the lockstep was honored and skip the lens body.

## L3 — OpenClaw integration shard

The OpenClaw container shard depends on lobster-side runtime contracts. Changes to dispatch, gateway routing, snap-restore, or the shard's expected wire format ripple into `bic/aether` and the public `openclaw/openclaw` fork.

**Watch for:**
- Changes to gateway routing logic (`gateway/`, dispatch table, route registration) — must be cross-checked against any paired `bic/aether` PR for the OpenClaw runtime side.
- snap-restore path changes — see `.craft/plans/claws-snap-restore.md` if present.
- New container-shard env vars, mount paths, or filesystem assumptions — these surface in aether's container spec.
- Anything that affects the openclaw upstream fork relationship — flag for cross-repo paired-PR coordination (W5 non-negotiable if no paired PR exists).

**Cross-references**: memory `project_openclaw_upstream.md`, `reference_eduardo_governance_design.md`.

### Skip when

- The PR touches only `lobster_web/`, `docs/`, `.craft/`, or `pipelines/` with no gateway / dispatch / snap-restore / container-shard surface.
- The PR is a Rust-only change in a non-shard crate (e.g. `clippy` lint Tier rollouts, internal refactors of `runtime/auth/`).
- The PR is a `lobster_plex_mock` parity follow-up (already covered by L2).

## L4 — Azure Linux build resilience

Lobster builds on Azure Linux via OneBranch. Transient `tdnf` HTTP 429 rate limits are a recurring failure mode. PR `bic/lobster#648` extracted `scripts/tdnf-install-with-retry.sh` as the canonical retry path.

**Watch for:**
- New Dockerfiles or pipeline YAMLs invoking `tdnf install` directly without going through `scripts/tdnf-install-with-retry.sh`.
- New ADO tasks that don't set `retryCountOnTaskFailure: 1` (or higher) on image-build steps where transient failures are expected.
- Image-build context paths where `.dockerignore` is missing or stale — bloated context inflates push times and obscures which files are actually used.
- Backoff strategy regressions — current convention is linear (15/30/45/60/75s, ~3.75 min total). Changes to this need justification.

### Skip when

- The PR touches no `Dockerfile*`, no `*.Dockerfile`, no `pipelines/*.yml`, no `.dockerignore`. No build-system change → no build-resilience review.
- The PR is a pure code change in any source crate (TS, Rust, Python).

## L5 — lobster_web wire-format

Lobster_web (`bic/lobster`'s web host) consumes aether endpoints by exact field name. The wire format is **additive-only**.

**Watch for:**
- Pydantic alias changes (rename, removal) on response models consumed by lobster_web — non-negotiable W1 break unless paired with a lobster_web PR.
- SSE event name changes — the canonical set is `dx`, `fr`, `tool_use_start`, `message_end`, `error`, `cv`. Adding new is safe; renaming is breaking.
- camelCase vs snake_case drift — wire is camelCase via Pydantic alias; internal is snake_case. Verify the alias config is correct on every new field.
- Response field order/structure changes that would break consumers reading positionally (rare in JSON but happens with arrays-of-tuples).
- Streaming-response semantics — chunked vs buffered, content-length presence, `transfer-encoding: chunked` introduction or removal.

## L6 — Feature-flag and rollback discipline

Review rollback controls in proportion to blast radius. Do not demand a feature
flag for every ordinary change. Do require an independently operable kill
switch when a feature can cause dangerous, expensive, irreversible, or
high-blast-radius effects.

**Watch for:**

- **Dangerous behavior without a kill switch (W12).** Treat a feature as
  dangerous when it can mutate external state, automate user/maintainer
  actions, change auth/permissions/data exposure, trigger migrations or
  destructive cleanup, redirect provider/model/routing behavior, create
  unbounded fan-out, or materially increase spend/load. The kill switch must:
  - stop the dangerous effect without a new build or code deployment;
  - be operable independently of the flight cohort or experiment assignment;
  - have a named owner/operator path and documented safe state;
  - be checked at the effect boundary, not only at startup or route mounting;
  - have a test proving the disabled path cannot perform the dangerous effect.
- **A flight mistaken for a kill switch.** A percentage/cohort flag is not a
  sufficient rollback control if operators cannot disable the effect globally
  and promptly.
- **Routine feature-flagging.** Flighting is by exception, not the default
  architecture. A new flight must name the rollout question, bounded cohort,
  owner, success/failure signals, expiry or review date, and removal target.
  If the PR cannot explain why staged exposure is necessary, prefer normal
  code plus a kill switch only where risk requires one.
- **Permanent flight branches.** Once the feature is stable, remove the flight
  assignment, stale branch, and dead fallback path. A PR extending or retaining
  a mature flight must cite current evidence that the rollout question remains
  open and provide a new near-term removal date.
- **Per-route mounts that bypass per-request control.** See
  `bic/aether#7229`: the correct shape is unconditional mount plus a
  per-request kill check so operators do not need a pod restart.
- **Default-on controls for risky surfaces.** Require explicit rollout and
  rollback justification.

### Skip when

- The change is local, readily reversible by a single commit revert, has no
  migration or persistent client state, and cannot produce dangerous effects.
- The diff only consumes an established flag without changing its lifetime,
  assignment, fallback, default, or controlled behavior.

## L8 — Factoring & reuse (DRY discipline)

This is a deliberate **opinionated specialization** for this bot. Reviewers across the team have implicit specialties (someone catches security, someone catches concurrency); this bot is the one that holds the line on **code copy/paste, premature duplication, and proper factoring**. When in doubt, fire the lens — false-positive rate is acceptable here because the cost of unflagged duplication compounds over PRs and the cost of a "consider extracting this" comment is low.

**Watch for:**

- **Near-identical function bodies in the diff.** Two functions whose bodies differ only in a parameter, a constant, or a type — propose extracting to a single function with the variation as a parameter. Cite both file:line locations.
- **Copy-paste from existing code with minor variation.** A new function that obviously cribs from an existing one in the codebase (search by signature, comment block, or distinctive variable names). The PR should either (a) call the existing function, (b) extract a shared helper, or (c) explicitly justify why divergence is needed.
- **Repeated literal patterns.** The same regex / SQL fragment / URL prefix / path string appearing 3+ times across the diff — extract to a `const` or named function. Magic numbers/strings inline are exceptions only when self-evident from local context.
- **Trait or interface re-defined locally** when a similar one exists in a shared crate or upstream module. Watch for `trait MyConverter { fn convert(...) -> ... }` patterns that mirror `Into<T>` / `From<T>` / `TryFrom<T>` / `serde::Deserialize` already in scope.
- **Per-file struct duplication.** Two modules defining structs with the same field names + types — usually means the type belongs in a shared module, or the duplication is masking a missing abstraction.
- **`if/else if/else if` chains over an enum variant.** If the chain exhausts a finite set of variants, an exhaustive `match` is the right factoring (compiler-checked, no missed-arm bugs).
- **Test scaffolding duplication.** Same fixture-builder, same setup boilerplate appearing in 3+ test files — extract to `tests/common/` or a `#[cfg(test)] pub fn`.

**Yield model for L8 findings:**
- `[Major | code]` — when the duplication is load-bearing in this PR (multiple new copies of the same logic introduced together)
- `[Minor | code]` — when one new copy joins an existing pattern that should be refactored but isn't introduced by this PR (the `pre-existing` modifier from `watches.md` applies — bot acknowledges this PR didn't introduce it)
- `[LQ | code]` — when there's a plausible reason for divergence and the bot just wants to surface it

**Don't watch for** (anti-DRY-zealotry):
- Two functions that LOOK similar but mean different things — naming hints at intent; if the names diverge meaningfully, leave alone.
- Test functions that share structure but exercise different invariants — duplication-for-readability in tests is a feature.
- Three-line patterns that share two lines — not worth extracting.

**Counter-search expectation:** for every L8 finding, search the codebase (or PR diff) for the existing function/pattern the new code resembles. Cite the existing location. If the new code IS the existing one (no duplicate found), demote to LQ or drop.

### Skip when

- The PR touches no production source files (test-only, docs-only).
- The PR is a pure dependency bump or formatting-only change.
- The diff is < 30 lines AND adds no new functions/types.

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
