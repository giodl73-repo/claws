# Defense in Depth

<!-- atom:defense-in-depth (C23) -->

## The short version

claws governance operates across five enforcement layers. Each layer is an *insertion point* -- a place where governance code runs. No single layer is sufficient alone, and no single failure compromises all five. This is the speed-limit metaphor: a speed limit sign (L1 advisory SKILL.md) does not stop a car, but a speed limit sign plus a radar gun (L2 before_tool_call hook) plus a police officer (L3 lifecycle hooks) plus a barrier (L4 exec-approvals bridge) plus a separate patrol car following behind (L5 sidecar) makes speeding progressively harder and immediately detectable.

---

## The five layers

The five layers describe *where enforcement runs*, not what governance concerns exist. This matches the authoritative model in CL-03.

| Layer | Name | What it is | Insertion point | Bypassable? | What it catches |
|-------|------|-----------|----------------|-------------|----------------|
| L1 | Governance SKILL | Advisory prompt (SKILL.md, pinch-compressed) | `skills/claws-governance/SKILL.md` | Yes (weakest -- prompt-only, agent can ignore) | Agent self-governance instructions. Influences behavior through system prompt injection only. |
| L2 | Plugin `before_tool_call` | TypeScript hook, server-side | `api.on("before_tool_call", ...)` | No (Gateway-level) | Classification (G-CLASS), elicitation (G-ELICIT), bounds (G-BOUND), permissions (G-PERM). Every tool call passes through this hook. |
| L3 | Plugin lifecycle hooks | TypeScript, same plugin, different hooks | `api.on("subagent_spawning" \| "before_prompt_build" \| "llm_output" \| ...)` | No (Gateway-level) | A2A governance (G-A2A-*), output guards (G-OUTPUT), input defense (G-INPUT), context isolation (G-CONTEXT). |
| L4 | Exec-approvals bridge | JSON config, host-level | `exec-approvals.json` | No (host-level) | Backup for G-ELICIT and G-CLASS. Host-level allowlists that gate tool execution independently of the plugin. |
| L5 | Sidecar | Separate process/container | Reverse proxy | No (separate process) | Governance failure. The governance system itself crashing, being disabled, or being tampered with. Full SIEM, forensics, kill switch. |

L2-L4 share the Gateway process. If the Gateway is compromised, layers 2-4 are all gone. L5 (sidecar) is the only layer that survives Gateway compromise, which is why it is the RECOMMENDED deployment for enterprise.

---

## What each layer catches that the others miss

| Attack | L1 | L2 | L3 | L4 | L5 |
|--------|----|----|----|----|-----|
| Agent ignores governance instructions | Advisory only | -- | -- | -- | -- |
| Agent uses tool beyond its classification | -- | Catches | -- | Catches (backup) | -- |
| Injected instructions in web page content | -- | -- | Catches (G-INPUT) | -- | -- |
| Agent sends email without human approval | -- | Catches (G-ELICIT) | -- | Catches (backup) | -- |
| Compromised Agent A pivots through Agent B | -- | -- | Catches (G-A2A) | -- | -- |
| Governance plugin crashes, R5 tool unblocked | -- | -- | -- | Catches | Catches |
| Policy IR tampered with after compilation | -- | -- | -- | -- | Catches |
| `before_tool_call` handler dynamically unregistered | -- | -- | -- | -- | Catches |

Each row represents a distinct threat. No single layer addresses all of them. Note that L1 (advisory SKILL.md) is the weakest layer -- it can be ignored by the agent. L2-L3 (plugin hooks) provide the primary enforcement. L4 (exec-approvals) is the host-level backup. L5 (sidecar) catches failures in the governance system itself.

---

## The speed-limit metaphor

Enterprise security leaders understand layered defense intuitively when presented as traffic enforcement:

| Traffic enforcement | claws equivalent | Purpose |
|--------------------|-----------------|---------|
| Speed limit sign | L1 Governance SKILL (advisory prompt) | Declares what is allowed. Does not enforce. |
| Radar gun | L2 `before_tool_call` hook | Intercepts every tool call and enforces classification, elicitation, budget. |
| Police officer | L3 Lifecycle hooks | Monitors A2A delegation, output, input, context at specific events. |
| Concrete barrier | L4 Exec-approvals bridge | Host-level backup that gates tool execution independently. |
| Patrol car following behind | L5 Sidecar | Independent observer that intervenes if all else fails. |

A driver who sees a speed limit sign, knows radar is active, sees a police officer, faces a concrete barrier, and has a patrol car behind them is governed. Remove any one of these and the system still works. Remove three and it starts to fail. Remove all five and you have an ungoverned highway.

---

## Why L5 sidecar matters for enterprise

The first four layers run inside the agent gateway. If the gateway is compromised, all four layers are compromised. L5 runs as a separate process with three independent intervention paths:

| Path | Mechanism | When it fires |
|------|-----------|---------------|
| File-based kill | Writes `.claws/KILL` sentinel file | Governance health check fails (5-second timeout) |
| OS signal | Sends SIGUSR1 (Unix) or named event (Windows) | Redundant trigger alongside file-based kill |
| Process termination | SIGTERM/SIGKILL to gateway | Both file and signal paths fail within 10 seconds |

The sidecar also performs continuous integrity verification:

| Check | Frequency | What it verifies |
|-------|-----------|-----------------|
| Policy IR hash | Every 60 seconds | Compiled policy has not been tampered with since deployment |
| Handler presence | Every 60 seconds | `before_tool_call` handler is still registered in the gateway |
| Health endpoint | Every 5 seconds | Governance plugin is responsive |
| Persistent handler failures | Continuous | 3+ consecutive crashes for same tool within 60s triggers alert *(Source: fail-mode S04-F04)* |
| Error type classification | Continuous | Stack overflow (RangeError) = systemic escalation; TypeError = per-tool bug; Timeout = performance alert *(Source: fail-mode S05-F02)* |
| Handler unregistration | Every 60 seconds | Crash so severe it causes Gateway to unregister the handler *(Source: fail-mode S04-F07)* |

If the policy IR hash changes unexpectedly, the sidecar enters degraded mode: all R5 tools are blocked and a SIEM alert is emitted. This catches post-compilation tampering that compile-time checks cannot detect.

**Persistent failure recovery** *(Source: fail-mode S04-F04, S03-F01)*: When the sidecar detects persistent handler failures for a specific tool, it alerts the workspace operator and provides recovery guidance. `claws recover --tool <name>` forces re-evaluation with fresh state. This prevents the scenario where a governance bug permanently blocks a critical tool with no visibility.

---

## Layer interaction

The layers are concurrent enforcement mechanisms with different trigger conditions, not a sequential pipeline:

```
L1: SKILL.md -------- Always in prompt context (advisory, agent reads it)
L2: before_tool_call - Fires on EVERY tool call (classification, elicitation, budget)
L3: Lifecycle hooks -- Fires on SPECIFIC events (subagent_spawning, llm_output, etc.)
L4: Exec-approvals --- Host-level config, gates tool execution independently
L5: Sidecar ---------- Monitors health continuously from separate process
```

- L1 is passive: the advisory SKILL.md is always present in the agent's prompt context.
- L2 fires synchronously on every tool call, enforcing classification and elicitation.
- L3 fires on specific lifecycle events (A2A delegation, output, context assembly).
- L4 operates at the host level, independently of the plugin hooks.
- L5 monitors the health of the governance stack itself from outside the Gateway process.

An attacker would need to bypass all five layers simultaneously. Each layer operates at a different insertion point, and no single misconfiguration compromises the others.

---

## Regulatory alignment

| Framework | Requirement | Layers that address it |
|-----------|------------|----------------------|
| SOC2 CC6.1 | Logical access controls | L2 (tool classification via `before_tool_call`), L3 (A2A trust via lifecycle hooks) |
| SOC2 CC7.1 | Incident detection | L3 (input/output guards), L5 (integrity monitoring) |
| SOC2 CC7.2 | Incident response | L5 (kill switch, SIEM alert) |
| HIPAA 164.312(a)(1) | Access control | L2 (tool gating), L2 (elicitation for PHI actions), L4 (host-level backup) |
| EU AI Act Art. 9 | Risk management system | All five layers compose the risk management system |
| EU AI Act Art. 14 | Human oversight | L2 (elicitation gates via `before_tool_call`), L5 (kill switch) |
| OWASP #1 | Excessive Agency | L2 enforces tool classification |
| OWASP #3 | Prompt Injection | L3 reduces injection surface (G-INPUT, G-CONTEXT, G-OUTPUT) |
| OWASP #4 | Tool Misuse | L2 gates impersonation (G-ELICIT) |
| OWASP #5 | Inter-Agent | L3 enforces trust boundaries (G-A2A via lifecycle hooks) |

---

## Injection defense: the Guardrail Sandwich

The four injection defense rule groups (G-INPUT, G-CONTEXT, G-BOUND, G-OUTPUT) form a layered sandwich that reduces the prompt injection surface. Each group has 4 sub-rules with individual diagnostic codes:

| Group | Sub-rules | What it checks at compile time |
|-------|-----------|-------------------------------|
| G-INPUT | G-INPUT-01..04 | Tool output isolation configuration, trust labeling, sanitization, URL validation |
| G-CONTEXT | G-CONTEXT-01..04 | Boundary markers, tool isolation, memory isolation, skill isolation |
| G-BOUND | G-BOUND-01..04 | Step limits, tool call limits, budget limits, recursion limits |
| G-OUTPUT | G-OUTPUT-01..04 | Data redaction config, URL rules, format validation, chain validation |

Key distinctions from governance-rules scenario findings:

- **Compile-time vs runtime**: At compile time, these rules check CONFIGURATION exists (e.g., "does the tool declaration include output_isolation?"). They cannot verify runtime enforcement. Runtime enforcement is a CL-03 concern. *(Source: CL-02 Amendments A21, A26, A29)*
- **External vs local trust**: G-INPUT differentiates external data tools (web, API) from local data tools (file reader). External output is inherently untrusted; local output is user-controlled. *(Source: CL-02 Amendment A24)*
- **Memory loading context**: G-CONTEXT classifies memory loading into system prompt context (error), user message context (warning), and tool call context (note). This reduces false positives. *(Source: CL-02 Amendment A27)*
- **Per-channel redaction**: G-OUTPUT supports per-channel redaction: user response (redact PII), audit chain (preserve full PII), SIEM (event-only), subagent (inherit labels). *(Source: CL-02 Amendment A31)*
- **End-to-end testing**: Individual rule testing is necessary but not sufficient. The Guardrail Sandwich must be tested end-to-end via dedicated injection-defense-e2e scenarios. *(Source: CL-02 Amendment A22)*

---

## What to tell the board

No single security control is sufficient. claws applies five independent layers of governance at different insertion points, each catching threats the others cannot. The outermost layer runs as a separate process that can shut down the entire agent fleet if governance is compromised. An attacker would need to defeat all five layers simultaneously -- advisory prompt, tool-call hooks, lifecycle hooks, host-level approvals, and independent sidecar monitoring -- to execute an ungoverned action.

---

## Scenario-Driven Additions

### From injection-defense scenarios (47 findings applied)
- Guardrail Sandwich (G-INPUT, G-CONTEXT, G-BOUND, G-OUTPUT) is distributed across chain steps, not a sequential pipeline -- each layer fires at different points in the tool call lifecycle
- Per-turn data flow graph for chain validation: multi-tool chains are evaluated as a whole, catching exfiltration patterns invisible to individual guards (P-217)
- Memory entry provenance tracking with trust labels (SYSTEM/DATA/UNTRUSTED) enables cross-session taint detection and prevents memory poisoning attacks (P-216)
- Per-tool sub-boundaries within the DATA layer allow fine-grained isolation between tool outputs in the context window
- Loop detection heuristic beyond simple call counters: per-risk-level recommended tool call limits with pre-check vs post-check budget enforcement
- Graceful halt procedure for G-BOUND limit exceeded: 5-second cleanup period before session termination prevents abandoned partial writes

## Related concepts

- [Tool Classification](tool-classification.md) -- enforced at Layer 2 (`before_tool_call`)
- [Elicitation Gate](elicitation-gate.md) -- enforced at Layer 2 (`before_tool_call`)
- [Fail Mode](fail-mode.md) -- how each layer responds to errors
- [Audit Chain](audit-chain.md) -- where all five layers record their decisions
