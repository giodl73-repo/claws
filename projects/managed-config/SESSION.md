# Managed Configuration Session Context

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read the linked RFC and original deliverable.
4. Read the config writer and host/operator fit inventories.
5. Check the RFC, Lobster audit, and selected OpenClaw worktree state.

## Baseline

- Area: Managed Configuration
- Primary repos: `openclaw/rfcs`, `openclaw/openclaw`, `bic/lobster`
- RFC worktree: `C:\src\openclaw-rfcs-managed-config`
- Slice 1 worktree: `C:\src\openclaw-managed-config-slice1`
- Lobster audit worktree: `C:\src\lobster-layering-audit`
- Current RFC branch: `user/giodl/rfc-managed-configuration`
- Current prototype branch: `user/giodl/managed-config-slice1`
- Main tracking file: `README.md`
- Skill to use: `project-session`; use OpenClaw/Lobster PR skills when implementation starts

## Current Session

- Last updated: 2026-07-13
- Last agent: Codex
- Current focus: Fork-only OpenClaw stack is reviewed, type-clean, and pushed
  through the pre-migration Gateway bootstrap. Next is Lobster
  capability-gated consumption and bounded dual-run evidence.
- Active PRs: [fork RFC draft 4](https://github.com/giodl73-repo/rfcs/pull/4),
  [OpenClaw PR 1](https://github.com/giodl73-repo/openclaw/pull/33),
  [OpenClaw PR 2](https://github.com/giodl73-repo/openclaw/pull/36),
  [OpenClaw PR 3](https://github.com/giodl73-repo/openclaw/pull/37),
  [OpenClaw PR 4](https://github.com/giodl73-repo/openclaw/pull/39), and
  [OpenClaw integration PR](https://github.com/giodl73-repo/openclaw/pull/40),
  [OpenClaw local-file PR](https://github.com/giodl73-repo/openclaw/pull/44), and
  [OpenClaw Gateway controller PR](https://github.com/giodl73-repo/openclaw/pull/60),
  [OpenClaw Gateway bootstrap PR](https://github.com/giodl73-repo/openclaw/pull/61), and
  [Lobster evidence PR 1](https://microsoft.ghe.com/giodl/lobster/pull/1).
- Current RFC branch: `user/giodl/rfc-managed-config-rfc-only`; RFC number is
  `0019`, at `a189eb9`. Fork RFC PR 4 now documents the delivered local-file,
  canonical persistence, complete-chain refresh, and write-race guarantees.
- Local-file branch: `user/giodl/managed-config-local-files` at `0fb89d90963`,
  fork PR 44, pushed fork-only. Its final Codex review found no actionable
  correctness regressions; 5 files / 48 tests, full `tsgo`, and focused lint
  pass.
- Gateway controller branch: `user/giodl/managed-config-gateway-controller` at
  `db211f61727`, fork PR 60, based on local-file PR 44 and pushed fork-only.
- Gateway bootstrap branch: `user/giodl/managed-config-gateway-bootstrap` at
  `0a263762463`, fork PR 61, based on controller PR 60 and pushed fork-only. The earlier late-startup
  experiment remains preserved locally as `user/giodl/managed-config-cli-wip`
  at `6b48780dbc3`; do not promote it.
- Gateway stack proof: 9 focused files / 303 tests are accounted for, full
  `tsgo` is clean, focused `oxlint` is clean, and final
  `codex review --commit HEAD` reports no actionable correctness regressions.
  Review fixes bind source/include and plugin metadata generations to the
  activated snapshot, preserve parent/child layer order, and fail source drift
  through structured findings.
- Current Lobster branch: `user/giodl/managed-config-lobster-migration` at
  `f5930b3b6a`, pushed to the existing Lobster fork branch. The stack compares
  the real allowed-origins overlay with compiled global/tenant/operator sources
  for loopback, external, and stale-removal cases, and includes an unwired pure
  `--config-layer` argv compiler guarded by an unforgeable capability token.
  The token is issued only when installed `openclaw gateway --help` succeeds and
  advertises the exact `--config-layer <id=path>` surface. Both Lobster slices
  received clean `codex review --uncommitted` results before commit. Production
  selection and deletion remain release/capability gated. Cargo test execution
  remains pending: the review subprocess could not launch its Windows sandbox
  helper, and the private registry token may still be required outside that
  sandbox. An immutable bundle materializer now validates traversal-free source
  paths, stages all files under a unique directory, publishes the complete
  generation with one rename, verifies idempotent reuse, and rejects mutated
  existing generations. It is also unwired.
- Delivery rule: keep exact core, bounded authority, opt-in activation,
  writes/inspection, and Lobster deletion as separate PRs. RFC completion
  includes the bounded-authority PR with at least one demonstrated field.

## Resume Checklist

- Run: `git -C C:\src\openclaw-rfcs-managed-config status --short --branch`
- Run: `git -C C:\src\lobster-layering-audit status --short --branch`
- Review: `../layering-contracts/managed-configuration-deliverable.md`
- Review: `../layering-contracts/inventory/config-writers-2026-07-10.md`
- Audit: real OpenClaw config loaders, includes, runtime snapshots, schema metadata, validation, and writes
- Produce: baked-leaf classification and representative managed/operator fixtures
- Update: this file and the deletion ledger after each evidence slice

## Guardrails

- Keep implementation in isolated OpenClaw or Lobster worktrees.
- Do not introduce a parallel hosted config schema.
- Keep V1 generic and recursive with exact authority; do not require bounded
  comparators for the first release.
- Do not depend on the optional Policy plugin for config admission.
- Do not open an upstream RFC or implementation PR until explicitly requested after architecture review.

## Open Threads

- The generic OpenClaw feature stack is implementation-complete on the fork.
  Do not file or update anything in `openclaw/openclaw` without explicit approval.
- Fork PRs 44, 60, and 61 are squashed, reviewed, and pushed. Preserve their
  current stack bases and keep all implementation PR activity fork-only.
- Run the new real-overlay, capability, and materialization tests when the
  private Cargo registry token is available. Wire the materializer and
  capability-gated argv compiler into all three Gateway preparation paths only
  after the pinned OpenClaw package is a released conformant version.
- After a conformant OpenClaw release, finish Lobster PR 5 by passing the
  compiled descriptors at all three Gateway preparation paths, requiring the
  capability/minimum version, and deleting only the allowed-origins writer,
  stale cleanup, and redundant environment projection.
- Run `just openclaw-container-test` and `just openclaw-container-clippy` with
  `CARGO_REGISTRIES_LOBSTER_TOKEN` available.

- Use the Hosted Integration CAPI vertical as the first cross-project proof:
  exact-own profile, adapter, credential resolver, traffic policy, and
  dispatcher references in one effective generation without making Managed
  Configuration responsible for bundle registration or owner activation.
- Classify runtime overrides relative to managed authority.
- Build the allowed-origins managed/operator/effective fixture.
- Capture old/new Lobster effective Gateway fragments in a bounded dual-run.
- Define Slice 2 around layer loading, validation, and runtime snapshot
  publication.
- Add one whole-layer `NoDeclaredValues` advisory at inspection/status, not in
  the composition hot path.
- Select the concrete managed-source loading surface after the internal seam is
  proven.
- Determine the first bounded comparator fields from actual Lobster leaves.
- Prove transactional reload and operator-write generation behavior against current APIs.
- Quantify removable Lobster code, env keys, cleanup, and exact-blob tests.
- Stage a Lobster removal plan tied to a minimum conformant OpenClaw release.

## 2026-07-13 - Lobster exclusive startup planner

- Fork-only Lobster branch `user/giodl/managed-config-lobster-migration` advanced to `b0c7876ef8`.
- Added `GatewayConfigPreparation`, which selects exactly one startup mechanism: `LegacyOverlay` or a materialized managed bundle plus CLI arguments.
- Explicitly unsupported OpenClaw capability preserves the legacy overlay path without materializing managed state.
- Capability probe/execution failures stop preparation rather than silently falling back.
- Gateway layer arguments now consume the descriptors returned by immutable bundle materialization, so startup cannot accidentally reference pre-publication paths.
- `codex review --uncommitted` completed clean with no actionable findings.
- Rust tests and Clippy remain pending; they were not run in this session.
- Next slice: construct the real global/tenant/operator documents without duplicating the baked include graph, then integrate this planner at the shared Gateway lifecycle boundary.

## 2026-07-13 - Lobster managed document split

- Fork-only Lobster branch `user/giodl/managed-config-lobster-migration` advanced to `dda0ded5ec`.
- Added a pure builder for the realistic baked/global, tenant-network, and operator-delta documents.
- The recursive operator delta removes values identical to the baked index while preserving operator-only and changed values for explicit OpenClaw authority enforcement.
- Tenant-owned `gateway.controlUi.allowedOrigins` is stripped from the seeded operator source before delta calculation, including stale legacy-overlay values, so it cannot be claimed by two layers.
- Codex review initially found the missing sibling-test Clippy annotation and then the duplicated legacy allowed-origins ownership; both were fixed.
- Final `codex review --uncommitted` completed clean with no actionable findings.
- Rust tests and Clippy remain pending; they were not run in this session.
- Next slice: turn these documents into the three ordered `LayerSourceInput` values, call the exclusive planner, and pass its arguments through the shared Gateway spawn boundary while keeping all unsupported pinned versions on legacy overlays.

## 2026-07-13 - Lobster managed startup composition

- Fork-only Lobster branch `user/giodl/managed-config-lobster-migration` advanced to `d8057fcc13`.
- `ManagedConfigDocuments::into_source_inputs` now emits the ordered Lobster stack as generic layer inputs: `scout-global` read-only, `tenant-network` read-only, and `operator-local` read-write.
- The exclusive startup planner now performs source compilation only after exact managed-config capability confirmation; unsupported pinned versions return the legacy plan before compiling or materializing managed inputs.
- Fixed the earlier descriptor test fixture scope bug from `b0c7876ef8` by constructing descriptors in the test that consumes them.
- Final `codex review --uncommitted` completed clean with no actionable findings after one timed-out attempt was retried.
- Rust tests and Clippy remain pending; they were not run in this session.
- Next slice: read the real baked/seeded documents and validated origins at startup, invoke this composition once, route managed arguments through the shared Gateway spawn boundary, and execute legacy overlays only for `LegacyOverlay`.

## 2026-07-13 - Lobster runtime preparation and spawn seam

- Fork-only Lobster branch `user/giodl/managed-config-lobster-migration` advanced through `9e52b24057` and `4192752818`.
- `9e52b24057` adds the capability-first runtime boundary: unsupported CLIs select legacy without reading managed files; confirmed CLIs read baked/seeded documents, validate origins with the existing parser, compose sources, and materialize the immutable bundle.
- `4192752818` adds a behavior-neutral `spawn_gateway_with_env_and_args` primitive; existing spawn wrappers still pass no additional arguments.
- Both commits received clean `codex review --uncommitted` results with no actionable findings.
- Rust tests and Clippy remain pending; they were not run in this session.
- Lifecycle audit found two required activation invariants: deferred prestart must not publish a managed process before final user-scoped inputs are known, and warm reuse must compare the active managed generation with the newly prepared generation rather than discarding new arguments.
- Do not wire only the cold spawn. Final activation must store/bind the managed generation and argument vector to lifecycle state, force deferred managed starts through normal spawn when inputs are not final, and allow warm reuse only when the active generation matches. Legacy overlay execution must occur only for `LegacyOverlay`.

## 2026-07-13 - Lobster managed config activation

- Fork-only Lobster branch `user/giodl/managed-config-lobster-migration` advanced to `c264ff19b2`.
- Simplified activation now matches the intended three-file model: a confirmed OpenClaw CLI generates/materializes global, tenant, and operator documents immediately before normal Gateway spawn and passes the repeated `--config-layer id=path` arguments.
- Unsupported pinned OpenClaw versions retain the existing allowed-origins overlay behavior and receive no managed arguments.
- Managed mode skips the legacy allowed-origins writer and declines deferred pooled prestart so final runtime inputs are available before file generation.
- Warm Gateway reuse is intentionally unchanged; configuration changes apply on the next process spawn rather than introducing live reload or lifecycle generation state.
- `codex review --uncommitted` completed clean and confirmed exclusive mechanism selection, legacy fallback, and argument handoff.
- Rust tests and Clippy remain pending; they were not run in this session.
- The Lobster implementation stack is functionally complete for the initial opt-in rollout. Remaining work is validation, stack cleanup/squash strategy, and PR packaging on the fork only.

## 2026-07-13 - Simple OpenClaw stack reauthored

- Replaced the earlier 40-file / 4.5K-LOC prototype as the delivery path with
  two fork-only branches based on pre-feature OpenClaw main.
- Core branch `user/giodl/managed-config-simple-v1` is pushed at `1deea3a0d8d`.
  It contains the pure generic ordered composer and focused conformance tests.
- Gateway branch `user/giodl/managed-config-simple-gateway` is pushed at
  `37e8bfc649d`. It adds repeatable `--config-layer <id=path>` startup loading,
  native JSON5/include/env/schema/plugin handling, and the existing validated
  startup-snapshot handoff.
- Layered mode is intentionally read-only and startup-stable in V1:
  `config.get` reports the composed snapshot, the shared persistence guard
  blocks all config mutations, canonical config watching/backup promotion is
  disabled, and the snapshot is reused across in-process restarts.
- Live layer reload, writes, status/provenance APIs, generations, controllers,
  readiness, and role-specific host/operator/tenant concepts are not in V1.
- Full-stack `codex review --base 86b10ffb8e93b17dcaca6b52415e13d650b12ec0`
  reported no actionable correctness issue after fixes for effective tool-policy
  bounds, include roots, dev bootstrap, and layered RPC reads. Tests were not
  run during this reauthoring session.
- Docs branch `user/giodl/managed-config-simple-docs` is pushed at
  `4051bebb958`. It includes two diagrams, the opt-in/read-only lifecycle, and
  the realistic Lobster `scout-global`, `tenant-network`, and `operator-local`
  example. Its final `codex review --uncommitted` was clean.
- Next stack step: restack Lobster against the exact simple CLI contract and
  remove prototype-only generation/controller assumptions.

## 2026-07-13 - Simplified Lobster adapter complete

- Worktree: `C:\src\lobster-layering-audit`
- Base: `cd3554e32b`
- Preserved prototype: `user/giodl/managed-config-lobster-migration` at `c264ff19b2`
- Replacement branch: `user/giodl/managed-config-lobster-simple`
- Fork head: `128b25857955881c2d8f2a800a2141b58b909112`
- Remote: `giodl` only; no Lobster or OpenClaw upstream PR was created.
- Diff: 6 files, +423/-15. Production additions: 283; focused tests: 140.
- Reduction from prototype: 1,503 to 423 added lines (1,080 fewer, about 72%).
- Behavior:
  - exact `--config-layer <id=path>` capability probe;
  - unsupported pinned OpenClaw exclusively retains the existing allowed-origins overlay;
  - supported OpenClaw writes exactly `scout-global.json`, `tenant-network.json`, and `operator-local.json`;
  - Gateway receives those three layers in that order;
  - stale legacy `system.run` grants are cleared before the operator layer is snapshotted;
  - deferred prestart falls back to final-input normal spawn for layered config;
  - no generations, descriptors, digests, bundle controller, runtime planner, or reload machinery.
- Codex review: final `codex review --uncommitted` returned no actionable defects.
- Review fixes accepted:
  - replaced production `expect` with typed serialization failure;
  - moved layer materialization after legacy permission cleanup.
- Review finding rejected:
  - array-default loss is prevented by the existing include-aware seeder, which removes template-equal array elements and leaves only user additions before operator-delta derivation; the invariant is documented inline.
- Tests/build/format were not run by explicit session policy.
- Next: optionally run the focused Lobster `just` validation, then prepare the fork-only PR body/stack metadata. Do not file upstream without explicit instruction.

## 2026-07-13 - Fork-only Lobster draft PR

- Draft PR: https://microsoft.ghe.com/giodl/lobster/pull/12
- Repository/base: `giodl/lobster:main` at `cd3554e32b`
- Head: `user/giodl/managed-config-lobster-simple` at `02a9240b4da5adc037ff3c511cbfa8ef928ee8bf`
- Scope remains fork-only. No upstream Lobster or OpenClaw PR was created.
- Follow-up cleanup removed the now-unused zero-argument Gateway spawn wrapper and applied canonical Rust formatting.
- Final Codex review: formatting-only plus unused-wrapper removal; no behavioral regression.
- `just openclaw-container-fmt-check`: pass.
- Native Windows test/Clippy: blocked by Unix-only `aether-priv-bridge`; the patch-local dead-code finding was fixed.
- WSL validation: blocked because `just` is not installed; raw Cargo was intentionally not used.
- Draft remains pending canonical Unix CI.

## 2026-07-13 - Upstream draft publication

- OpenClaw implementation draft: https://github.com/openclaw/openclaw/pull/107026
  - branch: `giodl73-repo:user/giodl/managed-config-upstream`
  - base: current `openclaw/openclaw:main`
  - scope: repeatable ordered config layers, exact authority, bounded `tools.allow` / `tools.deny`, immutable startup lifecycle, docs
  - final diff at publication: 22 files, +1103/-114
  - focused proof: 61 tests pass across config composition, layer loading, write-guard ownership, and agent mutation boundaries
  - review: `codex review --base upstream/main` clean with no actionable correctness regression
  - local limitation: `pnpm build` and direct `oxlint` hung in the WSL worktree; upstream CI is authoritative
- RFC draft: https://github.com/openclaw/rfcs/pull/34
  - branch: `giodl73-repo:user/giodl/rfc-managed-config-rfc-only`
  - head: `66a4425` (`docs(rfc): align managed config with V1`)
  - rewritten from the broad prototype contract to the delivered V1
  - includes architecture and recursive-fold diagrams plus the Scout global / tenant network / operator Lobster example
  - implementation plan is now two steps: land OpenClaw V1, then adopt a released version in Lobster and delete baked overlay machinery
  - review: RFC Codex review clean with no actionable correctness issue
- Broad prototype remains evidence only: https://github.com/giodl73-repo/openclaw/pull/33
- No upstream Lobster PR has been filed.
- Remaining readiness work:
  - let OpenClaw and RFC CI/review complete
  - record foreground three-layer startup, conflict rejection, and runtime mutation rejection proof for implementation PR #107026
  - keep both upstream PRs draft until those gates are satisfied

## 2026-07-13 - Foreground lifecycle proof

- Evidence directory: `projects/managed-config/evidence/openclaw-pr-107026-lifecycle-v3/`
- Exact branch: `user/giodl/managed-config-upstream`
- Foreground Gateway startup with Scout, tenant, and operator layers: PASS
- `/healthz`: PASS
- `config.get` returned tenant origin, tightened `tools.deny`, and operator logging: PASS
- `config.patch` rejected with the managed read-only reason: PASS
- conflicting `allowedOrigins` layer rejected with `ControlledByEarlierLayer`: PASS
- canonical config path remained absent: PASS
- elapsed proof run: 38.3 seconds

## 2026-07-14 - ClawSweeper ownership repair

- OpenClaw implementation draft #107026 rebased onto upstream main `578163c4a337` and force-with-lease published at `8dc592014ba01185adfa863b809702c62c3339c3`.
- Repaired ClawSweeper P1 by scoping layered write blocks to the canonical config path. Mixed-owner writes to unrelated paths remain allowed.
- Follow-up Codex review found pathless plugin/doctor/update preflights could bypass the scoped block; pathless assertions now resolve to the canonical config path before side effects.
- Focused validation: 63 tests pass across composition, CLI loading, write ownership, and agent mutations; `git diff --check upstream/main...HEAD` passes.
- Final `codex review --base upstream/main`: no discrete actionable regression.
- Authoritative bootstrap evidence: `projects/managed-config/evidence/openclaw-pr-107026-bootstrap-v6/`.
- Fresh-state live Gateway proof: health and layered config pass; canonical `openclaw.json` remains absent.
- Existing-state live Gateway proof: health and layered config pass; pre-existing canonical file SHA-256 and legacy metadata remain unchanged.
- Failed harness directories v4 and v5 are non-authoritative; v4 used the wrong plugin-disable variable and v5 omitted explicit client credentials. V6 is authoritative.
- PR body now explains why `$include` and launcher-side flattening do not provide authority, monotonic tool-policy bounds, or immutable lifecycle.
- Public ClawSweeper re-review requested: https://github.com/openclaw/openclaw/pull/107026#issuecomment-4969586968
- Draft remains draft pending explicit maintainer product sponsorship.

## 2026-07-14 - Composition ownership position

- RFC 0019 now explicitly assigns ordered-layer merge semantics to OpenClaw because OpenClaw owns schema, plugin validation, tool-policy interpretation, runtime snapshots, and mutation enforcement.
- Hosts retain value materialization and source ordering; core remains generic and role-free.
- RFC distinguishes the include mechanism for document structure from independent-source authority and explains why external flattening erases enforceable boundaries.
- RFC evidence updated to 63 focused tests plus fresh-state and existing-state Gateway proof.
- RFC branch pushed at a8e024d; existing RFC PR #34 updated in place.
- Implementation PR #107026 body now recommends this ownership boundary rather than presenting core versus external flattening neutrally.
- Both PRs remain draft pending maintainer sponsorship.

## 2026-07-14 - Documentation audit

- Audited the public configuration-layers page, Gateway CLI reference, configuration landing-page link, and Mintlify navigation.
- Existing docs already covered opt-in behavior, recursive authority, bounded tool policy, native JSON5/include/env/plugin validation, Lobster three-file usage, and immutable V1 lifecycle.
- Added the missing core-ownership rationale and distinguished include-based document structure from independent-source authority.
- Corrected write-boundary wording to path-scoped canonical ownership and documented that unrelated paths remain writable.
- OpenClaw draft head advanced with a documentation-only commit a7acafa0869 and was pushed to PR #107026.
- PR evidence wording now distinguishes the reviewed runtime head 8dc592014ba from the documentation-only head.
- ClawSweeper re-review requested against the new head: https://github.com/openclaw/openclaw/pull/107026#issuecomment-4971197451
- pnpm docs:list attempted dependency reconciliation and timed out after installation activity; no docs validation result was claimed.

## 2026-07-14 - Fleet per-cell story

- RFC 0019 now describes managed configuration as complementary to Fleet isolation.
- One shared global baseline may be reused across cells, but each tenant receives an independently composed stack and separate Gateway cell.
- Added a two-cell Mermaid diagram and concrete global plus tenant plus operator source sets.
- Explicitly states that layers are not tenant isolation and mutually untrusted tenants must not share one Gateway.
- Fleet remains responsible for cells, state, credentials, networks, mounts, materialization, and ordering; Gateway owns composition and enforcement.
- V1 requires no Fleet command change. A later adapter can mount files, pass repeated flags, and replace or restart cells.
- Interactive in-cell configuration remains on ordinary mutable config.
- RFC branch and PR #34 advanced to 823cf9f.
- No OpenClaw implementation change is required by this clarification.

## 2026-07-15 - Managed Configuration V1 sidecar specification

- Rebased RFC 0019 branch onto current openclaw/rfcs main after upstream standardized RFC sidecars under rfcs/<id>/.
- Added normative sidecar rfcs/0019/managed-configuration-v1-spec.md.
- The sidecar freezes the V1 invocation grammar, source preparation order, sparse recursive composition, exact authority, bounded tools.allow/tools.deny semantics, findings, validation, path-scoped immutable lifecycle, ordinary-config compatibility, Fleet per-cell contract, security boundary, evolution rules, and minimum conformance suite.
- RFC 0019 now links the sidecar directly from its summary.
- The sidecar does not expand implementation scope: no reload, writes, provenance, role semantics, remote sources, or Fleet command changes.
- RFC branch was rebased and force-with-lease pushed at eaeeb56f8843d7dd826b32843f5a49a8d30ff89f.
- Existing RFC draft PR #34 was updated in place to call out the implementer-facing spec.

## 2026-07-22 - Current-main refresh and reviewer response

- OpenClaw implementation PR #107026 was explicitly replayed as its 15 managed-config commits onto current `openclaw/openclaw:main` at `3c25222fb4ad5c87a2f17372528f80e7cf3dce2d`.
- Current OpenClaw head is `8119dd221ffbbfd7acda083bc32bbd4fbeaa36cb`; the branch was force-with-lease pushed to `giodl73-repo:user/giodl/managed-config-upstream`.
- Rebase conflicts were adapted to current-main CLI bootstrap, Gateway request-context, reload, and path-scoped persistence owners rather than restoring obsolete July structure.
- ClawSweeper has no contributor-facing correctness finding, marks proof sufficient, and rates the implementation diamond lobster. The remaining decision is explicit maintainer sponsorship of the permanent opt-in CLI and immutable startup contract.
- PR #107026 body and response now distinguish the historical 63-test/live-Gateway proof from exact-head proof. Focused, broad, fresh-state, and existing-state validation remain pending on `8119dd221ff` and are not claimed yet.
- RFC PR #34 was rebased onto `openclaw/rfcs:main` at `13819ef73d3ae980b362e2a88ccb3cba90faa21d`; current RFC head is `481116b135790390da82a519e03f84ad7ad770b8`.
- RFC #34 received a reviewer response recording that the contract did not expand and that the remaining RFC-to-implementation acceptance is a human configuration/security ownership decision.
- The fork's `giodl/lobster:main` was fast-forwarded from `cd3554e32b` to current `bic/lobster:main` at `4254a82b7cde712e0407520dac9e1b518ac12b64`.
- Lobster draft PR #12 was reauthored across the current library entrypoint and centralized Gateway preparation lifecycle, then force-with-lease pushed at `e766e17935bf28c3c4234d91e1113a25250998a4`.
- Lobster remains a six-file fork-only adapter. Its body now points to OpenClaw PR #107026 and RFC #34 and labels all prior review/format evidence as historical; exact-head Rust formatting, tests, Clippy, and integration validation remain pending.
- The damaged obsolete Windows worktree `C:\src\openclaw-managed-config-slice1` still shows widespread uncommitted deletions and was intentionally left untouched. The clean OpenClaw PR worktree is `/root/src/openclaw-managed-config-slice1` in WSL.
+

## 2026-07-23 Three-agent review repair

- RFC PR 34 head is `8046ab416426e9ab5e4a6140a12fe9ede60c75bf`. The RFC now makes the V1 sidecar normative, distinguishes source preparation from final validation, requires full-process restart/replacement, splits core and host conformance, adds bounded-policy vectors, and avoids calling historical proof exact-head conformance.
- OpenClaw PR 107026 head is `129822922d9cd73fec1b608c16d16eefde6622ac`. The branch was replayed onto upstream `d8325da46df`, preserves upstream transactional write conflicts beside layered read-only guards, and repairs the exact-head type/runtime/format failures found by review. Upstream main advanced again immediately after publication, so the PR currently reports `BEHIND`, not a resolved exact-current-main proof.
- Lobster fork PR 12 head is `be8e2acdd911b04dd577c8bac839808e5a1efd45`. Adoption now requires `LOBSTER_OPENCLAW_MANAGED_CONFIG_ENABLED=true` plus CLI capability. It captures operator state before seeding, completes plugin/remote projections before materialization, derives the operator delta from the pre-seed capture, sanitizes immutable inputs in memory, publishes a private per-generation file set, caches CLI capability, and keeps a healthy warm Gateway running when re-projection fails.
- PR bodies for all three PRs were updated with the current heads, corrected lifecycle semantics, explicit pending-validation language, and the Lobster global/tenant/operator example.
- No local tests, formatting, Clippy, image startup, or refreshed lifecycle proof were run during this repair pass. Required next evidence is current-head OpenClaw CI/core-conformance mapping and canonical Unix Lobster validation plus exact-head image/process proof.
