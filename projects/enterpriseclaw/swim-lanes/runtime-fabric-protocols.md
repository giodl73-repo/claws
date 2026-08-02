# Runtime Fabric and Protocols

## Architectural Goal

Connect independently owned components through versioned, authenticated, and
observable protocols without creating a universal semantic bus.

## Responsibilities

- Establish transport sessions and peer identity.
- Negotiate protocol and capability compatibility.
- Correlate request, stream, progress, cancellation, and terminal result.
- Define replay, reconnect, ordering, backpressure, and timeout behavior.
- Evolve schemas while preserving unknown-field and mixed-version safety.

## Explicit Non-Ownership

- Transport does not own application authorization or effect semantics.
- Reconnect does not authorize replay.
- Acknowledgement does not imply owner mutation or external effect.

## Conceptual Pieces

| Piece | Purpose | Owner expectation |
| ----- | ------- | ----------------- |
| Connection | Bounded peer transport session | Authenticated generation |
| Protocol version | Compatibility boundary | Negotiated explicitly |
| Capability set | Supported operations and features | Not authorization |
| Request correlation | One operation over transport | Maps to owner identity |
| Stream | Ordered partial observations | Backpressure and resumption |
| Cancellation | Request to stop | Settlement remains owner-specific |

## Core Contracts

- Every operation identifies protocol, peer, connection, request, and owner
  correlation.
- Mixed versions fail closed only where safety requires it; otherwise degrade
  explicitly.
- Late, duplicate, and stale results are fenced.
- Unknown fields survive compatible relays where appropriate.

## Quality Attributes

- Secure transport, bounded resource use, and denial-of-service resistance.
- Low-latency local operation and resilient remote operation.
- Backward-compatible evolution and inspectable negotiation.
- Replaceable transports above stable owner contracts.

## Candidate Fit

| Need | Existing or adjacent candidate | Initial disposition | What must be proven |
| ---- | ------------------------------ | ------------------- | ------------------- |
| Gateway protocol | Current Gateway | Reuse/adapt | Version and operation evidence |
| Agent protocol | Current ACP seams | Reuse/adapt | Compatibility and cancellation |
| Plugin transports | Current plugin/MCP boundaries | Adapt | Capability negotiation |
| Generic event bus | Broker technologies | Assess/avoid | Must not centralize semantics |
| Fleet communication | Host integration carriers | Assess | Identity, replay, and offline behavior |

## Cross-Lane Dependencies

- Depends on identity and compatibility.
- Serves all distributed lanes.
- Must not absorb workflow, policy, or state ownership.
