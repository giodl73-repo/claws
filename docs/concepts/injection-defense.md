# Injection Defense

<!-- atom:injection-defense -->

## Overview

Injection defense protects governed workspaces from prompt injection, data exfiltration, and chain-of-tool attacks. claws implements a distributed Guardrail Sandwich -- governance layers that fire at different points in the tool execution chain rather than as a single sequential check. This architecture addresses the fundamental challenge that no single guard can see the full attack surface of a multi-tool chain.

---

## Guardrail Sandwich: Distributed Nature

The Guardrail Sandwich is not three layers that run in sequence. It is three layers that fire at **different chain steps**:

| Layer                            | When it fires            | What it checks                                          |
| -------------------------------- | ------------------------ | ------------------------------------------------------- |
| **Layer 1: Governance preamble** | Context assembly         | System prompt integrity, trust boundaries               |
| **Layer 2: Input/output guards** | Per-tool invocation      | Tool call validation, boundary markers, data labels     |
| **Layer 3: Chain validation**    | Post-tool, pre-next-tool | Data flow graph, cumulative risk, exfiltration patterns |

A chain-of-tool injection (web-search -> summarize -> draft-email -> send-email) may pass each individual Layer 2 guard. Only Layer 3, which sees the full chain, can detect that the overall flow exfiltrates data. _(Source: injection-defense S06-F01, P-217)_

---

## Chain Validation

Layer 3 maintains a **per-turn data flow graph** that tracks how data moves through the tool chain:

1. Each tool call is a node in the graph
2. Edges represent data flow (output of tool A becomes input of tool B)
3. Data labels (SYSTEM / DATA / UNTRUSTED) propagate through edges
4. The graph is checked for forbidden flows (UNTRUSTED -> external API with user credentials)

Chain validation runs after each tool completes but before the next tool starts. The data structure supports O(1) amortized lookups to stay within latency budgets. _(Source: injection-defense S06-F01, S06-F04)_

---

## Memory Poisoning Defense

Cross-session memory poisoning is a critical attack vector (P-216). An attacker compromises session N and writes poisoned data to persistent memory. In session N+1, the poisoned memory is loaded as trusted context.

claws defends against this with:

| Mechanism                | Description                                                               |
| ------------------------ | ------------------------------------------------------------------------- |
| **Provenance tracking**  | Every memory entry records which session and tool wrote it                |
| **Trust labels**         | Memory entries carry SYSTEM / DATA / UNTRUSTED labels                     |
| **Write-audit flagging** | Memory entries without write-audit provenance are flagged on load         |
| **G-CONTEXT-03 trigger** | Rule triggers on memory-write tool presence, not just MEMORY.md existence |

When poisoned memory is detected (UNTRUSTED label, no write-audit, written by a flagged session), the entry is loaded with a taint marker that propagates through the data flow graph. _(Source: injection-defense S05-F03, P-216)_

---

## Boundary Markers

Context boundaries between governance layers use **nonce-based markers** rather than fixed strings. Fixed markers are trivially forgeable -- any data source that includes the exact marker string escapes the DATA boundary (P-210).

Nonce-based markers:

- Generated fresh per session
- Never appear in content (nonce confidentiality is enforced)
- Validated by the runtime on every boundary crossing
- Fail-closed: if marker injection crashes (malformed UTF-8), tool output is blocked, not passed through

_(Source: injection-defense S02-F01, S02-F02, S02-F04, P-210, P-211, P-212)_

---

## URL Validation

G-OUTPUT rules include URL validation to prevent data exfiltration via URL parameters:

| Mode                       | Scope                                 | Use case                            |
| -------------------------- | ------------------------------------- | ----------------------------------- |
| **Allowlist**              | Enterprise-defined allowed domains    | Production / regulated environments |
| **Blocklist + heuristics** | Known bad domains + pattern detection | Default mode                        |
| **Advisory**               | Log but don't block                   | Development environments            |

URL validation applies across all output channels, not just user-facing ones. Tool argument schemas are inspected for URL-type fields. DNS exfiltration (encoding data as subdomains) is documented as out-of-scope for claws, with a recommendation for network-level DNS monitoring. _(Source: injection-defense S03-F01, S03-F04, P-213)_

---

## Context Window Truncation Protection

Governance preamble (Layer 1) is vulnerable to context window truncation -- long conversations push early instructions out of the window, and the #1 defense layer evaporates (P-218). claws addresses this per-platform:

- Platforms that support pinned/system messages: preamble is pinned
- Platforms with FIFO truncation: preamble is repeated at intervals
- Truncation detection: if governance preamble is absent from context, fail-closed

_(Source: injection-defense S01-F07, P-218)_

---

## Budget Enforcement

G-BOUND rules enforce tool call limits to prevent injection-driven resource exhaustion:

| Mechanism                | Description                                                   |
| ------------------------ | ------------------------------------------------------------- |
| Per-risk-level limits    | R5 tools: 3 calls/session, R3: 20, R1: unlimited              |
| Pre-check enforcement    | Budget checked before tool call, not after                    |
| Graceful halt            | 5-second cleanup period before session termination            |
| WAL write latency bounds | Budget counter stays synchronized to prevent lag exploitation |

_(Source: injection-defense S04-F02, S04-F07, P-214, P-215)_

---

## Related Concepts

- [Defense in Depth](defense-in-depth.md) -- injection defense is one layer of the overall model
- [Tool Classification](tool-classification.md) -- risk classification drives guard stringency
- [A2A Boundary](a2a-boundary.md) -- agent-to-agent injection via delegation chains
