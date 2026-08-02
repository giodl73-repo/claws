# Wave 3 Contract Role Review - 2026-08-01

## Scope

Wave 3 reviewed:

- EC-001, EC-002, EC-005, EC-010;
- EC-015, EC-017, EC-018, EC-021; and
- EC-030, EC-031, EC-033, EC-034.

Panels applied founder, new-hire, power-user, platform, Gateway, Aether
runtime, CISO, compliance, policy, Microsoft 365 connector, release, and
Lobster-container lenses.

## Portfolio Decision

Eleven contracts remain separate and ready for portfolio refinement.

EC-010 remains a candidate contract but is blocked on a separation test:
scheduling becomes an owner only if schedule/wake/lease state has an
independent lifecycle from the runs it activates.

## Accepted Findings

### Experience, trust, and scheduling

- EC-001 adds explicit projection-layer failure distinct from owner failure.
- EC-002 consumes checkpoint restore rather than reimplementing rollback and
  emits repair evidence through EC-033.
- EC-005 owns revocation identity/propagation; consumers own their fencing and
  settlement.
- EC-010 owns activation scheduling only, not run retries, run settlement, or
  resource leases.

### Conversation, session, context, and continuity

- EC-015 owns provider thread-fork correlation, not transcript branches.
- EC-017 consumes conversation identity and lifecycle obligations; it owns the
  session export source/omission/integrity contract, not delivery transport.
- EC-018 consumes memory and attempt generations without becoming canonical
  memory/session state and requires a bounded evidence slice.
- EC-021 consumes lifecycle vocabulary and fails closed on dirty/in-flight
  state or stale restore authority.

### Governance, assurance, and fleet

- EC-030 declares prohibited-in-evidence classes; EC-033 owns evidence
  redaction/retention mechanics.
- EC-031 binds degrade/reject behavior to operation risk and remains the
  admission owner consumed by containment.
- EC-033 is the shared durable audit and attestation base for the portfolio.
- EC-034 composes revocation, admission, effect certainty, readiness,
  recovery, and evidence without redefining them.

## Deferred Questions

- Whether EC-010 passes the independent-owner separation gate.
- Exact session-export delivery profile and destination policy.
- Which context-assembly trace becomes the first conformance fixture.
- Cross-owner checkpoint consistency levels for Scout.
- Which existing OpenClaw audit schema becomes the EC-033 evolution base.
- Fleet unit identity and mixed-version evidence shape.

## Result

All three waves have completed role review and applied revisions. The next
portfolio pass should evaluate:

- final contract names;
- Wave 1/September priority;
- dependency order;
- contract merges or removals after source audit;
- current OpenClaw/Lobster implementation mapping; and
- proof/RFC promotion gates.
