# A2A Boundary

<!-- atom:a2a-boundary -->

## Overview

The A2A (Agent-to-Agent) boundary governs how agents interact, delegate, and trust each other within and across workspaces. claws enforces a strict trust model where trust is declared explicitly, never inferred, and never transitive. Every agent interaction crosses a governance boundary that the compiler can verify at compile time and the runtime can enforce at execution time.

---

## Trust Taxonomy

claws classifies agent trust into four levels:

| Level | Name | What it allows | When to use |
|-------|------|---------------|-------------|
| `none` | No trust | Agent cannot interact at all | Default for undeclared agents |
| `delegation-only` | Task delegation | Agent can delegate specific tasks | Narrow, scoped collaboration |
| `communication` | Information exchange | Agent can send/receive data | Read-only coordination |
| `full` | Full trust | Agent can delegate, communicate, and act on behalf of | Tightly coupled agent pairs |

Trust is declared in AGENTS.md per agent pair. Undeclared agents default to `none` -- they cannot interact. This is default-deny at the agent interaction level, mirroring the OBO boundary's default-deny for tool execution. *(Source: a2a-governance S01-F01, S01-F03)*

---

## No-Transitive-Trust Rationale

Trust is **never transitive** in claws. If agent A trusts agent B, and agent B trusts agent C, agent A does NOT trust agent C. This is the foundational security property of the A2A boundary.

Why no transitivity?

1. **Trust composition is unpredictable.** A trusts B for financial calculations. B trusts C for data retrieval. A does not necessarily trust C's data retrieval quality or security posture.
2. **Attack surface multiplication.** Transitive trust means compromising any agent in a chain compromises all downstream agents. A fleet of 50 agents with transitive trust has an attack surface of O(n^2).
3. **Audit trail opacity.** When A's action was actually initiated by C via B, the audit trail must trace through the full chain. Without transitive trust, every link is an explicit, auditable decision.

The compiler detects and warns about **implicit transitive trust chains** -- where the delegation graph implies transitivity that the trust declarations do not support. This is fence-check FE6 in the compiler. *(Source: a2a-governance S03-F01, S03-F02, P-204)*

---

## Delegation vs Trust Depth

Delegation and trust are related but distinct concepts:

| Concept | Definition | Example |
|---------|-----------|---------|
| **Delegation depth** | How many agents deep a task can be forwarded | A delegates to B, B delegates to C (depth 2) |
| **Trust depth** | How many trust boundaries a request crosses | A trusts B, B trusts C (depth 2, but NOT A trusts C) |

A delegation at depth 2 carries agent A's identity context through agent B to agent C. But the trust relationship is still pairwise: A-B and B-C are independent trust decisions. Increasing delegation depth does NOT create transitive trust -- it creates a chain of explicit, pairwise trust evaluations. *(Source: a2a-governance S03-F05)*

---

## Default-Deny for Dynamic Agents

Agents spawned dynamically (not declared in AGENTS.md) are subject to **runtime default-deny**. The compile-time trust model only covers declared agents. Dynamic agents:

- Cannot delegate to or receive delegation from any agent
- Cannot access tools beyond their own R1/R2 baseline
- Are logged with a "dynamic-unverified" tag in the audit trail

This prevents an injection attack from spawning a trusted agent at runtime. *(Source: a2a-governance S01-F02, P-203)*

---

## Identity Levels and Risk

Agent identity determines how much trust is justified:

| Level | Name | Risk | Verification |
|-------|------|------|-------------|
| L0 | Name-only | Zero-effort impersonation | None -- any agent can claim any name |
| L1 | Key-based | Requires key theft | Cryptographic key pair |
| L2 | Fleet-attested | Requires fleet compromise | Fleet-issued certificate chain |

L0 identity in a fleet context is a critical risk (P-202). claws emits a threat-specific warning when L0 identity is used in multi-workspace scenarios, because name-based identity provides zero assurance against impersonation. *(Source: a2a-governance S02-F01, P-202)*

---

## Compile-Time vs Runtime Enforcement

| Boundary | Verified at | What it catches |
|----------|------------|----------------|
| Trust declarations | Compile time | Missing trust, undeclared agents, transitive chains |
| Delegation depth | Compile time | Excessive delegation chains |
| Dynamic agent blocking | Runtime | Undeclared agents spawned during execution |
| Lateral movement detection | Runtime | Correlated blocks suggesting compromise |

The compile-time/runtime split ensures that everything knowable at compile time is enforced before execution, while runtime enforcement handles the inherently dynamic aspects of agent interaction. *(Source: a2a-governance S01-F04)*

---

## Related Concepts

- [OBO Boundary](obo-boundary.md) -- the human-agent trust boundary
- [Fleet Delegation](fleet-delegation.md) -- cross-workspace delegation model
- [Tool Classification](tool-classification.md) -- tool risk affects delegation ceiling
