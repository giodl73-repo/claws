# Hosted Layer Role Review

## 2026-07-10 Readiness Provider Follow-up

The latest role review found no architectural blocker, but identified that the
plugin readiness facility needed a stronger public contract. RFC 33 now frames
registration as a readiness provider: a lifecycle-owned, enumerable,
self-describing producer with stable identity and bounded evaluation.

The RFC now requires provider checks to be observational, read-only,
idempotent, concurrency-safe, cancellation-aware, and free of blocking
synchronous I/O. It explicitly states that every active plugin provider is
evaluated as advisory by default and that plugin reasons are stable within the
provider identity while messages must not expose sensitive data.

The target contract also normalizes the original fixed Gateway readiness
signals into core conditions. Startup, drain, and unsuppressed channel failures
remain required; event-loop health remains advisory initially to preserve
current behavior. Legacy fields remain compatibility projections rather than a
permanent second readiness model.

Profile support ownership is also explicit. OpenClaw ships a small catalog of
standard profiles and validates them in release gates. Every v1 operator profile
extends one standard profile and cannot weaken it; the plugin or operator owns
the added criteria and additional promise. A later revision may allow a wholly
operator-composed profile, but it must remain conjoined with universal Gateway
lifecycle readiness.

## 2026-07-10 Current-Head Role Review

Reviewed:

- RFC PR 33 at `da4539c`;
- ready surfaces PR 17 at `f11b19d553`;
- profile selection PR 18 at `87cf11e944`;
- node-mode PR 19 at `22bdbbd3c8`;
- the package-installed Docker conformance lane carried by the stack.

Roles applied: founder, Gateway engineer, platform engineer, Lobster container
engineer, CISO, compliance, release engineer, repo steward, Lorant reviewer,
policy steward, new hire, and OpenClaw power user.

### Verdict

The architectural center remains correct:

```text
selected support posture
+ existing OpenClaw config and live runtime facts
-> conditions on existing /ready and /readyz
-> the same result projected into health and status
```

This is an OpenClaw-native hostee contract, not Lobster configuration, policy,
OCC, or a parallel evidence framework. The default remains optional and
boring, remote unauthenticated probes retain boolean-only redaction, and
existing Gateway lifecycle readiness remains authoritative.

The fresh review did find four issues to close before promoting implementation
PRs upstream. They do not invalidate the design, but they are likely maintainer
surprises if left implicit.

Resolution: all four findings were addressed in the draft stack on the same
day. `managed` was deferred, packaged reverse-proxy conformance was added,
node-mode pairing reads gained a one-second coalescing cache while live facts
remain current, and the duplicate nested HTTP payload was removed before any
upstream implementation PR was filed.

### Findings

#### P1: `managed` does not define a distinct support contract

`managed` and `reverse-proxy` currently evaluate the same
`TrustedProxyReady` predicate. A named profile is a release/support promise; an
alias with no distinct invariant expands the public matrix without proving a
new runtime shape.

Role pressure: founder, repo steward, release engineer, new hire.

Smallest fix: remove `managed` from the first RFC/PR and add it later when it
has a real OpenClaw-owned predicate. Alternatively, explicitly define it as a
stable alias and explain why that alias deserves independent support, though
removal is cleaner.

#### P1: The conformance lane does not prove every proposed built-in profile

The Docker lane proves `local`, positive/negative `container`, and the
`node-mode` transition. `reverse-proxy` and `managed` are proposed as supported
built-ins but currently have predicate unit tests rather than packaged runtime
conformance scenarios.

Role pressure: platform engineer, release engineer, Lobster container
engineer, power user.

Smallest fix: add one packaged `reverse-proxy` success and one missing-header
or missing-source failure scenario to PR 18. If `managed` remains, it needs a
distinct scenario that proves its distinct contract. Otherwise defer it.

#### P1: Node-mode readiness performs uncached synchronous state reads

Every node-mode readiness evaluation calls `listNodePairing()`. That path
loads the full pairing snapshot through synchronous SQLite queries under the
shared pairing lock. The existing Gateway lifecycle checker has a one-second
cache, but the hosting wrapper performs this node read after that cache on
every `/ready` request and health refresh.

Frequent supervisor probes should not add unbounded lock waits or synchronous
database work to the Gateway event loop.

Role pressure: Gateway engineer, platform engineer, Lorant reviewer.

Smallest fix: evaluate node readiness from a Gateway-owned cached snapshot,
invalidate it on pairing/session changes, or apply the same short bounded cache
to the complete merged readiness result. Add a test proving repeated probes do
not repeatedly read the pairing store inside the cache window.

#### P1: The HTTP readiness payload exposes an undocumented duplicate object

`mergeGatewayAndHostingReadiness()` projects profile conditions at the
documented top level and also returns a nested `hosting` object containing the
same result. Because the HTTP probe serializes the whole `ReadinessResult`, the
nested field becomes public even though the RFC specifies only the top-level
shape. This creates two sources for consumers and future drift risk.

Role pressure: repo steward, Lorant reviewer, new hire, power user.

Smallest fix: keep the nested value internal to health composition or remove
it from the serializable result. `/ready`, health, and status should expose one
canonical public readiness object.

### Important Clarifications

These should be explicit in the RFC even if no implementation changes are
needed:

- A profile names the expected ingress/runtime posture, not the physical fact
  that a process happens to run in a container. A container behind a trusted
  identity proxy selects `reverse-proxy`; direct container ingress selects
  `container`.
- `node-mode` means at least one approved, live, controllable target. It does
  not prove that every target desired by OCC or Lobster is present. Desired
  fleet cardinality remains a control-plane/host concern unless OpenClaw later
  gains a desired-target resource.
- Readiness is point-in-time operational evidence, not an audit attestation.
  CISO/compliance event durability and transition telemetry remain follow-up
  work and must not be claimed by this RFC.
- Policy and doctor may diagnose selected-profile conformance later, but they
  remain optional consumers and are not readiness dependencies.

### Role Conclusions

| Role                           | Assessment                                                                                                                                          |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Founder                        | Natural upstream feature if the first profile catalog stays minimal; remove aliases that look enterprise-shaped without distinct semantics.         |
| Gateway engineer               | Probe-path integration is correct; uncached synchronous pairing reads need a bound.                                                                 |
| Platform engineer              | Stable reasons and profile identity are valuable; every shipped support profile needs packaged conformance proof.                                   |
| Lobster container engineer     | The profiles provide a useful hostee boundary; document direct-container versus proxied-container selection explicitly.                             |
| CISO / compliance              | Correctly scoped as operational readiness, not governance or audit proof. Redaction behavior is preserved.                                          |
| Release engineer               | Three proven postures are credible; unproven profile names should not enter the support matrix.                                                     |
| Repo steward / Lorant reviewer | Existing surfaces and ownership fit; remove the duplicate nested payload and keep one canonical result.                                             |
| Policy steward                 | Clean separation: profile selects runtime requirements, core facts provide evidence, optional policy can consume later.                             |
| New hire / power user          | Default local behavior remains low ceremony; profile names need topology guidance to avoid selecting `container` merely because Docker is involved. |

### Recommendation

Keep the RFC and three-PR structure. Before upstream promotion:

1. Defer `managed` unless a distinct invariant is defined.
2. Add packaged reverse-proxy conformance to PR 18.
3. Bound/cache node-mode pairing evaluation in PR 19.
4. Remove the duplicate public `hosting` payload.
5. Run the existing Docker lane on Linux and attach the exact output.

After those changes, the remaining questions are normal maintainer product
choices rather than architectural surprises.

### Resolution Heads

- PR 17: `cefbe89976` removes the undocumented nested readiness copy.
- PR 18: `00fef7fde8` narrows the catalog and proves reverse-proxy success and
  failure in the packaged Docker lane.
- PR 19: `c034dc4311` coalesces pairing reads for one second while reevaluating
  live sessions and command policy on every probe.
- RFC PR 33 head: `7e77045` records the narrowed catalog, topology
  selection rule, canonical result, and node-mode cache/cardinality boundary.

The next profile should not be chosen by deployment branding. Candidates such
as a sandbox cell, remote harness, or shared multi-tenant runtime belong only
after OCC or AgentHarness exposes a distinct OpenClaw-owned invariant that can
be evaluated and release-tested.

## 2026-07-10 Refresh: Hosting Profiles / Ready Check

Reviewed the current RFC PR and fork PR stack after the design pivot:

```text
hosting profile
-> required/optional criteria
-> rules over runtime status/config fields
-> readiness conditions
```

Current heads reviewed:

- RFC PR 33: `5d3b673`
- OpenClaw PR 18: `ed4823d67d`
- OpenClaw PR 19: `662a0034c3`

### Net Assessment

The model is now substantially cleaner than the earlier "hosted layer" shape.
It no longer looks like a Lobster compatibility layer or a second status/evidence
system. It reads as an OpenClaw-native hostee contract:

- config selects the support contract (`hosting.profile`);
- status/config fields remain the source of runtime facts;
- criteria are named rules over those facts;
- readiness is a projection surfaced through `ready`, `status --json`, and
  Gateway health;
- custom host criteria extend the model without redefining built-ins.

That alignment removes the biggest reviewer objection: "why isn't this just
status/health/config/policy?" The answer is now precise: it is a profile-selected
readiness projection over those existing surfaces.

### Role Findings

#### Founder / Upstream Fit

Strong. The proposal now benefits any host, not only Lobster. Built-in profiles
are small and product-neutral, and custom profiles are namespaced. The RFC keeps
Lobster, Scout, Teams, Kusto, tenant routing, and Microsoft storage out of
OpenClaw. This should pass the "would this feel natural in OpenClaw?" test.

Remaining ask: keep the default `local` path boring and invisible. Any managed
or enterprise posture must remain opt-in through profile selection.

#### Gateway Engineer

Improved. Readiness criteria evaluate startup/status facts and do not introduce
hot-path governance hooks. `/ready`, status, and health are probe paths, not
per-message or per-tool-call hooks.

Remaining ask: profile evaluation should remain bounded and non-blocking for
ordinary status. The PR already uses `probe: false` for fast status paths; keep
that invariant explicit in review.

#### Lorant Reviewer

Much improved. The current design reduces partial-conversion risk by making
criteria list their `statusFields`. That gives reviewers something concrete to
check:

```text
criterion says it reads field X
status/health exposes field X
tests prove criterion behavior when X is present/missing
```

Remaining blocker class: any criterion that reads private config or ad hoc
inputs without listing a status field should be treated as a design regression.
For upstream PRs, add or keep tests that prove status JSON/health expose the
same readiness result used by `/ready`.

#### Policy Steward

Strong. This now matches the policy-steward preference:

- profile/criteria config is authored requirement;
- OpenClaw status/config provides evidence;
- readiness conditions are observed result;
- doctor/policy can later lint or attest without becoming a dependency of
  core `/ready`.

Remaining ask: avoid making `hosting.criteria` a dumping ground for policy.
Core readiness should stay about host startup/serving readiness. Policy can
later consume the same facts for conformance.

#### Platform Engineer

Strong direction. Profiles create a supportable fleet matrix:

- which profile was selected;
- which status fields back readiness;
- which stable reasons block traffic;
- which release tests prove the profile.

Remaining ask: add Docker/Compose proof and eventually release/QA profile
coverage so this becomes more than a schema promise.

#### Lobster Container Engineer

Strong. `curl -fsS http://127.0.0.1:18789/ready` is the one-line container
convention Lobster needs. The selected-profile field closes the common operator
bug where the container is healthy but running the wrong mode.

Remaining ask: container proof should show real host behavior:

- profile passed at startup;
- readiness reports the selected profile;
- failed Gateway or wrong profile returns non-zero;
- host manifest owns retry/timeout/start-period values.

#### CISO / Compliance

Better, but intentionally not done. The profile/criteria/status model gives a
clean place to attach audit-grade evidence later, but the current RFC does not
claim SIEM export, tamper-evident audit chain, or policy attestations.

That restraint is correct for this RFC. Do not oversell it as enterprise
governance. Say it creates stable readiness facts that policy/audit layers can
later consume.

Remaining ask: future follow-up should define stable event names for readiness
transition, profile mismatch, and condition failure buckets.

#### Aether Adapter / Boot Ordering

Good separation. The RFC does not try to own blob restore, signature
verification, or host storage. It gives adapters a standard point to report
"not ready yet" until restore/verification/status fields are available.

Remaining ask: for any managed or Lobster-specific profile, boot ordering must
remain:

```text
restore/verify host state -> expose status facts -> evaluate readiness -> route traffic
```

#### Release Engineer

Directionally good. Profiles can become release-support targets, but the first
implementation still needs concrete proof lanes before upstream implementation
PRs are filed.

Remaining ask: every upstream PR body should include the profile it proves and
the exact readiness/status command output used as proof.

### Remaining Gaps To Close Before Upstream Implementation PRs

1. Add the custom-profile JSON example to the RFC body/text:

   ```jsonc
   {
     "hosting": {
       "profile": "acme.managed",
       "profiles": {
         "acme.managed": {
           "extends": "managed",
           "readiness": {
             "requiredCriteria": ["acme.backup-ready"],
           },
         },
       },
       "criteria": {
         "acme.backup-ready": {
           "label": "Backup ready",
           "description": "Backup volume must be mounted before serving traffic.",
         },
       },
     },
   }
   ```

2. Keep the rule in PR/RFC language: missing facts should become status fields,
   not a parallel readiness evidence path.

3. Add Docker proof for:

   - default `local`;
   - `container` with `/ready` reporting the selected profile;
   - custom criteria blocking/optional behavior.

4. Add an explicit "not policy" paragraph:

   - readiness is core and dependency-free;
   - policy/doctor can consume readiness facts later;
   - policy is not required for container hosts.

5. Keep the first implementation on existing HTTP `/ready` plus status/health;
   decide later whether a thin `openclaw ready` CLI wrapper is worth adding.

6. Keep node-mode product-neutral and avoid mapping it too tightly to Scout
   desktops in the OpenClaw text.

## Review Set

Reviewed the current hosted-layer audit through these `.craft/roles` lenses:

- `gateway-eng`: runtime latency, crash behavior, config compatibility.
- `lobster-container-eng`: container boot, health, readiness, reconnect,
  teardown.
- `platform-eng`: fleet consistency, drift, upgrade safety, operations.
- `policy-steward`: coherent policy categories, evidence, runtime gates.
- `ciso`: security assurance, kill switches, auditability, fail-closed controls.
- `compliance`: auditor-grade evidence and tamper-evident records.
- `claws-release-eng`: release/installability and versioning discipline.
- `founder`: upstream/community fit and avoiding enterprise-only capture.
- `claws-repo-steward`: boundary cleanliness and avoiding dependency leaks.
- `lorant-reviewer`: current-head rigor, partial conversions, security routing,
  test/proof gaps.
- `aether-adapter-eng`: rehydration integrity and boot ordering.

## What Else We Need

### 1. Contract Inventory With Owners

We have the rough layer. We still need a complete inventory table with one row
per boundary item:

| Item         | Today                       | Owner                   | Desired owner        | Stability                               | Evidence           |
| ------------ | --------------------------- | ----------------------- | -------------------- | --------------------------------------- | ------------------ |
| Env var      | runtime/adapter/config path | Lobster/OpenClaw/plugin | upstream/host/plugin | image-time/process/per-start/deprecated | test/doc/code link |
| Header       | caller and receiver         | Lobster/OpenClaw        | upstream/host        | stable/experimental                     | proof              |
| Config field | fragment and merge path     | Lobster/OpenClaw/plugin | upstream/host/plugin | stable/overlay-only                     | test/doc           |
| Event        | emitter and consumer        | Lobster/OpenClaw        | upstream/host        | stable/internal                         | Kusto/dashboard    |

Why this matters by role:

- `lorant-reviewer`: prevents partial conversions and duplicated source of
  truth.
- `platform-eng`: enables drift detection across rings/tenants.
- `founder`: keeps the upstream contribution comprehensible and non-vendor.

### 2. Runtime Budgets And Failure Modes

The proposal needs explicit budgets, not only ownership.

Needed:

- Gateway startup budget and slow-path buckets.
- Gateway hook/overlay latency budget.
- Proxy-pipe readiness timeout, retry, and fail-closed behavior.
- Health probe meaning: "if I send a request, will it succeed?"
- Drain semantics: what is accepted, rejected, retried, or completed.
- Reconnect/idempotency semantics for caller-visible writes.

Role pressure:

- `gateway-eng`: no governance/config hook should add unbounded latency or crash
  Gateway.
- `lobster-container-eng`: health must catch crashed sidecars/adapters/Gateway
  states that would make requests fail.
- `platform-eng`: failure buckets must aggregate across fleet.

### 3. Env Restore And Warm Container Semantics

The current audit found a likely gap: runtime projects more `extra_env` keys
than the adapter's managed restore list obviously clears.

Needed:

- Full diff of runtime-projected env keys versus adapter-restored keys.
- Classification for every key:
  - image-time
  - process-scope
  - per-start restored/cleared
  - intentionally sticky
  - deprecated
- Test or proof that one user's per-start feature gates cannot leak into the
  next user/container start.

Role pressure:

- `ciso`: tenant/user feature and auth leakage is a security boundary issue.
- `lorant-reviewer`: duplicated or partially restored env state is a classic
  current-head blocker.
- `platform-eng`: ring rollout flags must not drift inside warm containers.

### 4. Path Durability Table

The persistence layer is justifiable, but the contract is not done until state
paths are explicit.

Needed table:

| Path/state           | Durable? | Restored from                | Checkpoint trigger     | Single-writer? | Failure class |
| -------------------- | -------- | ---------------------------- | ---------------------- | -------------- | ------------- |
| `/workspace`         | yes/no   | Graph/SPO git                | turn/end/idle/snapshot | passport/none  | stable code   |
| OpenClaw home config | yes/no   | image/overlay/user           | seed/reset             | n/a            | stable code   |
| memory sqlite        | yes/no   | workspace/Copilot memory/tmp | TBD                    | TBD            | stable code   |
| plugin state         | yes/no   | plugin-owned path            | TBD                    | TBD            | stable code   |
| sessions/transcripts | yes/no   | OpenClaw state               | TBD                    | TBD            | stable code   |

Role pressure:

- `aether-adapter-eng`: restore order and integrity must be explicit before any
  policy/plugin artifact is trusted.
- `compliance`: restored state and governing policy must be provable later.
- `lobster-container-eng`: boot ordering cannot race state restore, policy load,
  Gateway readiness, and plugin enablement.

### 5. Policy Category Mapping

The layer should not become a parallel settings system.

Needed:

- Map hosted-layer controls into durable policy categories:
  - gateway/auth/trusted proxy
  - model/provider routing
  - tools/exec/node commands
  - plugins/skills
  - network/proxy-pipe
  - storage/persistence
  - diagnostics/audit
- For each category, define:
  - authored requirement
  - evidence source
  - health check
  - enforcement point
  - fail-open/configurable/fail-closed posture

Role pressure:

- `policy-steward`: policy authors requirements; evidence comes from real
  OpenClaw/Lobster settings.
- `ciso`: high-risk controls must fail closed, not silently degrade.
- `founder`: upstream OpenClaw should see reusable categories, not Lobster-only
  knobs.

### 6. Audit And Telemetry Evidence

The proposal needs stable evidence, not just operational logs.

Needed:

- Stable event names/dimensions for:
  - Gateway start/ready/fail bucket
  - config seeding/overlay/reset
  - proxy-pipe ready/fail/refresh
  - persistence restore/checkpoint/failure
  - policy decision and approval path
  - plugin enablement/disablement
  - drain/teardown
- Which events are audit-grade versus diagnostic-only.
- Which events need tenant/user/session dimensions, and which dimensions must
  be sanitized or non-authoritative.
- SIEM/export story if the proposal is framed as enterprise governance.

Role pressure:

- `compliance`: reports need what/when/policy version/result.
- `ciso`: legal discovery and incident response need durable audit trails.
- `gateway-eng`: diagnostic events must not add hot-path cost.

### 7. Upstream-Friendly RFC Shape

The OpenClaw-facing ask should be framed as "hosted OpenClaw contract" rather
than "Lobster needs exceptions."

Needed upstream asks:

1. Hosted Gateway trusted-proxy/auth profile.
2. Config include/overlay/merge/reset contract.
3. Plugin host-selection and manifest-driven feature gates.
4. Tool/node command policy semantics and approval protocol.
5. Snapshot/state path and restore semantics.
6. Stable diagnostics hook/event names.
7. Proxy-pipe or brokered-provider egress contract, if it should generalize
   beyond Lobster.

Role pressure:

- `founder`: must improve OpenClaw for other hosts and not fragment the
  community runtime.
- `claws-repo-steward`: clean boundary, no Lobster dependency leaks upstream.
- `claws-release-eng`: versioned contracts and compatibility matrix need
  release discipline.

### 8. Stair-Step Migration Proof

The architecture story should show simplification without changing the layering
each time.

Needed per step:

| Step                   | Lobster surface removed/simplified | Upstream contract added            | Risk reduced                 | Compatibility proof    |
| ---------------------- | ---------------------------------- | ---------------------------------- | ---------------------------- | ---------------------- |
| Freeze as-is           | none                               | named `hosted-openclaw v0`         | hidden drift becomes visible | inventory/test         |
| Gateway profile        | baked auth/local UI config         | trusted-proxy profile              | auth drift                   | Gateway conformance    |
| Pluginize features     | baked plugin/tool/skill edits      | plugin manifests                   | broad config drift           | plugin lifecycle tests |
| Policy categories      | ad hoc flags                       | policy/restriction semantics       | one-off gates                | evidence/attestation   |
| State contract         | storage-specific behavior          | snapshot/restore/path semantics    | persistence ambiguity        | restore tests          |
| AgentHarness/OCC later | Gateway shrinkage                  | data-plane/control-plane contracts | future migration churn       | conformance tests      |

Role pressure:

- `platform-eng`: fleet upgrades need intermediate compatible states.
- `lorant-reviewer`: each step needs tests/proof for the current head.
- `founder`: incremental upstream value avoids enterprise capture.

## Recommended Next Moves

1. Build the env-var diff and classify every key.
2. Build the path durability table.
3. Extract proxy-pipe status/failure taxonomy.
4. Extract telemetry/audit event taxonomy.
5. Map current baked config fragments to upstream contract, plugin feature,
   Lobster host policy, or temporary workaround.
6. Draft a one-page upstream RFC outline for `hosted-openclaw v0`.
7. Draft a separate Lobster proposal page that says which parts Lobster keeps:
   auth enablement, tenant routing, storage destination, plugin selection,
   rollout, telemetry sinks, dashboards, and admin controls.
