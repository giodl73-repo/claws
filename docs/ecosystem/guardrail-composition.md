# GuardrailProvider Composition Model

**Version**: 1.0.0
**Status**: Specification
**Pulse**: 52 (guardrail-composition)

---

## Overview

This document describes how GuardrailProviders compose at the OC Gateway,
the layered precedence model for approval gates, and fail-mode behavior
per risk level.

The composition model is vendor-neutral -- it works with any host that
implements the ProviderRegistry interface, not just Aether.

---

## Composition Layers

```
Layer 3: Host Approval Gate
  - Final gate: user sees approve/deny UX
  - Only reached when requiresExternalApproval: true
  - R5 tools always reach this layer

Layer 2: Fleet Policy Override
  - Organizational policy overrides per tool
  - Wins over provider defaults for R3-R4
  - Cannot override R5 (non-negotiable)
  - Produces audit trail entries

Layer 1: GuardrailProvider
  - Individual governance providers (claws, exec-approvals, custom)
  - Each returns AuthorizationDecision
  - Multiple providers compose via ProviderRegistry
```

---

## Precedence Rules

### Decision Priority

When multiple providers return different decisions:

1. **deny** -- strongest, any deny blocks the tool
2. **review** -- held for human review (implies requiresExternalApproval: true)
3. **modify** -- tool proceeds with rewritten arguments (last modify wins)
4. **allow** -- weakest, all providers must allow

### requiresExternalApproval Resolution

The `requiresExternalApproval` field is OR'd across all providers and
composed with fleet policy:

| Risk Level    | Default | Fleet Override        | Final       |
| ------------- | ------- | --------------------- | ----------- |
| R1-R2 (low)   | false   | Can escalate to true  | Fleet wins  |
| R3 (medium)   | true    | Can override to false | Fleet wins  |
| R4 (high)     | true    | Can override to false | Fleet wins  |
| R5 (critical) | true    | **Cannot override**   | Always true |

Fleet override precedence (per CM3):

- If fleet says R3 auto-approve, provider MUST NOT set
  requiresExternalApproval: true for R3 tools.
- Provider reads fleet policy before setting the field.

R5 enforcement (per CISO W2):

- R3+ MUST set requiresExternalApproval: true unless fleet override
  explicitly permits false.
- R5 is non-negotiable: always true regardless of any override.

---

## Fail-Mode Per Risk Level

When a provider throws an exception during `preAuthorize()`:

| Risk Level | Fail Mode   | Overridable | Behavior                      |
| ---------- | ----------- | ----------- | ----------------------------- |
| R1         | fail-open   | No          | Tool proceeds                 |
| R2         | fail-open   | No          | Tool proceeds                 |
| R3         | fail-closed | Yes (fleet) | Default: tool blocked         |
| R4         | fail-closed | Yes (fleet) | Default: tool blocked         |
| R5         | fail-closed | **No**      | Tool blocked (non-negotiable) |

The 100ms SLA on `preAuthorize()` means exceeding the timeout is
treated as a thrown exception and the fail-mode table applies.

---

## Risk-Change Audit

Per CISO M3: when a tool's risk classification changes between
compilations, an audit event is emitted with:

- **old/new risk level** -- what changed
- **risk delta** -- numeric difference (positive = escalation)
- **policy changed** -- whether approval requirements changed
- **old/new approval requirement** -- before and after
- **timestamp + compiler version** -- traceability

This enables security teams to track risk drift over time and
catch unintended de-escalations.

---

## Empty Registry

If no providers are registered, the registry returns:

```json
{ "decision": "deny", "reason": "No governance providers registered" }
```

A governance system with no providers is fail-closed, not permissive.

---

## Review Decision Semantics

A `review` decision implicitly sets `requiresExternalApproval: true`.
This field is present for consistency but cannot be set to false on
review decisions. The type system enforces this:

```typescript
interface ReviewDecision {
  decision: "review";
  requiresExternalApproval: true; // literal true, not boolean
}
```

---

## Deny Decision Semantics

A `deny` decision never reaches the host approval gate. The tool is
blocked at the provider level. The `requiresExternalApproval` field
is not applicable (N/A) for deny decisions.
