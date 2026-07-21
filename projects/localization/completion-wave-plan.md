# RFC 0024 Localization Completion Wave

## Executive Ask

Approve one final five-PR implementation wave plus a parallel named-language
review track. The five preferred foundation PRs (#134-#138) establish the
runtime, ownership, coverage, and fail-closed release contracts. This second
wave uses those contracts to finish every product surface rather than leaving
localization as an indefinitely partial framework.

## Terminal Outcome

The generated matrix has 315 locale/surface cells:

- 86 partial;
- 227 unsupported or not yet migrated;
- 2 docs platform-constrained; and
- 0 complete.

The bounded closeout target is:

- all 313 OpenClaw-controlled cells are `complete`;
- `docs/fa` and `docs/th` are either completed through an approved publishing
  path or remain the only two documented platform constraints;
- all 21 target locales have named, non-self-attested linguistic review;
- every in-scope surface is migrated and has a checked catalog or artifact;
- no blocking native quality advisories remain;
- the final generated status is at least
  `openclaw-owned-complete-with-platform-constraints`;
- `fully-localized` is emitted only if the two docs host constraints are also
  removed.

This is a terminal state. It does not leave experimental runtime or channel
surfaces behind.

## Scope Rule

Each PR owns a coherent set of product surfaces across every target locale.
The PR may land candidate catalogs as `partial`, but it cannot mark them
`complete` using generated or model-authored copy alone. Named review runs in
parallel and the final promotion PR consumes that evidence.

Logs, developer diagnostics, protocol identifiers, command names, config keys,
provider IDs, model IDs, and model-authored prose remain out of scope.

Every completion PR must name the semantic owner, rendering owner,
descriptor-construction boundary, locale-resolution boundary, privacy-safe
diagnostic fields, rollback behavior, and the hardcoded or duplicated
presentation authority it deletes. A catalog added beside an equally
authoritative English path does not complete a surface.

## Automation Integration Contract

The completion wave extends the translation automation already active on
OpenClaw main:

- Control UI and native source changes land first; owner workflows generate
  per-locale artifacts and publish reviewable automation PRs through the shared
  `publish-generated-pr` action.
- Documentation source changes sync into `openclaw/docs`, where incremental
  translation uses source hashes, translation memory, locale/page sharding,
  aggregate validation, and one final publication commit.
- Source PRs own reviewed English, descriptors, and deterministic source
  inventories. Workflow-owned translated artifacts remain separate.
- Pull-request CI detects drift without provider credentials. Source-only drift
  may remain advisory only when a guaranteed post-merge reconciliation owns the
  repair; generated artifact changes and release claims remain strict.
- Generated copy cannot attest review. Safety-sensitive catalogs require named
  language and owner/SecOps review before maturity promotion, regardless of
  whether candidate generation or routine catalogs use auto-merge.

Completion PR A should reuse these exact source-SHA, per-locale artifact,
aggregate validation, stale-input deferral, App-token, automation-branch, and
changed-scope seams for CLI/TUI and routine operator catalogs. It must not add a
second generated-PR publisher.

## Final Five PRs

### Completion PR A: Operator Surfaces

Surfaces:

- Control UI;
- CLI onboarding;
- channel/plugin setup;
- CLI; and
- TUI.

Current matrix represented by this PR: 105 cells.

Work:

- generalize the existing Control UI/native generated-PR automation into a
  trusted detect/refresh/enforce drift gate for registered catalogs, reusing
  the shared publisher, exact-source resolution, per-locale artifacts,
  stale-input deferral, and source/generated CI ownership;
- finish the remaining product-owned string inventories;
- add all 21 target catalogs, including Swedish where currently unsupported;
- remove raw-copy and catalog fallback gaps;
- preserve placeholders, protected literals, commands, paths, and IDs;
- add expansion, plural, shaping, and RTL fixtures; and
- delete the remaining hardcoded presentation paths covered by the inventories.

Exit gate:

- all five surfaces are migrated for every target locale;
- generated fallback counts are zero;
- candidate catalogs are review-ready;
- superseded hardcoded presentation paths are deleted or retained only for
  named compatibility callers; and
- no cell is promoted without named review evidence.

### Completion PR B: Runtime And Gateway Errors

Surfaces:

- runtime; and
- Gateway errors.

Current matrix represented by this PR: 42 cells.

Work:

- obtain an owner-approved allowlist of user-facing runtime and Gateway errors;
- migrate only that bounded inventory to stable message descriptors;
- emit descriptors at the owner boundary and render at the user-facing edge;
- preserve stable error codes and reviewed English fallback;
- translate the bounded catalogs for all target locales; and
- delete duplicated edge-owned hardcoded error presentation.

Exit gate:

- the allowlisted inventory has no untranslated product-owned rendering path;
- strict and legacy clients retain compatible English messages;
- safety, authentication, authorization, and recovery copy has required owner
  review;
- public diagnostics contain bounded descriptor/provenance fields rather than
  rendered text, parameters, recipient identity, or raw exceptions; and
- broad log or exception-string extraction is not introduced.

### Completion PR C: Channels And Metadata

Surfaces:

- server-rendered channels;
- command metadata;
- Telegram command menus;
- Discord command menus; and
- skill metadata.

Current matrix represented by this PR: 105 cells.

Work:

- settle recipient-locale ownership before non-English channel rendering;
- complete server-rendered channel catalogs with canonical English fallback;
- project localized command metadata into Gateway, CLI, TUI, Control UI,
  Telegram, and Discord consumers;
- complete localized skill presentation without changing stable skill identity;
- preserve platform limits and deterministic truncation; and
- delete English-only adapter templates replaced by owner-approved catalogs.

Exit gate:

- every surface has an explicit locale owner and fallback rule;
- command/runtime semantic owners remain distinct from adapter rendering
  owners;
- all target catalogs are present and checked;
- safety-sensitive channel copy remains English until approval-owner and SecOps
  attestation is recorded;
- command names, skill IDs, and protocol values are unchanged; and
- English-only adapter templates replaced by owner catalogs are deleted.

### Completion PR D: Native Apps And Documentation

Surfaces:

- Android;
- Apple; and
- docs.

Current matrix represented by this PR: 63 cells.

Work:

- complete Android and Apple catalogs from the shared native inventory;
- resolve every blocking native quality advisory rather than merely counting
  it;
- reconcile translation contradictions through named platform/language review;
- verify generated native artifacts and catalog revisions;
- complete and verify docs artifacts for every supported target locale;
- add Swedish docs coverage; and
- obtain an explicit disposition for Persian and Thai docs publishing.

Exit gate:

- native quality advisory count is zero for promoted locales;
- Android and Apple artifacts are present, current, and reviewed;
- docs artifacts are current and externally verified;
- `docs/fa` and `docs/th` are either supported or explicitly recorded as the
  only remaining platform constraints; and
- no unsupported docs locale remains.

### Completion PR E: Review Evidence And Release Promotion

Surfaces:

- product-wide evidence and release state.

Work:

- ingest named linguistic-review evidence for all 21 target locales;
- bind review evidence to exact catalog revisions;
- fail on stale review, fallback, missing artifacts, quality advisories, or
  unmigrated surfaces;
- promote eligible cells from `partial` to `complete`;
- regenerate the final 315-cell readiness report; and
- publish the exact qualified or unqualified release claim.

Exit gate:

- all 313 OpenClaw-controlled cells are complete;
- there are no partial, experimental, unsupported, or unmigrated
  OpenClaw-owned cells;
- the only permitted non-complete cells are approved external platform
  constraints;
- rollback and source-revision drift demote affected cells automatically; and
- the release claim matches the evidence without manual override.

## Parallel Review Track

The longest-lead dependency is not code. Before Completion PR A starts, assign:

- one accountable language owner for each of the 21 target locales;
- platform reviewers for Android, Apple, and docs;
- approval-owner and SecOps reviewers for safety copy; and
- a release owner for final maturity promotion.

AI-assisted trusted workflows generate candidate translations and open
reviewable PRs whenever English source changes. Pull-request CI detects and
blocks missing or stale targets without exposing provider credentials.
Generated or model-authored translations cannot provide their own review
attestation.

## Decisions Requested From Peter And Vincent

1. Approve the five-PR closeout shape and the terminal release definition.
2. Approve the bounded user-facing runtime/Gateway error inventory before PR B.
3. Decide channel recipient-locale ownership before PR C.
4. Confirm the safety-copy approval and SecOps attestation path.
5. Fund or assign the 21-locale reviewer roster before translation imports.
6. Decide whether Persian and Thai docs use another publishing path or remain
   explicit external platform constraints.

## Why This Finishes The Work

The first five PRs create the common contract. These five consume it across all
15 surfaces:

| Completion PR | Surfaces | Matrix cells |
| --- | ---: | ---: |
| A: operator surfaces | 5 | 105 |
| B: runtime and Gateway | 2 | 42 |
| C: channels and metadata | 5 | 105 |
| D: native apps and docs | 3 | 63 |
| E: evidence and promotion | product-wide | promotes all eligible cells |

There is no unassigned product surface after PR D and no unverified completion
claim after PR E.
