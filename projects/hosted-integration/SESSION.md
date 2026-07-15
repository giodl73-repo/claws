# Hosted Integration Session Context

## Agent Start

1. Read this file.
2. Read `README.md`.
3. Read the linked RFC and `../layering-contracts/hosted-integration.md`.
4. Read the OpenClawTransport, `node.invoke`, hosted identity, and ProxyPipe inventories.
5. Check the RFC, Lobster audit, and selected OpenClaw worktree state.

## Baseline

- Area: OpenClaw Hosted Integration And Capability Bindings
- Primary repos: `openclaw/rfcs`, `openclaw/openclaw`, `bic/lobster`
- RFC worktree: `C:\src\openclaw-rfcs-duplex-transport`
- Lobster audit worktree: `C:\src\lobster-layering-audit`
- Current RFC branch: `user/giodl/rfc-duplex-transport`
- Main tracking file: `README.md`
- Skill to use: `project-session`; use OpenClaw debugging/testing and PR-loop skills when implementation starts

## Current Session

- Last updated: 2026-07-15
- Last agent: Copilot
- Current focus: correct the five-package fork review stack so OpenClaw owns
  only generic composition, credential, diagnostics, traffic-policy, reverse
  dispatch, and Gateway admission contracts. Lobster owns its external plugin,
  CAPI provider binding, credential acquisition, dispatcher implementation,
  Scout configuration, and deployment evidence. PR #72 is rebuilt and
  published at `10b5d0f23c2` as generic host composition contracts. PR #73 is
  rebuilt on that head and published at `1ac7184d60e` as generic hosted provider
  dispatch. Both live PR titles and bodies now state the external-plugin
  boundary. Package 72 has 37 focused tests plus production/test type proof;
  package 73 has 218 focused tests plus production, core-test, and package-test
  type proof. Packages #74 and #75 remain on their old product-coupled review
  shapes and must be restacked onto the corrected package-3 head.
- Consolidated fork review stack: [OpenClaw PR 71](https://github.com/giodl73-repo/openclaw/pull/71)
  guarded dispatch core; [PR 72](https://github.com/giodl73-repo/openclaw/pull/72)
  generic host composition contracts; [PR 73](https://github.com/giodl73-repo/openclaw/pull/73)
  generic hosted provider dispatch; [PR 74](https://github.com/giodl73-repo/openclaw/pull/74)
  additional provider owners; and [PR 75](https://github.com/giodl73-repo/openclaw/pull/75)
  Microsoft interactions. All are fork-only drafts. Packages 4 and 5 are
  parallel children of package 3 and require restacking before review.
- Active branch / PR: [fork package 2 PR 72](https://github.com/giodl73-repo/openclaw/pull/72), branch `user/giodl/hosted-integration-capi-owner-operations`, head `10b5d0f23c2`; [fork package 3 PR 73](https://github.com/giodl73-repo/openclaw/pull/73), branch `user/giodl/hosted-integration-hosted-capi-execution`, head `1ac7184d60e`; [fork package 4 PR 74](https://github.com/giodl73-repo/openclaw/pull/74), branch `user/giodl/hosted-integration-additional-provider-owners`, old head `f518a822261`; [fork package 5 PR 75](https://github.com/giodl73-repo/openclaw/pull/75), branch `user/giodl/hosted-integration-microsoft-interactions`, old head `128df4698d8`; [fork RFC PR 2](https://github.com/giodl73-repo/rfcs/pull/2), branch `user/giodl/rfc-duplex-transport`, with external-plugin architecture edits pending commit.
- RFC file: `rfcs/0020-hosted-integration-and-capability-bindings.md`
- Known dirty state: `claws-hapi` has this session edit plus unrelated
  `projects/state-continuity/SESSION.md` changes that must remain untouched.
  The RFC worktree has only the RFC 0020 external-plugin architecture edit.
  Package-2 and package-3 WSL worktrees are clean and published. D4a and D3a
  source changes are committed and pushed, but
  their hydrated Windows worktrees report generated tracked `node_modules` link
  churn that is intentionally unstaged. D4a PR 59 has the expected fork-only
  `label` and `auto-response` failures while other checks initialize. E4a and
  E4b worktrees are clean and pushed; E4b's targeted checks and final Codex
  review have no accepted findings. E4a's first fork CI run exposed one
  E4a test-helper type error;
  commit `6c86b760d76` fixes it and the replacement run is queued. The remaining
  failures reproduce D2a stack baseline failures or missing fork secrets. E4b
  has no attached fork checks. D4b is review-clean, committed, pushed, and
  open as fork-only draft PR 9 stacked on D2b; no checks are attached yet.
  D4c is review-clean, committed as `a2a11dfadb8`, pushed, and open as fork
  draft PR 62 stacked on D2a. Its fork workflows are initializing.
  D4d is review-clean, committed as `96d9b358da`, pushed, and open as fork-only
  draft PR 10 stacked on Lobster D2b PR 6. Its focused proof passed 49
  host-provider tests, the runtime key-source test, strict Clippy for both
  touched crates, formatting, diff hygiene, and final Codex review. The D4d
  worktree is clean and no matching PR exists in `bic/lobster`.
  D5a is review-clean, committed as `0b8f8684457`, pushed, and open as fork
  draft PR 63 stacked on D2a PR 52. Its focused proof passed 35 tests, four
  TypeScript lanes, plugin SDK export/boundary checks, focused lint/format,
  diff hygiene, and final Codex review. No matching PR exists in
  `openclaw/openclaw`; the fork-only `label` and `auto-response` checks fail as
  expected while other fork workflows initialize.
  D5b is review-clean, committed as `681a394bf7`, pushed, and open as fork-only
  draft PR 11 stacked on Lobster D2b PR 6. Its proof passed 46 host-provider
  tests, focused hosted/existing ACF source tests, strict Clippy for both
  touched crates, formatting, JSON parsing, diff hygiene, and final Codex
  review. The worktree is clean, no matching PR exists in `bic/lobster`, and
  the fork draft has no attached checks yet.
  D5c is review-clean, committed as `5cce30fce01`, pushed, and open as fork
  draft PR 65 stacked on D5a PR 63. The final Codex closeout passes 109
  extension tests with no accepted findings. Extension source and test
  typechecks, Gateway auth, generated docs and channel metadata, SDK exports,
  raw-fetch, channel-agnostic boundaries, formatting, and diff hygiene pass.
  The repository-wide monolithic SDK guard still reports the pre-existing
  `extensions/lobster-host/index.ts` import; one broad npm postpublish test has
  an unrelated Windows path-separator expectation. The D5c worktree is clean
  and no matching PR exists in `openclaw/openclaw`.
  The RFC Fleet update is committed as `1cf5afd2964`, pushed, and reflected in
  the draft PR body. Package 1 is clean, synchronized, and mergeable at
  `8c3f109a1e2`. Package 2 is clean, synchronized, and mergeable at
  `0526a4a9e15`; fork-only `label` and `auto-response` failures remain expected.
  Package 3 is restacked onto package 2, clean, synchronized, and mergeable at
  `df1e3c6a724`. Fork PR 73 now presents one cell-local provider-dispatch
  session: no tenant selector, process-audience admission, peer/binding/bundle/
  owner fencing, post-hello activation, bounded credit/queues/traces, exclusive
  bundle ownership, HTTPS-preserving CAPI redirects, and inactive-by-default
  composition. All 412 tests across the 22 changed test files pass in seven
  Vitest shards. The final `codex review --base
  fork/user/giodl/hosted-integration-capi-owner-operations` exited clean with no
  accepted/actionable findings.
  Package 4 is restacked onto package 3, clean, synchronized, and mergeable at
  `f518a822261`. Fork PR 74 now contains seven commits across 24 files
  (+4743/-113): inactive Substrate, WebIQ, and Anthropic owner bindings, shared
  model dispatch, deterministic bundle composition, unique bundle-incarnation
  fences, HTTPS/route-policy redirect invariants, caller cancellation, and
  outbound header allowlists that prevent credential or cookie forwarding.
  All 71 focused tests across the 10 changed test files pass in four Vitest
  shards. Oxfmt, Oxlint, diff hygiene, and the final `codex review --base
  fork/user/giodl/hosted-integration-hosted-capi-execution` are clean.
  Package 5 is published at `128df4698d8`, exactly three commits above package
  3. Its 148 changed tests, generated channel metadata check, focused
  Oxfmt/Oxlint, package build-plan proof, and diff hygiene pass. Iterative Codex review fixed default
  account field clearing, normalized webhook route ownership, missing bundled
  channel metadata, incomplete runtime config validation, and concurrent
  duplicate-delivery races, runtime barrel drift, missing ACF package exports,
  setup account status, and strict source/test typing. The final review is
  clean. PR 75 is mergeable and its expected fork-only `label` failure remains;
  `Real behavior proof` and `auto-response` are still pending.
  Package 2 dependency hydration is blocked by the fork feed's unavailable
  `@openclaw/crabline@0.1.11` tarball, but the existing test harness and pinned
  standalone Oxfmt/Oxlint proof pass. The RFC worktree is clean. D2a, D2b,
  B1-F1, and C3 worktrees are otherwise clean; `claws-hapi` contains these
  hosted-integration note edits plus unrelated `projects/feeds/SESSION.md` and
  `.codex-review-state-continuity-output.txt` changes that must remain
  untouched.
- Blocking question: which OpenClaw promotion establishes the real F2
  compatibility expiry and begins the bounded zero-old-path measurement window
  for CAPI and Graph deletion?

## Resume Checklist

- Run: `git -C C:\src\openclaw-rfcs-duplex-transport status --short --branch`
- Run: `git -C C:\src\lobster-layering-audit status --short --branch`
- Review: `source-audit-2026-07-11.md`, `comparison-matrix.md`, and `role-review-2026-07-11.md`
- Treat `four-area-architecture.md` and the area documents as source audits,
  not the current implementation architecture.
- Review: RFC 0020's native attachment -> owner contract -> optional hosted
  dispatch decision tree.
- Continue: paired owner/adopter deletion slices before designing a reverse
  carrier.
- Next: monitor PR 75's pending fork checks and keep package 1 as the first
  upstream filing candidate unless the user authorizes a different order.
- Update: this file and the deletion ledger after each evidence slice

## Guardrails

- Preserve `OpenClawTransport` as the host/app Gateway client abstraction; reuse Gateway peer machinery only as an optional carrier implementation.
- Preserve `node.invoke` wire behavior and keep hosts distinct from nodes.
- Do not tunnel ProxyPipe envelopes through `host.invoke`.
- Keep Channels, approvals, AgentHarness, lifecycle, and continuity with their existing owners.
- Do not open an upstream RFC or implementation PR until explicitly requested after architecture review.

## Open Threads

- D4a is committed as `b359c0541ed` and open as fork-only draft PR 59 stacked
  on D2a PR 52. D4b is committed as `2ef805b5e0` and open as fork-only draft
  PR 9 stacked on Lobster D2b PR 6. Together they preserve exact `x-apikey`
  origin binding, request defaults and bounds, adult-result filtering,
  external-content wrapping, local/hosted parity, independent WebIQ readiness,
  stateless shared authority, rollback, and release-gated old-path retirement.
  D4c is committed as `a2a11dfadb8` and open as fork draft PR 62 stacked on
  D2a PR 52. It preserves bounded attachment transformation, exact API-key
  slot selection, fallback request fields, raw Anthropic SSE responses, and
  local/hosted parity without activating runtime authority. D4d is committed
  as `96d9b358da` and open as fork-only draft PR 10 stacked on Lobster D2b PR
  6. It preserves exact key/origin binding, owner-prepared final bytes,
  independent readiness, stateless authority, explicit rollback, redacted
  evidence, and release-gated old-path retirement without adding provider
  semantics to Rust. D5a is committed as `0b8f8684457` and open as fork draft
  PR 63 stacked on D2a. It keeps ACF Activity semantics in the Teams Channel
  owner, exact-binds `lobster/acf-token`, denies redirects, preserves raw
  responses, and remains inactive. D5b is committed as `681a394bf7` and open
  as fork-only draft PR 11. It captures trusted session identity outside the
  reverse wire, verifies the fixed Bot Framework audience, checks live
  disable/revocation state before acquisition, exact-binds the five D5a
  origins, and materializes only the bearer header value. D5c is committed as
  `5cce30fce01` and open as fork draft PR 65. D5d is implemented in
  `C:\src\lobster-hosted-integration-d5d-graph-adoption`: it adds the exact
  `lobster/graph-token` contribution and four-origin policy, a mailbox-bound
  WIF resolver that accepts only exact object ID or case-insensitive UPN,
  Graph canary readiness/rollback evidence, and m365mail-only Gateway bearer
  delivery. The host-provider suite passes 51 tests; focused runtime and
  adapter tests plus strict host-provider/runtime Clippy pass; final Codex
  review is clean. The vendored overlay and legacy Graph injection remain
  promotion-gated deletion targets because Lobster is still pinned to
  OpenClaw `v2026.5.28`.
- Consolidated package 5 is the reviewer-facing replacement for D5a/D5c:
  `C:\src\openclaw-hosted-package-5-microsoft`, branch
  `user/giodl/hosted-integration-microsoft-interactions`, published head
  `128df4698d8`. It preserves Teams ACF Channel semantics and Graph mailbox
  semantics as separate owners while sharing package 3's cell-local authority
  fences. Root packaging, generated metadata/docs, exact credential slots,
  identity checks, account behavior, rate limiting, persistent replay state,
  concurrent dedupe, strict typing, and package contract exports are proven.
  PR 75 is review-clean, mergeable, and curated as the final fork-only package.
- F2 is implemented in
  `C:\src\lobster-hosted-integration-f2-capi-observation`, stacked on D2b. It
  adds an exact CAPI observation contract with four rollout phases, minimum
  OpenClaw `2026.6.11`, redacted request/response fingerprints, independently
  supplied authority, and deterministic blockers for version, parity,
  old-path use, expiry, rollback, and phase drift. The fixture intentionally
  leaves compatibility expiry unset, so removal cannot be declared ready
  before promotion policy exists. The host-provider suite passes 45 tests,
  strict Clippy passes, and final Codex review is clean.
- E4a/E4b owns the continuity restore hold as a normal OpenClaw/Lobster pair.
  E4a extends the existing lifecycle-owner generation and operational
  surfaces after A3/B5/B6a/B6b; E4b fences both Lobster launch fan-ins after
  E4a/F1 and can proceed alongside D2. Both fork-only PRs are open; neither is
  an upstream activation or merge request.
- `OpenClawTransport` is confirmed as the public app SDK's client-to-Gateway
  request/event abstraction and is no longer extended by the RFC.
- RFC 0020 now leads with three composable branches: native attachments, owner
  contracts, and optional hosted physical dispatch. The old two-problem and
  four-area structures remain audit history rather than product frameworks.
- RFC 0020 adopts one complete Gateway cell per tenant trust domain. Owner
  bindings, credentials, generations, readiness, Status, and Doctor remain
  cell-local; payload tenant or session fields cannot select another cell.
  Fleet owns local lifecycle, Lobster may own multi-machine placement and
  aggregation, and neither becomes a semantic owner or shared application
  carrier. Fleet bridge isolation leaves outbound egress open by default, so
  the existing network-guard and host-policy work remains required.
- A ClawBus-style multiplexed session is not a V1 surface. Native transports
  remain authoritative, with one narrow provider-dispatch reverse carrier when
  the host must physically execute requests.
- The FACES area documents remain supporting evidence; the sellable architecture
  is one owner-first decision tree with shared composition and safety rules.
- The `.craft/roles` review approved the model with explicit attachment,
  single-writer migration, plan-generation/incarnation separation, and
  default-deny constraints.
- Exec approval is confirmed as Area 1 because the host carries a user/policy
  authorization decision over the canonical Gateway approval surface; it does
  not provide a runtime capability.
- `area-1-exec-approval-host-contract.md` defines the exact three-layer surface:
  owner attachment descriptor, reusable host approval consumer, and prepared
  composition binding.
- OpenClaw already has the reference approval consumer in
  `createExecApprovalChannelRuntime` and the typed Channel adapter surface in
  `ChannelApprovalCapability.nativeRuntime`.
- ProxyPipe deletion requires no new approval protocol. The likely OpenClaw
  product work is supported packaging, generated non-TypeScript schemas,
  conformance fixtures, lifecycle status, and hosting documentation.
- Rich human-actor provenance is not currently preserved in the Gateway
  approval record or the ProxyPipe response. Keep host audit correlation in V1
  and evaluate any structured actor assertion as a separate additive change.
- `area-1-channel-attachment-contract.md` defines Channel endpoint and adapter
  attachments without introducing a generic normalized ingress RPC.
- Lobster's existing HTTP Teams-delivery path proves that ordinary HTTP can
  replace ProxyPipe tags 12-13. The remaining contract is owner-defined
  trusted-forwarder authentication, classified acknowledgement, idempotency,
  readiness, and route generation.
- Approval and Channel integrations share composition metadata but deliberately
  do not share a callback schema: approvals are Gateway consumers; Channels
  are endpoint or Channel adapter attachments.
- `area-1-provider-traffic-governance.md` fixes the Area 1/Area 2 handoff:
  Area 1 compiles deny/narrow/route policy into the existing provider guarded
  fetch path; Area 2 supplies a dispatcher only when the host physically
  executes the request.
- Standard proxy, TLS, and service-mesh egress remain valid bindings. A remote
  policy callback and a hosted HTTP dispatcher are not required for ordinary
  governed deployments.
- `area-1-operations-and-catalog.md` completes the common model with three V1
  attachment kinds: Gateway client, Channel endpoint, and traffic policy.
- Area 1 owns those OpenClaw-driven integration seams. Each owner retains
  validation, activation, generation, provenance, and migration authority;
  Area 3 aggregates trusted owner evidence through Hosting Profiles, status,
  and Doctor.
- A remote Channel adapter is deferred until a concrete Channel proves that
  endpoint routing and ordinary outbound governance are insufficient.
- Canonical Gateway administration remains Gateway-owned. The assembled status
  view reports owner-produced desired/effective state, generation, readiness,
  provenance, and migration authority; it does not accept host-written health
  truth.
- `area-1-role-review-2026-07-11.md` approved the three-kind model after
  requiring phased activation, separate least-privilege clients, fixture-only
  Channel shadow validation, schema-evolution rules, and cross-system audit
  correlation.
- Area 1 evidence targets are canonical exec approval tags 29-30, Teams Channel
  endpoint tags 12-13, and a compiled provider traffic-policy fixture.
- Area 2 starts with provider-request dispatch as the first deletion-bearing
  capability binding; secret resolution remains the strongest internal
  analogue and a later interface proof.
- Audit the exact provider-request dispatch seam, stream normalization,
  cancellation, retry ownership, limits, and current Lobster tags 1-5 before
  fixing the portable contract.
- Area 2's four leading capability families are secrets, request dispatch,
  publication, and telemetry. They share owner-defined binding selection and
  composition metadata, not one payload or invocation protocol.
- Area 2 is sufficient for Area 3 design, but its dispatcher evidence slice
  is now defined in `area-2-provider-dispatch-contract.md` and
  `area-2-provider-dispatch-evidence-slice.md`.
- The final seam is one redirect-disabled exchange inside OpenClaw's guarded
  fetch loop. OpenClaw retains redirect/header/retry/response semantics; the
  dispatcher enforces a fixed OpenClaw network-guard profile where it resolves
  DNS and connects.
- Hosted automatic redirect following is deliberately removed. This closes the
  current gap where Lobster's default `reqwest` client may follow a redirect
  after only the initial hostname passed the product allowlist.
- Local/hosted equivalence means the same guard profile produces the same
  decision. A managed binding may explicitly authorize named private
  origins/CIDRs that the local/default binding denies.
- V1 credential slots cover one origin-scoped header. Current CAPI, Substrate,
  IDP, Channel, and body-rewriting paths use separately registered
  owner-specific provider adapters plus credential-slot resolvers before
  ProxyPipe tags 1-5 can be deleted.
- The `lobster-host` bundle is the coherent supply surface for all three parts:
  provider adapters such as `lobster/capi`, credential resolvers such as
  `lobster/capi-token`, and the physical `lobster/egress` dispatcher. Typed
  owner config composes them; the dispatcher remains semantically empty.
- `provider-assembly-role-review-2026-07-11.md` completed the final
  `.craft/roles` pass. Its key correction is that provider adapters register
  with their actual semantic owner—CAPI/Substrate with model providers,
  Channel adapters with Channels—rather than through a universal
  `providerRequestAdapters` registry.
- Bundle declaration is validated as one immutable registration snapshot;
  owner activation remains independent. Credential use is the intersection of
  adapter declaration, owner config, resolver placement/origins, and
  traffic/network policy.
- B4 is published as fork draft PR 43. The `lobster/capi` owner contribution
  validates the endpoint template, tenant, model, body, metadata-header
  ownership, exact `lobster/capi-token` declaration, and successful SSE
  adaptation without acquiring credentials or selecting transport.
- B4 proof passed 119 focused tests, formatting, focused lint, core TypeScript,
  and final diff checks. Codex findings for spoofed headers, CR-only/mixed SSE
  boundaries, stale `Content-Length`, HTTPS bearer transport, and recovery
  after oversized SSE events were fixed. Immediate request-path wiring was
  rejected as a stack-boundary violation because D2a explicitly owns activation.
- B5 is published as fork draft PR 45. `host-integration-bundle/v1` validates a
  complete candidate and atomically replaces one process-wide immutable
  desired/resolved inventory only after all required contributions are present
  and exact-version compatible.
- B5 initially admits only the two real B3/B4 contribution types. It adds no
  config key, plugin-manifest field, runtime activation, or startup fallback;
  D1a owns registration of the first concrete `lobster-host` package after
  plugin and owner discovery.
- B5 proof passed 7 focused tests, formatting, focused lint, core TypeScript,
  and diff checks. Codex findings for raw validation errors, strict SemVer,
  single-slot publication, and cross-owner duplicate IDs were fixed. Automatic
  startup registration was rejected because no concrete host package exists
  before D1a.
- B6a is published as fork draft PR 46. `host-integration-status/v1` joins the
  current B5 desired/resolved bundle inventory with one atomic owner-evidence
  snapshot and projects it through `status --json` only when a bundle exists.
- B6a keeps bundle, owner, carrier, and carrier-incarnation generations
  separate. Owner evidence must name the bundle generation it observed;
  mismatches are reported as `stale` and cannot masquerade as current
  readiness. No probing, activation, config, or Doctor remediation was added.
- B6a proof passed 17 focused tests, formatting, focused lint, core TypeScript,
  and diff checks. Codex's disconnected-evidence and stale-generation findings
  were fixed; the final review was clean.
- B6b is published as fork draft PR 47. It registers
  `core/doctor/host-integration-bindings` through OpenClaw's existing structured
  health pipeline and projects only non-ready B6a inventory entries.
- B6b is read-only and emits no success finding. Required unavailable bindings
  are errors; degraded, stale, unresolved, and optional unavailable bindings
  are warnings with bounded remediation.
- B6b never copies owner messages and exposes only approved operational reason
  codes. Unknown reasons become generic owner-reported state causes, preserving
  secret redaction and owner authority.
- B6b proof passed 105 focused tests, formatting, focused lint, core TypeScript,
  and diff checks. Codex's contribution-versus-package remediation finding was
  fixed; the final review was clean.
- C1 is published as fork draft PR 48. `reverse-provider-dispatch/v1` is a
  closed provider-dispatch-only frame contract, strict parser, single-operation
  trace evaluator, and language-neutral fixture corpus.
- C1 carries connection incarnation, operation, owner generation, and host
  bundle generation on every frame. It defines byte credit, bounded chunks,
  half-close, advisory cancellation, dispatch certainty, terminal outcomes,
  explicit disconnect synthesis, and no automatic reconnect replay.
- C1 hardens the complete B2 network-guard profile for untrusted wire use,
  including exact nested shape, DNS-rebinding enforcement by resolution mode,
  target-consistent TLS posture, and allocation-free canonical Base64 length
  measurement.
- C1 proof passed 39 focused C1/B1/B2/B3 tests, formatting, focused lint, core
  source TypeScript, mode and diff checks. Codex findings for late/stale frame
  authority, nested guard validation, DNS/TLS invariants, Base64 allocation,
  and sequence-width frame limits were fixed; the final review was clean.
- C2 is published as fork draft PR 49. It adds a distinct `host-provider`
  Gateway role, signed process-scoped admission credentials, one hidden
  `host.provider.frame` method, and a bounded reverse-session registry.
- C2 host-provider sessions are excluded from operator/node methods, presence,
  generic broadcasts, advertised plugin surfaces, and snapshots. Non-core
  descriptors cannot claim the host-provider scope.
- C2 binds admission and every frame to peer identity, binding, interface and
  carrier versions, owner generation, bundle generation, and a fresh
  incarnation. Authority changes revoke connected sessions and settle active
  work at observed C1 dispatch certainty without replay.
- C2 proof passed 63 focused Gateway tests, 66 protocol/hosting tests, 8 Doctor
  tests, formatting, focused lint, core source TypeScript, mode and diff
  checks. Codex findings for trusted credential issuance, connected-session
  generation freshness, and non-core host-provider scope claims were fixed;
  the final direct review was clean.
- C3 is published as fork-only Lobster draft PR 2. The new inactive
  `lobster-host-provider` crate implements the C1 wire and C2 handshake,
  bounded actors, flow control, cancellation, certainty, deadline enforcement,
  generation fencing, reconnect lifecycle, credential slots, redirects-off
  dispatch, and pinned/proxy network-guard enforcement.
- C3 proof passed 12 standalone Rust tests, strict Clippy, locked workspace
  metadata, formatting, and final diff checks. Codex findings for WebSocket
  control frames, connect response shape, caller-owned DNS bypass, and permit
  lifetime across response streaming were fixed; the final review was clean.
- D1a is published as fork draft PR 50. The disabled-by-default bundled
  `lobster-host` plugin publishes one atomic five-part `lobster/host@1.0.0`
  inventory only during its startup-service lifetime and clears only the exact
  snapshot it registered.
- D1a adds a generic typed Plugin API registration seam rather than a
  Lobster-specific SDK helper. Core derives trusted plugin provenance; the
  package declares the CAPI adapter, credential resolver, traffic policy,
  dispatcher, and reverse carrier but does not select or activate any owner.
- D1a proof passed 11 focused bundle/registry/extension tests, 8 Plugin SDK
  contract and baseline tests, formatting, and diff checks. Direct Codex review
  found no actionable regressions. Broad Crabbox proof was blocked because
  Blacksmith was unauthenticated and no AWS broker login was configured, so the
  fork PR CI owns that remaining gate.
- D1b is published as fork-only Lobster draft PR 3. It adds a checked-in
  `lobster-host-deployment/v1` artifact that must match the complete D1a
  five-part inventory and remain disabled by default.
- D1b records startup predecessors, reconnect limits, dispatcher concurrency,
  and graceful-shutdown budget; exposes validated deployment-owned backoff to
  the C3 lifecycle; and projects redacted carrier status that is always
  non-authoritative.
- D1b deliberately does not wire live CAPI credentials or authority. D2b owns
  token/selection/canary/rollback, while E3b owns enterprise policy semantics.
  Proof passed 16 focused Rust tests, strict Clippy, formatting parity, locked
  Cargo metadata, diff checks, and a clean direct Codex review.
- E3b is published as fork-only Lobster draft PR 4 at `bd59ffa735`. It compiles
  `lobster/enterprise-egress` into E3a's exact
  `provider-request-traffic-policy/v1` registration and consumes the canonical
  cross-language fixture.
- E3b validates route/rule identity, exact origins, strict `llm`/`stream`
  scope, overlapping route conflicts, proxy credentials/private-proxy posture,
  TLS verification, hostname pins, safe provenance, generation freshness, and
  redacted readiness. Missing, stale, conflicting, malformed, or insecure
  policy remains non-ready.
- E3b proof passed 24 focused Rust tests, strict Clippy, rustfmt CI parity,
  locked Cargo metadata, fixture content parity, diff checks, and final
  full-access Codex review with no actionable findings. The one rejected review
  suggestion would have forbidden HTTP origins contrary to E3a's portable
  local/private-origin contract; guarded fetch and `allowPrivateNetwork` remain
  authoritative.
- F1 is published as fork-only Lobster draft PR 5 at `9ebedf42bb`. It adds an
  immutable `lobster-host-composition/v1` snapshot that selects the five D1b
  CAPI-wave contributions and classifies all owner readiness criteria through
  `lobster/managed`.
- F1 cross-checks selection kinds against the bundle inventory, compiles E3b's
  policy generation, fences configured owner generations, and makes
  unresolved, ambiguous, incompatible, disabled, stale, and non-ready states
  explicit. Owner evidence drives readiness; configuration cannot assert
  health.
- F1 always reports `authoritative: false`, keeps
  `legacy-proxy-pipe` effective, and records the exact `llm-default`,
  ECS-or-startup, `LOBSTER_CONTAINER_PROXY_ENABLED=true` rollback selection for
  D2b. Proof passed 33 focused Rust tests, strict Clippy, rustfmt CI parity,
  locked Cargo metadata, diff checks, and clean full-access Codex review.
- E3a is published as fork draft PR 51. It adds
  `provider-request-traffic-policy/v1`, a local immutable generation that can
  deny or narrow origins, private-network posture, timeout, route, proxy/TLS,
  and hostname pins before guarded dispatch.
- E3a exposes snapshot-scoped Plugin API registration bound to the owning
  plugin lifecycle. Inactive loads do not publish policy, failed activation
  rolls back, unrelated plugins cannot replace a same-ID generation, and
  explicit policy routing suppresses weaker environment-proxy fallback.
- E3a revalidates every redirect against the same compiled policy generation,
  route, dispatcher, timeout, and private-network decision. It also prevents a
  policy denial from retaining OpenClaw's implicit exact-origin trust for
  private custom/local endpoints.
- E3a V1 intentionally advertises only the enforced guarded streaming LLM
  surface. Other provider capabilities and transports require equivalent
  owner-path enforcement before the public contract expands.
- E3a proof passed 203 focused policy, Plugin API, guarded-fetch, transport, and
  bundle tests, core TypeScript, focused Oxlint/formatting, Plugin SDK baseline,
  and diff checks. Direct Codex review findings for lifecycle rollback,
  configured TLS/pin preservation, redirect bypass, snapshot mutability,
  over-broad transport claims, private-origin trust, and plugin ownership were
  fixed; the final direct review was clean.
- D2a is published as fork PR 52 at `aac68918149`. It resolves the exact CAPI
  adapter, credential slot, traffic policy, and dispatcher references from one
  immutable bundle snapshot, then injects the selected one-hop dispatcher into
  guarded fetch without activating Lobster or changing the local default path.
- D2a adapts C2 reverse operations into ordinary streaming `Response` objects,
  obeys byte-granular request credit, preserves dispatch certainty and
  unfollowed redirects, keeps redirect/SSRF policy in OpenClaw, captures config
  and dispatcher implementations immutably, and fences config, bundle, and
  owner generations independently.
- D2a proof passed 158 focused tests, core and test TypeScript, full core
  Oxlint, formatting, Plugin SDK baseline generation/check, and direct diff
  review. Review fixes covered partial-credit flow control, abort-listener
  lifetime, immutable implementation capture, binary body preservation, and
  combined-stack lint/type issues.
- D2b is published as fork-only Lobster draft PR 6 at `b7eb31865e`, stacked
  on F1. It prepares the exact `lobster/capi-token`, `lobster/managed` policy
  route, `lobster/egress` dispatcher, and C3 streaming carrier dependency,
  while reusing the existing runtime `CapiClient` through a narrow token
  resolver adapter.
- D2b adds a canary composition generation, single-writer authority
  reconciliation, readiness-loss and operator rollback, policy-generation
  fencing, bounded dispatcher resources, and redacted transition correlation.
  Validation-only remains legacy-authoritative and unchanged reconciliation
  emits no duplicate transition or replay.
- D2b proof passed 41 host-provider tests, 4,113 Lobster runtime library tests,
  strict Clippy across both affected crates, rustfmt, workspace metadata, and
  diff checks. Private Cargo feed access uses a process-local Azure CLI token
  with the required `Bearer ` prefix; no credential was persisted.
- D3a is published as fork draft PR 53 at `f58b0b24ee0`, stacked on D2a. It
  adds the typed `lobster/substrate-llmapi` model-owner adapter, exact
  `lobster/substrate-token` credential slot, immutable hosted binding, and the
  expanded `lobster/host@1.1.0` contribution inventory.
- D3a preserves request body bytes, endpoint path/query behavior, safe raw or
  mapped model selection, development/production taxonomy routing, protected
  owner headers, and origin-bound credential materialization. CAPI and
  Substrate now share one guarded policy/dispatcher path with redirect route
  stability and captured dispatcher identity.
- D3a proof passed 48 focused tests, core/core-test and
  extensions/extensions-test TypeScript, focused core and extension Oxlint,
  formatting, and diff checks. Direct review fixes covered mapped/default
  configuration error taxonomy, unreachable whitespace model-map keys,
  normalized-path traversal, and immutable route/dispatcher capture.
- `implementation-pr-series.md` splits delivery into contracts/readiness,
  OpenClaw owner surfaces, reverse carrier, Lobster semantic migrations, Area 1
  migrations, and final adoption/cleanup. Approvals, Teams endpoint, Hosting
  Profiles, traffic policy, and local dispatcher foundations can proceed in
  parallel. Upstream PRs are framed as independently useful OpenClaw
  factorings; Lobster-specific compatibility retirement remains downstream.
- `implementation-pr-series-role-review-2026-07-11.md` approved the wave map
  after strengthening the first milestone. It now spans Waves 1-4 and proves
  the complete CAPI path: bundle, model adapter, credential resolver, policy,
  reverse dispatcher, streaming, Hosting Profiles, Status, Doctor, canary
  authority, and rollback. Provider-neutral fixtures remain conformance only.
- `pr-plans/` now contains 37 execution briefs, each mapped to one repository
  PR. Cross-repository adoption is split into explicit OpenClaw-owner and
  Lobster-implementation PRs.
- `pr-plans-role-review-2026-07-11.md` records the final role pass. It required
  B6 Status/Doctor separation, repository-specific D2-D5 and E1-E3 plans,
  explicit runtime/security/version-skew gates, and F1 inactive preparation
  before D2b owns CAPI canary authority and rollback.
- The PR map now has an explicit four-area integration matrix. E1 approvals,
  E2 Teams, and E3 traffic policy must each update the same versioned
  `lobster-host` registration, typed owner selection, owner readiness, Hosting
  Profile posture, Status, and Doctor surfaces. Area 4 remains binding-specific:
  Gateway and Channel use native paths while hosted provider dispatch uses the
  narrow reverse carrier.
- `managed-configuration-alignment.md` defines the cross-project boundary:
  managed layers may exact-own hosted selection fields and publish them in one
  effective config generation, while bundle registration, owner resolution,
  activation, readiness, and carrier state remain outside config composition.
- Request and response streaming, bounds, credit, half-close, dispatch
  certainty, and advisory cancellation are V1. One-shot request bodies are not
  silently buffered for body-preserving redirects.
- `area-2-role-review-2026-07-11.md` approved the revised contract.
- Area 3 does not own a global binding plan. Owners validate and activate their
  own references, publish trusted evidence, and retain generation and
  single-writer migration authority.
- Hosting Profiles is the likely Area 3 foundation, not merely an analogue. Its
  live stack already supports trusted plugin criterion registration, advisory
  defaults, namespaced profiles that promote selected criteria to required,
  fail-closed `Unknown`, and `/ready`/health/status projection.
- The sharper Area 3 split is: owner configs select and configure bindings;
  owner registries validate, activate, and publish evidence; Hosting Profiles
  declares which conditions are required; readiness gates traffic; richer
  binding generation/incarnation/provenance remains status, not readiness.
- Avoid a duplicate `hosting.bindings` config tree or global activation DAG
  unless a concrete cross-owner dependency proves owner activation plus profile
  readiness is insufficient.
- OpenClaw capability-provider registries already implement the desired
  reference-and-registry pattern: config selects a provider ID, plugin
  registration supplies the implementation, and missing registration fails
  explicitly. Area 2 should reuse this where the capability is plugin-backed.
- .NET keyed services plus health checks validate separating implementation
  selection from readiness. Kubernetes readiness gates validate that a missing
  required criterion must keep the workload non-ready. Neither justifies a new
  OpenClaw DI container or controller loop.
- Area 3 is resolved as a Hosting Profiles integration, not a new composition
  subsystem. Owner config selects bindings; registries resolve them; every Area
  1/2 binding publishes trusted readiness evidence; named profiles promote
  selected criteria to required; status and Doctor provide richer detail.
- Area 4 must now evaluate direct HTTP/WebSocket, standard proxy/service mesh,
  dedicated reverse connections, Gateway peer machinery, and optional
  multiplexing against the concrete Area 1/2 bindings.
- Area 4 V1 is intentionally narrow:
  `area-4-provider-dispatch-reverse-carrier.md` defines one optional
  provider-dispatch-only reverse session for the case where a proxy/service
  mesh cannot work and the host must physically execute requests. It reuses
  Gateway admission/peer machinery where practical but isolates provider
  streaming from operator traffic and does not create a generic host bus.
- `host-integration-bundle.md` is now the cross-area answer. Lobster registers
  one namespaced bundle containing its attachment, capability-provider,
  carrier, and readiness contributions. Typed references remain in the owning
  OpenClaw config areas; `lobster/managed` Hosting Profiles requirements,
  status, and Doctor provide the central assembled contract and operational
  view.
- RFC 0020 now reflects the bundle-centered architecture, Hosting Profiles
  readiness, owner-local activation, native carriers, and the narrow
  provider-dispatch reverse carrier.
- RFC 0020 and the fork PR body now include explicit Area 1 and Area 2 scope
  tables: attachment/capability contracts, canonical owners, initial Lobster
  migrations, exclusions, and the exact traffic-policy-to-dispatcher handoff.
- The public RFC and PR body no longer use numbered area terminology. They use
  plain-language sections: host attachments, runtime capabilities,
  registration/readiness, and connection choices.
- `pr-body-role-review-2026-07-11.md` revised the fork PR pitch for executives,
  maintainers, operators, security, runtime, and new readers. The body now
  leads with business/operational value, compares today versus the proposal,
  preserves the full scope and diagram, explains delivery risk controls, and
  ends with the exact architecture decision requested.
- The RFC and PR body now explicitly answer why ProxyPipe could not simply use
  existing config: several owner-supported registration/binding seams do not
  exist. They separate those missing seams from the bundle, whose role is only
  coherent packaging, atomic registration validation, typed owner references,
  inventory, readiness, Status, and Doctor correlation.
- `bundle-centered-role-review-2026-07-11.md` completed the final runtime,
  operator, security, ecosystem, and simplicity review. It approved the model
  after clarifying load versus readiness, owner versus host bundle generation,
  dispatcher credential exposure, independent policy/dispatcher criteria, and
  advisory cancellation.
- Decide whether the reverse carrier reuses the Gateway WebSocket protocol, a
  dedicated Gateway-listener subprotocol, or only Gateway admission/identity
  machinery.
- Prove provider credential slots, dispatch certainty, and owner-generation
  binding for the selected carrier.
- Quantify removable ProxyPipe frames and Rust/TypeScript code.
- Design mixed-version migration with an explicit fallback expiry.
- B1 landed on the fork as draft PR 34. It extracts a typed
  `OneHopFetchDispatcher` around the existing local redirect-disabled exchange,
  requires `redirect: "manual"`, preserves response identity and transport
  errors, and leaves SSRF, DNS pinning, redirects, capture, timeout, and release
  ownership in guarded fetch.
- B1 proof: `pnpm tsgo:core`; 93 focused tests across
  `one-hop-fetch-dispatcher.test.ts` and `fetch-guard.ssrf.test.ts`; final
  full-access Codex autoreview reported no actionable regression.
- Autoreview rejected the first injectable draft because a remote
  implementation could ignore the non-portable Undici dispatcher and resolve
  DNS again. Runtime selection is therefore deferred until B2 carries an
  enforceable guard profile at the actual connection owner.
- B2 landed on the fork as draft PR 35. It adds a fixed
  `network-guard/v1` profile carrying the exact target, route and DNS owner,
  TLS posture, address policy, explicit private CIDRs, special-range posture,
  and DNS-rebinding requirement for every one-hop exchange.
- B2 distinguishes rebinding policy from proof:
  `local-pinned` requires a prepared local dispatcher,
  `connection-owner-required` assigns enforcement to the proxy/host that
  resolves and connects, and `not-enforced` accurately describes legacy
  caller-resolved execution.
- B2 publishes language-neutral fixtures for public, private, mixed-address,
  rebinding, exact-origin, link-local, redirect-origin, and RFC2544 behavior.
- B2 proof: focused format/lint; `pnpm tsgo:core`; 176 focused tests across
  profile, fixture, SSRF, pinning, dispatcher, and guarded-fetch suites; final
  `codex review --uncommitted` reported no accepted/actionable findings.
- B3 landed on the fork as draft PR 38. It adds fixed
  `credential-slot/v1` and `credential-slot-resolver/v1` contracts for one
  exact-origin header, plus immutable preparation and local one-hop
  materialization.
- B3 requests name only a prepared slot ID. Header, origin, resolver, version,
  and required posture are fixed before dispatch; missing, duplicate,
  ambiguous, incompatible, cross-origin, conflicting, unavailable, and expired
  states fail before provider send.
- B3 readiness reports only non-secret binding metadata and never invokes the
  resolver. Invalid request references are validated before any credential is
  acquired, and injected values remain below guarded-fetch capture and
  redirect state.
- B3 proof: focused format/lint; `pnpm tsgo:core`; 109 focused tests across
  credential slots, one-hop dispatch, network guard, and guarded-fetch
  redirects; final `codex review --uncommitted` reported no
  accepted/actionable findings.
  Package 4 is clean and published at `f518a822261`; PR 74 is a mergeable
  fork-only draft based on package 3. Dependency installation remains
  incomplete because the configured Microsoft package feed returns 404 for
  `@openai/codex@0.144.4`, but the existing hydrated test harness was sufficient
  for the full focused proof.
  Package 5 is fully restacked and published at `128df4698d8` with exactly
  three commits above `df1e3c6a724`. The ACF and Graph owners retain exact
  identity, credential, response, replay, and route-policy semantics while
  using package 3's bounded hosted-dispatch substrate. PR 75 is tested,
  review-clean, mergeable, and curated with explicit evidence and non-goals.
