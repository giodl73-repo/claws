# EnterpriseClaw Implementation Package `.craft/roles` Review

## Scope

This review challenges all ten implementation packages after the 35-contract
portfolio was fully decomposed.

The review used all eighteen roles under `.craft/roles/claws/`, grouped by the
tensions they protect:

- OpenClaw and ecosystem: `founder`, `gateway-eng`, and `skill-author`;
- enterprise governance: `ciso`, `compliance`, `platform-eng`, and
  `policy-steward`;
- local operation: `power-user` and `new-hire`;
- managed integration: `aether-runtime-eng`, `aether-adapter-eng`,
  `lobster-container-eng`, `cowork-ux-eng`, and `m365-connector-eng`;
- repository and release: `claws-repo-steward`, `claws-release-eng`, and
  `lorant-reviewer`; and
- future session surfaces: `clawpilot-product`.

The review evaluates the packages as an integrated execution portfolio, not as
ten independent documents.

## Verdict

**Portfolio grade: B.**

The packages are approved as the correct planning decomposition. They are not
yet approved as an executable cross-repository backlog.

The strongest qualities are:

- owner-native semantics are consistently preserved;
- upstream, B1/B2/B3 fork, Lobster, and Rust responsibilities are separated;
- the fork has explicit deletion outcomes rather than becoming a permanent
  semantic home;
- current OpenClaw and Lobster investments are adopted instead of duplicated;
- partial, stale, incompatible, unknown, and recovery-blocked outcomes are
  preserved instead of flattened to generic success; and
- Rust promotion requires conformance, migration, canary, rollback, and
  TypeScript deletion.

Execution should start only after the cross-package owner collisions,
dependency inversions, evidence-integrity contract, managed-mutation contract,
release ownership, and deployment-profile defaults below are corrected.

## Correction Status

**Applied on 2026-08-02.**

`cross-package-execution-contracts.md` now supplies XPK-001 through XPK-010 for
shared-result ownership, opaque references, integrity-bearing evidence,
managed mutation, deployment/risk profiles, implementation cutover, fixtures,
artifact/release trust order, deletion ledgers, and the reusable pre-canary
gate.

All ten package graphs now:

- consume EAR as the sole per-unit release-result owner;
- consume EXA as the sole presentation owner;
- use named package outputs instead of contract-number dependencies;
- allow conditional investigations to conclude that no extension is needed;
- separate KCC memory facts from DGR obligation coordination;
- separate ARO run projection from MPU accounting ownership;
- require actual published-artifact proof and verify-before-parse;
- prove package-specific state migration and rollback before every Rust canary;
- add risk-conditioned evidence, managed mutation, operator UX, and
  accessibility gates; and
- record exact B1/B2/B3 and TypeScript deletion outcomes.

The portfolio is approved to begin Wave 0. This does not imply that Wave 0 or
the decisive evidence slices are already implemented.

## Package Grades

Grades use:

- **A** - execution-ready framing;
- **B** - sound, with corrections required;
- **C** - materially incomplete for execution; and
- **D** - unsafe or contradictory.

| Package | Owner boundaries | Track disposition | Operations | Security and evidence | Release, migration, deletion | Usability |
| --- | --- | --- | --- | --- | --- | --- |
| Operations, assurance, and fleet | B | A | B | B | B | C |
| Knowledge, context, and continuity | A | A | C | B | B | C |
| Identity, authority, actions, and effects | A | A | B | B | B | C |
| Runtime fabric, nodes, and Rust | A | A | B | B | A | C |
| Configuration and activation | A | A | B | B | A | C |
| Agent runtime and delegated execution | A | A | B | B | B | C |
| Models, provider attempts, and usage | A | A | B | B | B | C |
| Extensibility, artifact trust, and release | B | A | B | B | B | C |
| Data governance and resource control | A | A | C | C | C | C |
| Experience and administration | B | A | B | B | B | C |

The uniform usability grade is not a rejection of the operator journeys. It
means the packages define truthful states better than they define progressive
disclosure, actionable errors, safe next actions, accessibility, and the
first-five-minutes experience.

## Blocking Cross-Package Corrections

### 1. Assign one implementation owner for each shared result

The packages sometimes preserve conceptual owner boundaries while duplicating
implementation ownership.

| Shared result | Current collision | Required ownership |
| --- | --- | --- |
| Per-unit release, activation, rollback, and recovery | OAF and EAR | EAR produces the per-unit result; OAF aggregates it; EXA renders it |
| Fleet rings and promotion | OAF and EAR | One Lobster release coordinator |
| Rust updater and host supervision | EAR and OAF | EAR owns updater/activator; OAF owns host supervisor |
| Readiness | CFA, RFN, OAF, EAR, and EXA | CFA defines owner facts; RFN may implement a producer; OAF aggregates; EAR consumes; EXA renders |
| Operator and admin projection | OAF, EAR, and EXA | EXA is the presentation owner |
| Run-attempt and model accounting | ARO and MPU | ARO owns run attempts; MPU owns candidate, call, usage, and cost facts |
| Memory copy settlement | KCC and DGR | KCC emits memory-native operations and copy facts; DGR plans and aggregates obligations |
| Export identity | KCC and DGR | KCC owns export production; DGR consumes a copy reference |
| Policy generation | IAE, KCC, DGR, CFA, and EXA | One authored policy generation with domain-native evidence and enforcement adapters |

### 2. Publish a real cross-package dependency graph

No package contains an obvious internal dependency cycle, but the portfolio has
hidden loops:

- EAR consumes readiness and checkpoint facts while OAF separately defines the
  release result EAR should own;
- EXA consumes OAF facts while OAF also owns parts of their rendering;
- ARO run attempts parent MPU provider candidates, while ARO later consumes MPU
  usage;
- KCC memory settlement consumes EC-030 vocabulary while DGR memory work
  depends on EC-020;
- CFA defines readiness while RFN supplies a Rust readiness producer; and
- several work items depend on a contract number instead of a named executable
  output.

Replace contract-number dependencies with package work-item outputs and make
conditional investigations produce one of two explicit outcomes:

1. current owner facts are sufficient; or
2. a residual owner extension is required.

Downstream adoption must depend on the investigation result, not on the
extension being accepted.

### 3. Define shared references without creating a universal owner

The portfolio needs a small language-neutral relationship vocabulary:

- owner, subject, stable identifier, generation, and parent;
- operation, decision, attempt, child, lease, delivery, and evidence
  references;
- source owner and generation plus copy owner and identity;
- accepted plan and immutable required-child membership;
- artifact, component, release, and compatibility references; and
- chronology, freshness, certainty, disclosure, and supersession.

These are opaque references among owner systems, not a universal workflow,
resource, lifecycle, or status object.

### 4. Define one evidence-integrity contract

The packages correlate evidence well but do not consistently require:

- content integrity or signature;
- policy, authority, artifact, and owner-generation hashes;
- terminal denial and approved-but-failed distinction;
- redaction and sanitized cross-boundary errors;
- supersession and retention;
- legal-discovery and SIEM export; and
- risk-conditioned behavior when the evidence sink is unavailable.

Ordinary telemetry may be lossy. Evidence required to authorize or settle a
protected effect cannot silently drop after the system claims governed
success.

### 5. Define one managed mutation envelope

Cowork, Loop, Graph connectors, hosted Control UI, CLI, and Lobster services
must not create parallel write paths.

Every managed mutation needs:

- authenticated actor and authority generation;
- exact owner and normalized target;
- expected owner generation;
- idempotency and operation identity;
- preview or validation result;
- owner-native acceptance and settlement;
- actionable, sanitized rejection; and
- retry, conflict, and sync-loop behavior.

The authoritative owner remains the mutation owner. Lobster coordinates and
projects; it does not write around the owner.

### 6. Define deployment and risk profiles

The founder, power-user, Gateway, CISO, Aether, and platform roles expose one
unresolved question: when is enterprise dependency absence allowed to preserve
local behavior, and when must the operation fail closed?

Publish a matrix covering:

- ordinary local OpenClaw;
- locally governed OpenClaw;
- Scout-managed single workspace;
- Scout fleet;
- protected effect risk classes;
- signed versus legacy unsigned artifacts;
- offline and degraded managed services; and
- explicit bypass, break-glass, and containment behavior.

The matrix must also supply measurable Gateway latency, cold-start, memory,
readiness freshness, reconnect, audit-backpressure, and recovery budgets.

### 7. Correct Rust promotion order

Several packages let an optional Rust canary block or precede proof of the
current owner contract.

The required order is:

```text
current owner contract and fixtures
-> current TypeScript release and recovery proof
-> exact Rust replacement profile and deletion target
-> artifact trust and state migration proof
-> shadow or canary with one authoritative selector
-> rollback proof
-> TypeScript and temporary-adapter deletion
```

Lobster may express desired placement. The local authoritative owner must
record which implementation was selected before mutation or admission.

### 8. Make release evidence prove published bytes

The mixed-component release manifest must prove more than version references:

- compatible component tuple and upgrade order;
- signature and hash verification before parse or activation;
- key rotation, expiry, compromise, replay, and offline verification;
- clean installation from the actual published artifact;
- partial-publication and partial-activation recovery;
- fresh installation, upgrade, downgrade, rollback, and recovery-blocked;
- current-head smoke and dogfood evidence; and
- exact patch, script, adapter, and TypeScript deletion.

## Package-Specific Corrections

### Operations, assurance, and fleet

**Strong:** immutable fleet membership, parent/child acceptance, targeted
repair, partial settlement, assurance separation, and containment uncertainty.

**Correct before execution:**

- move EC-029 per-unit release semantics to EAR;
- reverse OAF-060 so the current-owner release proof precedes Rust;
- add missing restoration, evidence, and canary dependencies;
- define protected-effect evidence failure and executable emergency
  containment; and
- leave operator rendering to EXA.

Keep OAF-040 through OAF-042 together as the first fleet-repair vertical slice.

### Knowledge, context, and continuity

**Strong:** owner separation among session, context, memory, workspace, and
checkpoint; explicit omissions; native/plugin fallback; and retained-copy
semantics.

**Correct before execution:**

- add a shipped memory mutation and authorization gate after the decision
  threads;
- make KCC-023 consume the actual read, write, delete, protected-path, and
  consent owners;
- make package exit require the memory and context adopters it claims;
- prove authorization before retrieval and mutation; and
- remove memory lifecycle duplication with DGR.

### Identity, authority, actions, and effects

**Strong:** exact intent authorization, generation fencing, modify and
reauthorize, uncertain-effect reconciliation, durable delivery, and explicit
fork retirement.

**Correct before execution:**

- decouple external approval adoption from hosted UI policy;
- do not block pre-effect authorization on optional surface identity;
- specify external-presentation states for unselected, selected-and-healthy,
  and selected-but-unavailable;
- bind protected-effect evidence to the shared integrity contract; and
- split IAE-037 into independently deletable approval, nested-authorization,
  Teams, allowlist, and carrier paths.

### Runtime fabric, nodes, and Rust

**Strong:** TypeScript oracle, protocol and trust separation, single-authority
mutation, unknown settlement, migration, rollback, and exact deletion posture.

**Correct before execution:**

- separate Lobster desired placement from local admission selection;
- require EAR artifact trust before a managed Rust canary;
- name the exact first command, unsupported surface, TypeScript seam, and
  deletion target before implementation; and
- add numeric latency, ready-time, memory, reconnect, cancellation, and
  fail-closed gates.

Keep V1 Rust state inside the runtime until a separate supervisor is justified.

### Configuration and activation

**Strong:** ordered layers, activation generations, readiness/profile adoption,
Cron ownership, retained wake, and clear patch deletion.

**Correct before execution:**

- do not make an evidence-conditional accepted-generation extension a mandatory
  package exit;
- narrow CFA-023 to scheduled occurrences rather than generic execution;
- link recovery and activation by identity without making them one lifecycle;
  and
- require managed source verification before parse and activation.

### Agent runtime and delegated execution

**Strong:** no universal execution object, controller/completion/lineage
separation, cancellation versus terminal state, and privacy-preserving managed
projection.

**Correct before execution:**

- make Lobster projection depend on fixture outcomes, not successful optional
  upstream asks;
- replace EC-number authority dependencies with named IAE outputs;
- add cancellation during approval, stale-prompt dismissal, pre-dispatch
  cancellation, audit classification, and sanitized-error proof; and
- gate a Rust worker on stable config, model, tool/effect, session, policy,
  artifact, and release contracts.

### Models, provider attempts, and usage

**Strong:** selection, availability, readiness, call, usage, cost, billing, and
budget remain distinct; failed and retried usage is preserved.

**Correct before execution:**

- give MPU ownership of provider accounting while ARO only attaches its
  projection;
- make provider candidates explicitly parent a stable ARO run attempt;
- name the durable candidate persistence owner;
- define privacy, version, collision, retention, and disclosure for hashed
  request identity; and
- separate portable package completion from optional managed FinOps completion.

### Extensibility, artifact trust, and release

**Strong:** native extension identities, unknown-required refusal, immutable
install evidence, provenance dimensions, revocation limits, generated release
evidence, and truthful recovery-blocked.

**Correct before execution:**

- become the sole producer of EC-029 per-unit release semantics;
- split updater/activator from the OAF host supervisor;
- add trust-root rotation, compromise, expiry, replay, and verify-before-parse;
- require revocation proof before canonical acquisition is enabled;
- define bounded response for an actively exploited installed artifact; and
- strengthen publication proof to install actual published bytes in a clean
  environment.

### Data governance and resource control

**Strong:** owner-native obligation settlement, archive versus purge,
non-Boolean admission outcomes, restart-safe lease goals, and Lobster/Rust
exclusions.

**Correct before execution:**

- freeze lifecycle-plan membership and child identities at acceptance;
- recheck authority and legal hold immediately before destructive mutation;
- add lost-ack reconciliation for lifecycle children;
- let Lobster reservations consume a selected owner-native seam even if no
  portable lease extension is justified;
- split lifecycle and lease package exits;
- prove migration and rollback before a Rust lease owner becomes
  authoritative; and
- resolve the KCC/DGR memory dependency in one direction.

### Experience and administration

**Strong:** projection is not canonical state, payloads remain owner-native,
projection failure differs from owner failure, Doctor remains repair owner, and
hosted controls require server enforcement.

**Correct before execution:**

- prove cache, fan-in, freshness, timeout, and isolation before deciding the
  residual shared envelope;
- make hosted adoption depend on mixed-version projection, disclosure,
  freshness, and failure isolation;
- establish audience profiles before downstream pages create their own
  semantics;
- add the shared managed mutation envelope;
- require task-first summaries, safe next actions, lock source, escalation
  owner, field-level errors, full-target review, and accessibility; and
- split observation and repair Rust canaries with exact deletion targets.

## What Should Be Split

The ten planning packages remain useful. Their execution should be divided into
smaller vertical trains:

| Planning package | Execution trains |
| --- | --- |
| OAF | unit facts; assurance; fleet journal and repair; containment |
| KCC | export; context evidence; memory APIs and enforcement; recovery; workspace policy |
| IAE | credentials/approval/protected effects; conversation/routing/delivery |
| RFN | protocol fixtures; Rust connection/execution; migration and release |
| CFA | config activation; readiness/profiles; scheduled activation and wake |
| ARO | run/attempt lifecycle; delegated-child lifecycle; managed projection |
| MPU | candidate/call/usage; cost provenance; managed FinOps |
| EAR | extension metadata; install evidence; trust/revocation; per-unit release |
| DGR | lifecycle obligations; admission/lease/usage |
| EXA | projection; Doctor repair; hosted admin; catalog/localization/accessibility; optional Rust |

Do not split the owner-native golden slices that prove one relationship
end-to-end. Examples include OAF-040 through OAF-042, IAE protected-effect
authorization through settlement, KCC export identity through retained-copy
reference, MPU candidate through usage, and EXA finding through repair
validation.

## Corrected Execution Order

### Wave 0 - portfolio contracts

1. Resolve the ownership table and publish the cross-package DAG.
2. Define references, evidence integrity, managed mutation, deployment/risk
   profiles, and implementation cutover.
3. Publish the common fixture registry and release/deletion ledger formats.

### Wave 1 - decisive portable fixtures

1. EC-001 three-owner projection with stale, incompatible, protected, and
   mixed-version facts.
2. EC-027 three-family unknown-required extension metadata.
3. EC-031 one restart-safe bounded lease with exhaustion and settlement.
4. ARO run attempt to MPU provider candidate and usage.
5. IAE exact authorization through uncertain effect settlement.

### Wave 2 - continuity and fleet

1. EC-021 mixed-owner restore with generation compatibility and partial
   settlement.
2. EC-034 immutable target set, lost acknowledgement, failed child, and
   targeted repair.
3. KCC export and memory authorization paths.
4. DGR immutable lifecycle plan with hold race and lost acknowledgement.

### Wave 3 - hosted adoption and release

1. Managed mutation through one Cowork field and one unlike connector.
2. Generated per-unit release manifest with actual published-artifact install.
3. Hosted projection and Doctor repair with lock source, actionable error, and
   local fallback.
4. Lobster fleet aggregation, retention, policy, Budget, and promotion
   adoption.

### Wave 4 - Rust owner replacement

1. EC-026 disposable Gateway connection and one bounded command.
2. State migration, artifact trust, canary, rollback, and compatibility.
3. Exact TypeScript and adapter deletion.
4. Later Rust owners only after their complete owner boundary is stable.

## Approval Bar

The package portfolio becomes execution-ready when:

- every shared result has one producer and named consumers;
- every cross-package dependency points to an executable output;
- optional investigations do not make disproved extensions mandatory;
- protected operations have explicit risk-conditioned failure behavior;
- managed writes traverse one owner-native validation path;
- actual published artifacts prove install, upgrade, rollback, and recovery;
- each Rust canary names its existing owner and exact deletion target first;
- operator projections are task-first, actionable, accessible, and truthful;
  and
- no new upstream issue or PR is filed until the relevant portable residual has
  passed its decisive fixture.
