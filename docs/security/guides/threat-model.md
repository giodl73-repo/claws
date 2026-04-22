---
covers: [atom:SM]
---

# Threat model

The assumptions claws makes about adversaries, what they can and
cannot do, and which defences protect which threats.

## Adversary model

We assume the adversary can:

- Craft malicious prompts for the agent (prompt injection)
- Attempt to smuggle malicious args through tool calls
- Intercept network traffic to/from the companion app (requires TLS)
- Compromise one end-user identity (steal a session)
- Run arbitrary plugin code within the workspace (but not override
  `GuardrailProvider`)

We assume the adversary CANNOT:

- Compromise the host process directly (OS-level attack)
- Forge HMAC signatures without access to the key material
- Modify the policy artifact after signing without detection
- Break RFC 8785 JCS canonicalization
- Break SHA-256

## What each layer protects

| Layer | Protects against |
|-------|------------------|
| R1-R5 tier classification | tool misuse at the wrong authority level |
| OBO boundary | agent self-escalation to R4+ without user delegation |
| 16 injection defences | prompt injection, args tampering, return-value smuggling |
| Handle-binding 7-tuple | replay of approval-handle + args substitution |
| Audit chain cross-linking | silent policy substitution, chain tampering |
| Drain-window semantics | in-flight decision reclassification during promote |
| Kill switch | emergency stop without redeploying policy |

## Chain of custody

Every decision's chain of custody is visible in the audit log:

1. `ProducerEntry` — which policy artifact is active
2. `DecisionEntry` — the runtime's decision, bound to the policy via
   `policyArtifactSha256`
3. `ApprovalEntry` (if review) — the companion's response, bound to
   the decision via `correlationId` and to the handle via
   `sha256(handle.*)`
4. `ExecutionEntry` — what actually ran, bound to the decision via
   `correlationId`

A verifier can replay the chain and confirm every decision traces
back to a policy artifact, every approval traces back to a decision,
and every execution traces back to an approval or to an `allow`
decision. See
[`guardrails/specs/GRA-audit-chain.md`](../../guardrails/specs/GRA-audit-chain.md).

## Defence in depth

Claws uses multiple independent layers for every invariant. Example:
the `oc://` URI boundary:

- **Parser** (workspace/specs/WSP-path.md) — rejects 12 syntactic
  vectors at compile time + at runtime entry
- **Provider** (guardrails/specs/GRF-file-ingest.md) — re-validates
  every `redirectPath`
- **Runtime** (workspace § symlink check) — resolves to absolute
  path, asserts under `workspaceRoot`
- **Filesystem** (O_NOFOLLOW / REPARSE_POINT) — blocks TOCTOU at the
  syscall boundary

No single layer is load-bearing. A bug in one layer is caught by
another. See [../pitfalls/injection.md](../pitfalls/injection.md) for
which attack each layer is meant to catch.

## What's NOT in scope

- Network confidentiality — assumed TLS from host
- Identity attestation — assumed correct at the OBO claim layer;
  claws trusts what the host passes in
- OS-level process isolation — assumed correct at the host OS
- Quantum resistance — HMAC-SHA256 is not PQ-safe; post-quantum
  migration is on the roadmap
