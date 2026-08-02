# OpenClaw Identity and Lifetime Matrix

## Rule

This is a comparison matrix, not a proposal for one universal identity type.
Each owner keeps its own identifier, renewal boundary, and trust semantics.

| Object | Identifier / version | Owner | Renewal boundary | Relationship |
| ------ | -------------------- | ----- | ---------------- | ------------ |
| Config file snapshot | raw hash + path | Config IO | File content/read changes | Produces source config. |
| Source config | source fingerprint / resolved hash | Config IO | Accepted resolved authored content changes | Materialized into runtime config. |
| Runtime config | process revision + runtime fingerprint | Runtime snapshot owner | Successful runtime publication | Pins current process behavior. |
| Applied config source | applied source hash | Gateway activation | Runtime accepts a source revision | Links active runtime to source. |
| Reload candidate | transaction ownership generation | Gateway reloader | New candidate supersedes or candidate settles | May produce hot commit or restart target. |
| Credential material | issuer/provider-native identity | Secret/provider/OAuth owner | Issue, rotate, expire, revoke, or destroy | Opaque value; must not be used as correlation identity. |
| Credential reference | SecretRef source/provider/ID | Config/secrets owner | Selection or backing reference changes | Refers to material without containing it. |
| Auth profile | profile ID + provider/mode/account | Auth-profile owner | Edit, migration, account replacement, or removal | Selects and orders credential use for a provider. |
| Resolved secret snapshot | secrets revision + redacted runtime view | Secrets runtime owner | Successful secret activation or refresh | Resolves secret-bearing config leaves for runtime use. |
| Credential cache/lease | refresh lock + cooldown + warm/last-good snapshot | Auth runtime | Refresh, failure, expiry, cooldown, or owner replacement | Prevents duplicate refresh and bounds temporary availability. |
| Plugin/channel registry | registry version | Plugin/channel runtime | Registry replacement | Contributes activation and reload policy. |
| Artifact identity | family + name/version/ref + immutable digest | Package/artifact owner | Artifact bytes, manifest, or canonical metadata changes | Stable subject for verification, install, revocation, and promotion. |
| Manifest declaration | artifact digest + manifest schema/version | Extension/package semantic owner | Manifest or artifact replacement | Declares capabilities and dependencies; does not prove trust or activation. |
| Source resolution | source coordinate + exact resolved ref/digest | Resolver/registry/repository owner | Resolve, ref/tag movement, registry change, or cache expiry | Produces immutable candidate bytes and source evidence. |
| Artifact trust evidence | subject digest + verifier/policy/evidence generation | Builder, signer, scanner, moderator, and evidence owners | Build, sign, scan, moderate, expire, revoke, or policy change | Combines provenance, signature, transparency, SBOM, and scan facts without making one owner authoritative for all. |
| Install admission | artifact digest + policy/consent generation | Installer/policy owner | Each preview/apply or policy/evidence change | Allows, reviews, blocks, or quarantines one candidate for one scope. |
| Install transaction | install ID + lifecycle generation + plan integrity | Installer/package lifecycle owner | Preview invalidation, apply, rollback, partial settlement, or replacement | Owns target mutation, rollback snapshot, quarantine, and durable record. |
| Installed artifact | install ID + artifact digest + installed-record generation | Plugin/skill/Claw package owner | Install, update, repair, migration, or removal | Relates artifact source to owned local state; does not imply activation. |
| Activation binding | install ID/artifact digest + config/registry generation | Configuration and runtime registry owners | Activate, reload, disable, replace, or drain | Projects installed definitions into a live runtime capability surface. |
| Artifact revocation | subject/publisher/signer scope + revocation generation | Registry/security/policy authority | Revoke, supersede, expire, or restore trust | Blocks future admission and coordinates installed/fleet response without erasing history. |
| Release promotion state | artifact/build identity + slot/ring generation | Release/fleet owner | Candidate, active, previous, quarantined, retiring, or reclaimed transition | Binds quarantine, validation, rollout, rollback, convergence, and removal evidence. |
| Session route | session key | Routing/session owner | Logical conversation/agent route changes | May outlive several session IDs. |
| Session generation | session ID | Session registry/transcript owner | Reset, expiry, rotation, or replacement | Owns one current transcript generation. |
| Session node | created-at/provenance fields | Session registry | Created once; survives session ID rotation | Preserves long-lived lineage. |
| Agent turn | run ID / idempotency key | Ingress owner | One accepted agent request | Targets one session generation. |
| Run event ownership | lifecycle generation | Agent event lifecycle owner | Gateway lifecycle rotation/restart | Invalidates stale run effects. |
| Model selection | provider/model reference or alias | Selection owner | Explicit/default/session selection changes | Chooses a logical route, not executable availability. |
| Auth binding | principal/profile/reference + provider/account/surface | Consuming owner | Credential/profile/endpoint/principal refresh | Binds executable authority to one owner surface. |
| Prepared model runtime | owner key + input fingerprint + lease | Prepared runtime owner | Refresh, auth mutation, owner replacement, or lease release | Pins executable provider/model/auth facts. |
| Provider attempt | run ID + ordered candidate; backend thread/turn where available | Agent runner/backend | Each provider/model candidate invocation | Portable OpenClaw attempt ID is not explicit. |
| Tool definition | tool ID/name + definition generation | Core/plugin/MCP/client owner | Catalog or registry refresh | Describes possibility, not run availability. |
| Tool surface | run-scoped materialization | Agent runtime | Each run/turn or requester-runtime renewal | Applies model, caller, sandbox, and policy filters. |
| MCP runtime | requester/session runtime identity + catalog cache | Bundle MCP owner | Requester/session replacement, refresh, reconnect, or dispose | Supplies catalog and transport. |
| Tool invocation | tool call ID | Provider/session tool owner | Each tool call | Scoped by run ID plus tool call ID. |
| Tool projection | transcript mirror/item key | Transcript/projection owner | Each projected call/result item | Idempotent evidence; not side-effect identity. |
| Protocol declaration | protocol/interface name + wire version/range | Protocol owner | Explicit version decision, support-window change, or removal | Separate from package/release version and semantic payload owner. |
| Capability set | peer + protocol version + capability generation | Connection/protocol owner | Connect, reconnect, capability refresh, or peer replacement | Advertises support; does not grant authorization. |
| Gateway frame | frame ID + request/response/event discriminator | Gateway protocol client/server | Each frame or paired request/response exchange | Carries owner payload and trace/sequence metadata. |
| Connection incarnation | peer identity + negotiated version + connect generation | Transport client/server | Connect or reconnect | Bounds auth, capabilities, inflight frames, and stale-result rejection. |
| Device identity | device ID + public-key/attestation fingerprint | Device identity owner | Device replacement, key replacement, repair, or retirement | Stable identity; distinct from role token and connection. |
| Pairing request | request ID + device ID + requested roles/scopes | Pairing approval owner | Each enrollment/repair request | Captures requested trust before approval. |
| Pairing authority | device ID + approved roles/scopes + pairing generation | Pairing store/policy owner | Approve, role/scope change, repair, remove, or supersede | Fences tokens and live node sessions. |
| Device credential grant | device ID + role + token generation | Credential/pairing owner | Issue, rotate, expire, revoke, or role removal | Authenticates one bounded role/scope relationship. |
| Node session lease | node ID + connection ID + pairing generation | Node registry | Connect, reconnect, pairing change, invalidation, or disconnect | Binds declared surfaces and pending invokes to current pairing authority. |
| Node capability surface | node ID + connection/catalog generation | Node/plugin/policy owners | Connect, catalog update, policy/config change, permission loss, or disconnect | Separates declared capabilities from effective commands/tools/skills. |
| Node invocation | invocation ID + idempotency key + node/connection generation | Command owner and NodeRegistry | Each remote invocation | Owns ordered input/progress, deadline, cancellation, and settlement. |
| Node presence/wake | node ID + observation/wake-attempt generation | Node presence/wake owner | Heartbeat/activity refresh, expiry, wake attempt, or disconnect | Freshness-bound evidence; not permanent trust. |
| Node revocation/removal | device/node/role + revocation generation | Pairing/security owner | Token revoke, role removal, unpair, or supersession | Invalidates authority, disconnects sessions, cleans projections, and tracks convergence. |
| Release identity | source commit + exact artifact digest + platform/component | Release/artifact owner | Each immutable build/publication | Separates exact bytes from mutable channels and rollout intent. |
| Channel intent | channel + target release + policy generation | Channel/promotion owner | Promote, repair, revoke, or retarget | Mutable discovery/promotion pointer; never immutable release identity. |
| Compatibility envelope | component + supported host/protocol/schema/platform ranges | Component owner | Each component release or compatibility-policy change | Bounds admission and mixed-version/downgrade behavior. |
| Update plan | installation target + current/target release + plan generation | Local updater/operator | Each preview or changed target/policy | Captures ownership, migrations, interruption, recovery, and required proof before mutation. |
| Activation attempt | attempt ID + plan generation + install/service incarnation | Local updater and runtime owners | Each stage/activate/restart attempt | Owns candidate, migration, convergence, restart, readiness, and recovery outcome. |
| Migration ledger entry | owner + migration ID + source/target state version | State/config/plugin owner | Each applied or retried migration | Retains idempotency, compatibility-reader, and downgrade/restoration obligations. |
| Rollout intent | target population + release + policy generation | Optional fleet/operator owner | Approval, cohort/window/hold/promotion/abort change | Coordinates local plans without owning package, service, migration, or readiness semantics. |
| Fleet convergence projection | target + desired/installed/active release + evidence generation | Fleet projection owner | Target result, hold, retry, rollback, or evidence refresh | Reports complete, partial, blocked, exempted, rolled-back, and unknown state. |
| Operation stream | owner operation ID + connection incarnation | Semantic owner plus transport adapter | Each streamed operation | Owns order, flow control, deadline, cancellation, certainty, and terminal settlement. |
| Replay cursor/token | stream/session + retained event position | Replay-capable owner | Replay window/cursor advance, expiry, or owner replacement | Authorizes bounded reconstruction; not proof external effects are replay-safe. |
| Compatibility evidence | artifact/build + protocol/capability range + suite result | Release/conformance owner | New artifact, suite, support range, or deprecation state | Proves exact mixed-version support and removal readiness. |
| Reply operation | operation/session ownership | Auto-reply owner | One admitted visible turn | Coordinates queue/steer/final settlement. |
| Native channel message | provider message ID | Channel | Provider event/send | Projects to an inbound or outbound semantic turn. |
| Conversation/thread | provider conversation/thread ID | Channel | Provider-specific | Contributes to session key routing. |
| Delivery attempt | channel-local send/retry state | Channel transport | Each native send attempt | Delivers one reply payload. |
| Receipt/ack | provider or synthetic receipt | Channel | Provider acceptance/read transition | Evidence about delivery, not the turn itself. |
| Readiness subject | subject ID + generation | Readiness producer/semantic owner | Owner replacement or revision | Described by conditions. |
| Delegation requester | requester session key | Spawn ownership resolver | One delegation request relationship | Requests child work but may not control or receive completion. |
| Delegation controller | controller session key | Subagent control owner | Child control relationship changes | Owns cancel and steer authority. |
| Delegation completion owner | completion requester session key | Completion delivery owner | Completion target changes | Receives or suppresses the terminal result. |
| Delegation lineage | parent session key + `spawnedBy` | Session registry | Child session creation | Describes lineage; does not imply control. |
| Child session | child session key + session ID | Session registry/transcript owner | Child reset or replacement | Durable continuity scope for delegated work. |
| Delegated run | run ID / task run ID | Subagent registry and task runtime | Each child run generation | One child session may have multiple runs. |
| Delegated control policy | spawn depth + control scope | Spawn/capability owner | Child creation or policy change | Bounds descendant creation and caller control. |
| Workspace | workspace directory + workspace key | Agent workspace owner | Agent/profile selection, setup, bootstrap, or attestation renewal | Owns agent-local files and bootstrap context. |
| Sandbox filesystem | scope + backend + workspace access + workspace root | Sandbox runtime | Recreate, backend change, or remote reseed | Projects bounded workspace/path authority into execution. |
| Runtime state root | state directory + owner subpaths | Config/state owners | Profile/state-root change or owner migration | Contains config, SQLite, credentials, queues, and owner state. |
| Transcript storage | session key + session ID + canonical store | Session/transcript owner | Session rotation, store migration, or replacement | Export/archive paths are projections, not canonical identity. |
| Skill source | source path + precedence + realpath | Workspace/plugin skill owner | Workspace/plugin registry refresh | Describes definition source and shadowing order. |
| Temporary artifact | temp root + owner-relative path | Producing owner | Task completion, TTL, cleanup, or promotion | Must not silently become retained owner state. |
| Data-class policy | owner scope + data class + policy generation | Enterprise/data-governance policy owner | Policy revision, scope change, or supersession | Constrains owner lifecycle without owning the data. |
| Derived-copy relationship | canonical object generation + copy owner/location/purpose | Canonical and copy owners | Copy creation, rebuild, promotion, relocation, or deletion | Records propagation obligations among source, index, cache, archive, export, and backup. |
| Hold | hold ID + authority + bounded owner/object/query scope | Legal/compliance authority plus semantic owner | Place, revise, expire, release, or supersede | Blocks specified cleanup or deletion while preserving owner semantics. |
| Data-lifecycle operation | operation ID + target owner/object generation | Request coordinator plus semantic owner | Each export, delete, unlink, redact, expire, or purge request | Aggregates owner-native results; does not make their meanings identical. |
| Data-lifecycle evidence | operation ID + owner result generation | Evidence/audit projection owner | Each owner settlement or exception update | Proves complete, partial, blocked, deferred, or externally controlled outcomes without retaining prohibited content. |
| Resource policy | scope + resource + policy generation | Resource-policy owner | Policy revision, scope change, or supersession | Expresses hard/soft limits, burst, priority, window, and reservations. |
| Admission decision | decision ID + enforcement-point generation | Runtime resource owner | Each admission or pressure decision | Produces allow, queue, defer, throttle, reject, truncate, cancel, or kill. |
| Runtime resource lease | lease ID + generation | Lane/queue/child/cron/worktree/host owner | Acquire, renew, expire, release, fence, revoke, or owner restart | Reserves bounded capacity at one real enforcement owner. |
| Usage observation | subject + resource + time range + source generation | Producing runtime/provider owner | Each observation or corrected rollup | Supplies quantity, unit, cost estimate, outcome, and confidence. |
| Chargeback record | allocation scope + accounting period + pricing generation | Finance/allocation projection owner | Period close or append-only correction | Reconciles owner observations into showback/chargeback without replacing them. |
| Capacity snapshot | node/worker/lane/provider scope + observation generation | Host/fleet projection owner | Refresh, topology change, reservation change, or pressure transition | Projects reserved, used, queued, free, and SLO-risk state. |

## Immediate Gaps

- Decide whether provider/model attempts need a durable generated attempt ID
  across telemetry, fallback, billing, support, and restart.
- Define a shared minimal final-delivery result without inventing a universal
  provider receipt.
- Clarify portable settlement identity across subagent registry, task runtime,
  completion delivery, and cleanup.
- Clarify which config identities are portable across process restart and which
  are deliberately process-local.
- Define stable lifecycle-operation correlation without using content or secret
  material as identity.
- Define which resource leases survive restart and how stale holders are
  fenced across nodes.
- Define portable terminal-settlement and replay-safety declarations without
  collapsing owner-specific outcomes into one bus protocol.
- Define cross-family artifact revocation and fleet convergence without making
  a registry or marketplace the runtime semantic owner.
- Define host/runtime peer identity and cross-Gateway node handoff without
  inheriting user-device pairing semantics.
- Define portable release-component and rollout evidence without creating a
  universal package manager, migration engine, or mandatory fleet controller.
