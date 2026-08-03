# EC-015/EC-016 Messaging Evidence Packet

## Review Scope

- EC-015 Conversation Identity.
- EC-016 Delivery Settlement.

The contracts are reviewed together because conversation identity selects the
provider target while delivery creates and settles a new provider copy. They
remain separate because route correlation is not delivery effect certainty.

## Evidence Baseline

- Source worktree: `C:\src\openclaw-design-audit`.
- Audited revision: `bde1602e6e86fd91dd0bec3aae714e059e556c4d`.
- Current source audit:
  `projects/openclaw-design/source-audit-messaging-channels-2026-08-01.md`.
- Current facility summary:
  `projects/openclaw-design/specs/messaging-channels.md`.
- Representative channels: Telegram and WhatsApp.
- Proposal status: both EnterpriseClaw contracts are scoped local drafts; no
  upstream acceptance is claimed.
- Evidence grade after this packet: B for both contracts.

## Claim Classification

| Claim | Classification | Evidence |
| --- | --- | --- |
| Channel plugins own native accounts, conversations, messages, rendering, transport, retry, and receipts. | Current source | Messaging source audit and representative channel implementations |
| Shared core owns normalized inbound context, route/session projection, reply planning, and durable final dispatch. | Current source | Messaging source audit |
| Provider conversation references preserve channel, account, conversation, and optional parent IDs. | Current source/proof | Conversation resolution, route projection, binding-context, and thread-ID tests |
| Durable queue intent and provider message receipt are distinct. | Current source/proof | Durable delivery implementation and tests |
| Unknown socket timeout does not authorize replay. | Current proof | WhatsApp outbound retry tests |
| Accepted or partially visible delivery is not retried blindly. | Current proof | WhatsApp retry and core partial-delivery tests |
| Every channel exposes durable operation and native-attempt identity. | Target hypothesis | Not found in current cross-channel contract |
| Every provider exposes delivered/read settlement. | Target hypothesis | Provider-dependent and intentionally optional |

## Current Objects and Lifetimes

| Object | Owner | Current identity/lifetime |
| --- | --- | --- |
| Channel runtime/account | Channel plugin | Activation/login through stop, reload, or credential loss |
| Native inbound message/event | Provider/channel | Provider-native message or event identity |
| Conversation reference | Provider/channel projected through core | Channel, account, conversation, optional parent conversation |
| Route resolution | Shared routing using provider resolver | One result with provider/fallback source and optional placement hint |
| Session route | Session/routing owner | Route, dispatch, persisted, parent, and main session keys as applicable |
| Semantic turn | Agent/reply core | One admitted event-to-reply lifecycle |
| Reply payload/batch | Reply core | One planned semantic response before provider rendering |
| Queue intent | Durable outbound owner | Persisted outbound intent with queue policy |
| Native send attempt | Channel transport | One provider API try; no shared durable ID found |
| Message receipt | Channel/provider | Provider IDs/parts, thread/reply IDs, and send time |
| Visible-delivery result | Shared projection | Counts and observed signals; not provider delivery truth |

## Current Conversation Behavior

Current routing tests establish that:

- channel resolvers preserve provider-canonical IDs;
- account defaults are explicit;
- parent/child conversation IDs are projected separately;
- provider rejection can stop fallback;
- fallback parsing is retained for migration;
- plugin target projection maps conversation references to delivery fields;
  and
- binding IDs are account-scoped rather than display-label scoped.

Current gaps:

- route/session-key synthesis is still split between channel and shared code;
- native message, semantic turn, session route, and provider-copy identity are
  not one explicit portfolio relationship;
- external attachment/message copies lack one common lifecycle correlation;
  and
- route-generation provenance is not uniformly durable.

## Current Delivery Behavior

Current core and channel tests establish that:

- a final reply can be handed to durable delivery;
- best-effort delivery is distinct from explicitly required unknown-send
  reconciliation;
- persisted deliveries can survive startup without an active WhatsApp
  listener and send once after reconnection;
- multipart receipts retain provider IDs and parts;
- partial sends retain visible provider IDs and suppress duplicate fallback;
- directly retryable pre-acceptance failures may retry;
- unknown socket timeouts do not retry blindly; and
- a disconnect error carrying an accepted receipt does not replay.

Current gaps:

- no common durable delivery-operation/native-attempt identity is exposed
  across channels;
- final visible-delivery projection is synthesized from counts and signals;
- delivered/read certainty is provider-specific;
- render and route generations are not uniformly attached to attempts; and
- channel dispatch modules still combine rendering, retry, persistence,
  transcript mirroring, and UX signals.

## Target Contribution

### EC-015

Define a minimal relationship among provider conversation identity, route
resolution, semantic turn, session route, provider message copies, and
attachments. Preserve provider resolvers and session ownership.

### EC-016

Define a stable delivery operation correlated to queue intent, render/route
generations, distinct native attempts, replay declaration, provider receipts,
and terminal channel settlement. Preserve channel retry and receipt semantics.

## Representative Fixtures

1. **Accepted conversation**: provider resolver returns one parent/child
   conversation reference and the selected route records its source.
2. **Rejected conversation**: provider explicitly rejects a target; shared
   fallback does not reinterpret it.
3. **Route change**: the same provider conversation selects a new session
   route without rewriting prior turn provenance.
4. **Restart recovery**: a queued pre-dispatch delivery survives restart and
   sends exactly once when the account runtime becomes available.
5. **Unknown effect**: a provider socket timeout returns unknown and does not
   replay.
6. **Partial effect**: one multipart provider send succeeds before a later part
   fails; accepted provider IDs remain in the settlement.
7. **Mixed capability**: one channel declares replay-safe idempotency while a
   second requires reconciliation or no replay.
8. **External copy**: provider message and attachment copies remain distinct
   lifecycle subjects from the local transcript.

## Operational and Security Constraints

- Provider-private quote, forward, participant, attachment, and thread
  context remains visibility-filtered.
- Account and provider identifiers must not be replaced by labels in evidence.
- Delivery receipts may contain private provider identifiers and require
  audience-bound projection/redaction.
- Queue drains are isolated per channel/account and bounded.
- Unsupported durable reconciliation must remain explicit rather than
  silently degrading a required profile.
- Provider acceptance does not imply user visibility, delivery, or read.

## Migration, Deletion, and Disproof

### EC-015

- Adapt provider resolvers and route projections rather than introducing a
  universal message database.
- Retain compatibility fallback only while old channels migrate.
- Delete identity inference from display labels and latest routes.
- Disprove the contract if current owners already provide stable correlation,
  route provenance, thread forks, and copy boundaries without such inference.

### EC-016

- Adapt current durable queue intent, receipts, and channel retry classifiers.
- Do not impose a provider idempotency key where safe replay cannot be proven.
- Delete generic success projection and blind retry after ambiguous effects.
- Disprove the contract if current channel owners already expose durable
  operation/attempt identity and truthful restart/receipt settlement.

## Unproven Normative Claims

| Target claim | Required proof | Status |
| --- | --- | --- |
| Route generation is durable and attached to every admitted turn. | Threaded route-change fixture across restart/session reset | Planned |
| Provider/local message and attachment copies have stable lifecycle correlation. | Export/delete fixture with retained provider copy | Planned |
| Delivery operation identity survives every supported restart path. | Two-channel durable recovery fixture | Planned |
| Native attempts are distinct and correlated to one delivery operation. | Retry fixture exposing attempt identities | Planned |
| Replay declarations remain safe across mixed channel versions. | Mixed-version conformance fixture | Planned |
| Provider delivered/read states degrade explicitly when unsupported. | Receipt-capability matrix | Planned |

## Evidence-Ready Disposition

- EC-015: A-grade, not evidence-ready. Audited source plus representative
  conversation-resolution, route-projection, and provider-rejection proofs
  establish current identity behavior; route-generation and copy-lifecycle
  fixtures remain.
- EC-016: A-grade, not evidence-ready. Audited source plus representative
  durable recovery, receipt, partial-effect, and unknown/no-blind-replay proofs
  establish current delivery behavior; portable operation/attempt identity
  and mixed-capability proof remain.
