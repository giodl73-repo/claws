# OpenClaw Container — Threat Model & Invariants

**Status**: Shareable one-pager
**Date**: 2026-04-17
**Related**: `docs/claws/proposals/aether-integration.md`, `design/claws/specs/CL-02-security-model.md` Amendment A489, `design/claws/specs/CL-09-oc-workspace-format.md` `args_from` schema, `design/claws/PITFALLS.md` P-351

---

## Context

The OpenClaw container is the **untrusted zone**. Agent code runs there. Skills can be malicious. Anything we let the container *decide* is a decision the attacker controls. Every defense works by moving the real decision out of the container and into an independent trusted plane (aether).

This document enumerates the top dangers, the invariants that block them, and the architectural choice that makes those invariants load-bearing.

---

## Top Dangers of the OpenClaw Container

| # | Danger | How it attacks | Severity | Blocked by |
|---|--------|----------------|----------|------------|
| **D1** | **Authoritative bypass** | Compromised skill swaps the in-container classifier; envelope lies (R5 → R1). If aether trusts envelope, full bypass. | Critical | Inv 2 |
| **D2** | **Direct workspace write** | Agent writes straight to mounted FS; a consumer reads the poisoned file as canonical truth. | Critical | Inv 1 |
| **D3** | **Stale-snapshot decision** | Container runs policy v11 while canonical is v12. Tool evaluated against stale policy — user intent violated silently. | High | Inv 3 |
| **D4** | **R-tier laundering via tool chain** | R1 reader fetches RESTRICTED data → R1 sender egresses it. Neither tool is R5; the *chain* is. | High | CL-02 G-CHAIN + Inv 2 |
| **D5** | **Forwarder tamper / envelope replay** | Container drops `before_tool_call`, modifies envelope post-classification, or replays an old "approved" envelope. | High | Inv 2 + 3 |
| **D6** | **Schema drift claws ⇄ aether** | claws emits policy v1.1; aether on v1.0 rejects → fleet's workspace tier goes dark. | Medium | Inv 4 |
| **D7** | **Tenancy confusion / cache-key collision** | Hash collision or buggy key → workspace A deploys workspace B's policy. | Medium | Inv 1 (key derivation) |
| **D8** | **Runtime-unreachable fleet block** | Aether pod crashes → every container's every tool call blocked until recovery. | High | Inv 3 (last-good fallback) |

---

## The Four Invariants

| # | Invariant | Enforcement | Solves | Needs aether? |
|---|-----------|-------------|--------|---------------|
| **Inv 1** | EROFS mount; all writes via `/v1/workspace-write` | Kernel RO mount + gateway: authN → validate → compile → promote. Cache key `H(tenant ‖ workspace ‖ content)`. | D2, D7 | **Yes** — container can't refuse its own writes; the gateway *is* the second system. |
| **Inv 2** | Compiled policy authoritative; envelope advisory | Aether Tier 0 evaluates compiled policy independently using its own canonical view. | D1, D4, D5 | **Yes** — authoritative = independent re-evaluation. Compromised container can't defeat itself. |
| **Inv 3** | Every decision carries `snapshot_id + policyHash + correlationId`; aether validates | Aether rejects on version mismatch, expired timestamp (60s), or duplicate correlationId. Last-good snapshot for ≤R3 during outage. | D3, D5, D8 | **Yes** — replay + snapshot-identity check need a witness that isn't the attacker. |
| **Inv 4** | Policy format is a separately versioned package with fail-closed handshake | `@openclaw/governance-policy-format` semver package; neither side embeds a literal schema. Mismatch > minor → fail-closed. | D6 (guards D7) | **No** — pure package convention; location-independent. |

**3 of 4 invariants collapse to the same requirement: aether as an independent trusted plane.** That's the load-bearing architectural decision.

---

## Compile Location is a Free Variable

The compiler is a pure function from workspace files → policy artifact. Aether is the enforcer. They are logically distinct.

Because Inv 2 requires aether to re-evaluate compiled policy independently, **compile can run wherever is convenient** — the aether pod, the container, CI, a developer laptop. Aether's re-verification on promotion is what makes an artifact canonical. The compiler's output is content-addressable; its location does not change the trust boundary.

Implications:

- **Container-local compile** is a DX optimization (fast feedback, offline editing), not a trust change
- **Aether-mediated compile** is the current design, simplest mental model
- **CI/laptop compile** is viable if aether re-validates on promotion

The one invariant that absolutely pins architecture is **Inv 1 (EROFS + write gateway)** — the container cannot refuse its own writes, so something outside has to validate on the way in.

---

## Defense Coverage by Location

What would change if we moved enforcement into the container instead of aether?

| # | Danger | Aether-mediated (current) | In-container only |
|---|--------|---------------------------|-------------------|
| D1 | Authoritative bypass | Blocked | **No defense** — enforcer = attack surface |
| D2 | Direct workspace write | Blocked | Partial — EROFS works, but "promote" has no authority |
| D3 | Stale-snapshot | Blocked | Degraded — no cross-container version authority |
| D4 | R-tier laundering | Blocked | Degraded — G-CHAIN rules ship, but enforcer trust weakens |
| D5 | Forwarder tamper / replay | Blocked | **No defense** — enforcer = forwarder = attack surface |
| D6 | Schema drift | Blocked | Neutral — same package convention |
| D7 | Tenancy confusion | Blocked | Slightly better — per-user container is already scoped |
| D8 | Runtime-unreachable | Mitigated (last-good) | **Better** — no external runtime to fail |

**D1, D2, D5 require aether.** D8 is the only danger that prefers container-local. Everything else is equal or degraded without aether.

---

## Spec References

- **CL-02 Amendment A489** — G-CHAIN rule family (5 sub-rules: provenance schema validation, source-to-risk propagation, unspecified-provenance default-deny, transitive provenance walk, irreversible-external mandatory declaration)
- **CL-09 §TOOLS.md** — `args_from` schema with source-label grammar (`user_prompt`, `tool_output.<name>`, `memory.<label>`, `agent_literal`)
- **PITFALLS.md P-351** — R-tier laundering via intra-agent tool-argument chain (High severity)
- **CL-13 v1.6** — repo boundary + internal distribution posture
- **Proposal §3** — `docs/claws/proposals/aether-integration.md` (follow-up PR to aether #5408)

---

## Summary

Of 8 identified container dangers, 5 are blocked only because aether runs as an independent trusted plane:
- **Write integrity** (D2) — gateway validates before canonical promotion
- **Decision integrity** (D1, D4, D5) — aether Tier 0 evaluates compiled policy independently
- **Temporal integrity** (D3, D5) — snapshot-identity + replay-window validated by aether

These reduce to **three architectural requirements**:

1. **EROFS mount + write gateway** (Inv 1)
2. **Aether evaluates compiled policy independently** (Inv 2)
3. **Every decision carries identity; aether validates** (Inv 3)

Plus one package convention:

4. **Versioned policy-format package with handshake** (Inv 4) — no separate system needed

The compiler is location-independent. The trust boundary is aether's independent re-verification on promotion.
