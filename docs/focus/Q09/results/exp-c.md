# Experiment c: Defense-in-Depth Matrix

**Method**: design analysis
**Date**: 2026-04-11

---

## Overview

This experiment maps every Q12h governance rule to its enforcement point(s) across the 5 insertion layers, identifies coverage gaps, and designs the fail-mode policy. The goal: a complete enforcement matrix that shows where every rule is enforced, what happens when enforcement fails, and where gaps remain.

---

## Complete Enforcement Matrix

Legend:
- **PRIMARY**: Main enforcement point for this rule
- **BACKUP**: Catches what the primary misses
- **ADVISORY**: Informational only (agent can ignore)
- **N/A**: Not applicable to this layer

### Layer 1: Classification Rules (G-CLASS, G-PERM, G-DATA)

| Rule | Description | Compile-time (glint pinch) | L1 Skill | L2 Hook | L3 Plugin | L4 Exec | L5 Sidecar | Fallback if runtime fails |
|------|-------------|---------------------------|----------|---------|-----------|---------|------------|--------------------------|
| **G-CLASS** | Per-tool R1-R5 risk scoring | PRIMARY (classify at build time) | ADVISORY (agent sees classification table) | PRIMARY (enforce classification per-call) | BACKUP (redundant check) | BACKUP (allowed/denied lists reflect classification) | BACKUP (re-validate independently) | Fail-closed for R5, configurable R3-R4, fail-open R1-R2 |
| **G-PERM** | Capability-based permissions (READ/WRITE/COMMUNICATE/EXECUTE/TRANSACT) | PRIMARY (validate capability assignments) | ADVISORY (agent sees capability descriptions) | PRIMARY (enforce capability check per-call) | BACKUP (redundant) | BACKUP (allowlist reflects capabilities) | BACKUP | Same as G-CLASS |
| **G-DATA** | Data sensitivity labels (PUBLIC/INTERNAL/CONFIDENTIAL/RESTRICTED) | PRIMARY (validate label assignments) | ADVISORY (agent sees label policy) | BACKUP (scan tool arguments for sensitive patterns) | PRIMARY (enforce data labels on A2A channels) | N/A (no data content inspection) | BACKUP (full payload inspection) | Label enforcement degrades — tool args not inspected, A2A labels not enforced |

### Layer 2: A2A Governance Rules (G-A2A-*)

| Rule | Description | Compile-time (glint pinch) | L1 Skill | L2 Hook | L3 Plugin | L4 Exec | L5 Sidecar | Fallback if runtime fails |
|------|-------------|---------------------------|----------|---------|-----------|---------|------------|--------------------------|
| **G-A2A-IDENTITY** | Agent identity verification (L0-L3) | PRIMARY (validate identity config completeness) | ADVISORY (agent sees trust boundaries) | N/A (hook doesn't intercept A2A) | PRIMARY (verify identity on every A2A message) | N/A | BACKUP (verify at network level) | A2A messages pass unverified — compile-time catches missing config but runtime identity check lost |
| **G-A2A-TRUST** | Default-deny trust boundaries | PRIMARY (validate trust groups, detect wildcards) | ADVISORY (agent sees trust group list) | N/A | PRIMARY (enforce trust group membership per-message) | N/A | BACKUP (independent trust check) | A2A reverts to OC default (no trust boundary) — agents communicate freely |
| **G-A2A-FLOW** | Data flow labels across agent boundaries | PRIMARY (validate label coverage) | ADVISORY (agent sees sensitivity ceilings) | N/A | PRIMARY (enforce data ceiling per A2A channel) | N/A | BACKUP (payload inspection) | Data flow labels not enforced — CONFIDENTIAL data can flow to lower-sensitivity agents |
| **G-A2A-ESCALATE** | No transitive trust, chain depth limits | PRIMARY (detect transitive chains via FE6) | ADVISORY (agent told not to chain) | N/A | PRIMARY (enforce chain depth limit per-message) | N/A | BACKUP | Lateral movement possible — chain depth not checked |
| **G-A2A-DELEGATE** | Delegation permission ceiling | PRIMARY (validate delegation scope in policy) | ADVISORY (agent told delegation rules) | N/A | PRIMARY (enforce ceiling on delegation messages) | N/A | BACKUP | Delegation may exceed source permissions |

### Layer 3: Injection Defense Rules (G-INPUT, G-CONTEXT, G-OUTPUT, G-BOUND)

| Rule | Description | Compile-time (glint pinch) | L1 Skill | L2 Hook | L3 Plugin | L4 Exec | L5 Sidecar | Fallback if runtime fails |
|------|-------------|---------------------------|----------|---------|-----------|---------|------------|--------------------------|
| **G-INPUT-1** | System prompt isolation | PRIMARY (validate prompt structure) | ADVISORY (agent told about isolation) | N/A | PRIMARY (verify input boundaries on ingest) | N/A | BACKUP (message inspection) | Injection via system prompt override possible |
| **G-INPUT-2** | Trust labeling on inputs | PRIMARY (validate label annotations) | ADVISORY | N/A | BACKUP (apply labels on ingest) | N/A | BACKUP | Inputs arrive without trust labels — agent treats everything as instructions |
| **G-INPUT-3** | Input sanitization patterns | PRIMARY (emit sanitization stubs) | ADVISORY (agent told to be wary) | N/A | PRIMARY (sanitize known patterns on ingest) | N/A | BACKUP (pattern matching on payload) | Known injection patterns not stripped — agent receives raw input |
| **G-INPUT-4** | URL validation | PRIMARY (emit URL allowlist) | ADVISORY (agent told domain restrictions) | N/A | PRIMARY (validate URLs in inbound messages) | N/A | BACKUP | Malicious URLs in input not caught |
| **G-CONTEXT-1** | Boundary markers between context sections | PRIMARY (emit boundary markers in compiled output) | ADVISORY (markers included in SKILL.md) | N/A | BACKUP (verify boundary presence) | N/A | N/A | Context sections not clearly demarcated — cross-contamination possible |
| **G-CONTEXT-2** | Tool output isolation (data, not instructions) | PRIMARY (emit isolation markers) | ADVISORY (agent told tool output is data) | N/A | PRIMARY (mark tool results as DATA in metadata) | N/A | N/A | Tool results treated as instructions — indirect injection viable |
| **G-CONTEXT-3** | Memory isolation (data, not instructions) | PRIMARY (emit isolation markers) | ADVISORY (agent told memory is data) | N/A | BACKUP (can't intercept all memory paths) | N/A | N/A | Memory entries treated as instructions — memory poisoning viable |
| **G-CONTEXT-4** | Skill isolation (prevent skill content leaking into other skills) | PRIMARY (validate skill boundaries) | N/A | N/A | BACKUP (verify skill context separation) | N/A | N/A | Skills may share context — one skill can influence another |
| **G-OUTPUT-1** | PII/PHI redaction in agent responses | PRIMARY (emit redaction rules) | ADVISORY (agent told to avoid PII) | N/A | PRIMARY (pattern-match and redact in responses) | N/A | BACKUP (full response inspection) | PII in agent responses not redacted — data leak to user/downstream |
| **G-OUTPUT-2** | URL generation rules (allowlist) | PRIMARY (emit URL allowlist) | ADVISORY (agent told domain restrictions) | N/A | PRIMARY (validate URLs in responses) | N/A | BACKUP | Agent can generate exfiltration URLs (link preview attack) |
| **G-OUTPUT-3** | Format validation | PRIMARY (emit format rules) | ADVISORY | N/A | BACKUP (validate response format) | N/A | N/A | Agent output in unexpected format — downstream parsers may mishandle |
| **G-OUTPUT-4** | Chain validation (output matches expected pattern) | PRIMARY (emit chain rules) | ADVISORY | N/A | BACKUP | N/A | N/A | Output chain not validated — cascading hallucination possible |
| **G-BOUND-1** | Step limits (max reasoning steps) | PRIMARY (emit limits in compiled config) | ADVISORY (agent told step limit) | PRIMARY (enforce per-call count) | BACKUP (redundant count) | N/A | BACKUP | Agent may enter reasoning loop — unbounded token consumption |
| **G-BOUND-2** | Tool call limits per turn | PRIMARY (emit limits) | ADVISORY (agent told call limit) | PRIMARY (enforce count) | BACKUP | N/A | BACKUP | Unbounded tool calls possible |
| **G-BOUND-3** | Budget caps (token/cost limits) | PRIMARY (emit budget in config) | ADVISORY (agent told budget) | BACKUP (approximate from call count) | BACKUP | N/A | PRIMARY (precise token counting at proxy level) | Budget not enforced — runaway costs |
| **G-BOUND-4** | A2A recursion depth limit | PRIMARY (emit depth limit) | ADVISORY | N/A | PRIMARY (enforce chain depth) | N/A | BACKUP | Recursive A2A chains — cascading failures |

### Layer 4: Elicitation Rules (G-ELICIT-*)

| Rule | Description | Compile-time (glint pinch) | L1 Skill | L2 Hook | L3 Plugin | L4 Exec | L5 Sidecar | Fallback if runtime fails |
|------|-------------|---------------------------|----------|---------|-----------|---------|------------|--------------------------|
| **G-ELICIT** | OBO actions require human approval | PRIMARY (validate elicitation policy completeness) | ADVISORY (agent told to stop and ask) | PRIMARY (R5 tool → deny → await approval) | BACKUP (deny R5 delegation via A2A) | PRIMARY (ask mode for R5 tools in exec-approvals) | BACKUP | **FAIL-CLOSED.** R5 tools denied on any error. This is non-negotiable. |
| **G-ELICIT-TIMEOUT** | Deny-default on approval timeout | PRIMARY (validate denyDefault=true in config) | ADVISORY (agent told timeout = deny) | PRIMARY (enforce timeout behavior) | BACKUP | PRIMARY (exec-approvals timeout config) | BACKUP | **FAIL-CLOSED.** Timeout always denies. |
| **G-ELICIT-CHAIN** | No transitive OBO delegation | PRIMARY (validate chain policy) | ADVISORY (agent told no delegation of OBO) | BACKUP (can block delegation tool calls) | PRIMARY (enforce in A2A event handler) | N/A | BACKUP | OBO delegation possible through agent chain — transitive impersonation |
| **G-ELICIT-AUDIT** | All approval decisions recorded | PRIMARY (validate audit config) | N/A | PRIMARY (append to audit chain on every decision) | BACKUP (A2A approval decisions logged) | N/A | BACKUP (full request logging) | Approval decisions not recorded — compliance gap |

### Layer 5: Supply Chain Rules (G-SUPPLY)

| Rule | Description | Compile-time (glint pinch) | L1 Skill | L2 Hook | L3 Plugin | L4 Exec | L5 Sidecar | Fallback if runtime fails |
|------|-------------|---------------------------|----------|---------|-----------|---------|------------|--------------------------|
| **G-SUPPLY** | Skill signing + malicious scanning | PRIMARY (scan on install, verify signatures) | N/A | N/A | BACKUP (verify skill integrity on load) | N/A | N/A | Malicious skill installed — compile-time scanning is the main defense |

---

## Coverage Analysis

### Fully Enforced (compile-time + runtime)

Rules that have BOTH compile-time detection AND runtime prevention:

| Rule | Compile-time | Runtime | Notes |
|------|-------------|---------|-------|
| G-CLASS | Classification validated | Hook enforces per-call | Complete coverage |
| G-PERM | Permissions validated | Hook enforces per-call | Complete coverage |
| G-ELICIT | Policy completeness | Hook + exec enforce gate | Complete coverage |
| G-ELICIT-TIMEOUT | denyDefault validated | Hook enforces timeout | Complete coverage |
| G-ELICIT-AUDIT | Audit config validated | Hook + plugin log decisions | Complete coverage |
| G-A2A-TRUST | Trust groups validated | Plugin enforces per-message | Complete coverage |
| G-A2A-IDENTITY | Identity config validated | Plugin verifies per-message | Complete coverage |
| G-A2A-FLOW | Label coverage validated | Plugin enforces per-channel | Complete coverage |
| G-A2A-ESCALATE | Transitive chains detected | Plugin enforces depth limit | Complete coverage |
| G-A2A-DELEGATE | Delegation scope validated | Plugin enforces ceiling | Complete coverage |
| G-BOUND-1 | Limits emitted | Hook enforces count | Complete coverage |
| G-BOUND-2 | Limits emitted | Hook enforces count | Complete coverage |
| G-BOUND-4 | Depth limit emitted | Plugin enforces depth | Complete coverage |
| G-OUTPUT-1 | Redaction rules emitted | Plugin redacts in responses | Complete coverage |
| G-OUTPUT-2 | URL allowlist emitted | Plugin validates URLs | Complete coverage |
| G-INPUT-3 | Sanitization stubs emitted | Plugin sanitizes on ingest | Complete coverage |
| G-INPUT-4 | URL allowlist emitted | Plugin validates inbound URLs | Complete coverage |
| G-SUPPLY | Scan on install | Plugin verifies on load | Complete coverage |

**18 of 26 rules are fully enforced** (compile-time detection + runtime prevention).

### Compile-only

Rules that can only be checked at compile time (no runtime enforcement point exists):

| Rule | Why no runtime | Risk |
|------|---------------|------|
| G-CONTEXT-1 (boundary markers) | Markers emitted at compile time; runtime can't re-inject them | Low — markers are structural |
| G-CONTEXT-4 (skill isolation) | Skill loading is a startup operation, not a per-call event | Low — detected at compile time |
| G-OUTPUT-3 (format validation) | Complex format validation is model-dependent | Low — advisory is sufficient |
| G-OUTPUT-4 (chain validation) | Output chain analysis requires cross-turn state | Medium — cascading hallucination defense is limited |
| G-ELICIT-CHAIN (partial) | Compile-time catches policy; runtime plugin is backup for A2A but can't prevent agent-internal chain | Low — primary defense is policy + plugin |

**5 rules are primarily compile-only** (runtime enforcement is advisory or backup at best).

### Runtime-only

Rules that can only be enforced at runtime (can't be detected at compile time):

| Rule | Why no compile-time | Risk |
|------|-------------------|------|
| G-DATA (content detection) | Data sensitivity of CONTENT (not tools) can only be detected at runtime when the content is available | Medium — compile-time labels tools but can't detect content |
| G-INPUT-1 (system prompt isolation at runtime) | Compile-time validates structure, but runtime injection overwrites it dynamically | High — the injection happens at runtime |
| G-INPUT-2 (trust labeling at runtime) | Labels on dynamic input can only be applied when input arrives | Medium — structural labels are compile-time, but content labels are runtime |
| G-BOUND-3 (budget caps) | Token consumption can only be measured at runtime | Medium — compile-time emits the cap, but only runtime counts actual usage |
| G-CONTEXT-2 (tool output isolation) | Tool output is generated at runtime; compile-time can only emit the markers | High — primary injection vector via tool output |
| G-CONTEXT-3 (memory isolation) | Memory content is dynamic; compile-time emits markers but runtime must enforce | Medium — memory poisoning vector |

**6 rules have a significant runtime-only component** (compile-time provides structure but runtime does the actual enforcement).

### Gaps

Rules with no enforcement at any layer:

| Gap | Description | Why it's a gap | Mitigation |
|-----|-------------|---------------|------------|
| **Agent-internal reasoning** | No layer can inspect or control the agent's chain-of-thought | Agent reasoning is opaque to all external enforcement | G-BOUND limits cap damage; ADVISORY skill instructions guide reasoning |
| **Client-side rendering** | No layer controls what the chat client does with responses (e.g., auto-executing JS, link previews) | Client is outside the Gateway/sidecar boundary | G-OUTPUT-2 blocks dangerous URLs; platform-specific client security is out of scope |
| **Direct MCP bypass** | If a tool server is accessed directly (not through Gateway), no runtime enforcement | Network-level bypass; requires firewall/network policy | Layer 5 sidecar can prevent direct access; network ACLs as infrastructure defense |
| **Model-level attacks** | Attacks on the underlying LLM (adversarial inputs that exploit model behavior) | LLM behavior is not governable at the rule level | G-INPUT-3 reduces surface; model provider security is the primary defense |

**4 gaps exist** where no enforcement layer can operate. All are at the boundaries of what governance tooling can control (agent internals, client rendering, network bypass, model behavior).

---

## Fail-Mode Policy

### Design Principle

The fail-mode policy follows a simple rule: **the higher the risk, the more fail-closed the default.**

### Risk-Based Fail Mode Matrix

| Risk level | Example tools | On hook error | On plugin error | On exec error | On sidecar error | Rationale |
|-----------|---------------|---------------|-----------------|---------------|-------------------|-----------|
| **R1** (observe) | list_files, get_status | **FAIL-OPEN** | **FAIL-OPEN** | **FAIL-OPEN** | **FAIL-OPEN** | Read-only observation. Blocking breaks UX for zero security benefit. |
| **R2** (read) | read_file, web_search | **FAIL-OPEN** | **FAIL-OPEN** | **FAIL-OPEN** | **FAIL-OPEN** | Read access. Data labels may not be enforced, but the read itself is low-risk. |
| **R3** (write) | write_file, update_record | **CONFIGURABLE** (default: closed) | **CONFIGURABLE** | **CONFIGURABLE** | **CONFIGURABLE** | Write operations are risky. Enterprise policy decides: some prefer availability, some prefer safety. |
| **R4** (execute) | execute_command, run_script | **CONFIGURABLE** (default: closed) | **FAIL-CLOSED** | **CONFIGURABLE** | **FAIL-CLOSED** | Execution is dangerous. Default to deny unless the operator has explicitly chosen availability. |
| **R5** (OBO/transact) | send_email, post_message, pay | **FAIL-CLOSED** | **FAIL-CLOSED** | **FAIL-CLOSED** | **FAIL-CLOSED** | **NON-NEGOTIABLE.** Acting as the user without governance is impersonation. Always deny on error. |

### Configuration in `glint.json`

```json
{
  "runtime": {
    "failMode": {
      "R1": "open",
      "R2": "open",
      "R3": "closed",
      "R4": "closed",
      "R5": "closed"
    },
    "failModeOverride": {
      "R5": "LOCKED"
    }
  }
}
```

The `LOCKED` value means the fail-mode for R5 **cannot be changed** -- even an admin cannot set R5 to fail-open. This is a hard-coded safety constraint:

> **R5 fail-mode is always closed. This is not configurable. The governance compiler refuses to emit a policy with R5 fail-open.**

`glint pinch` validates this:
```
ERROR: R5 fail-mode must be "closed" (found "open"). OBO tools MUST
       fail-closed on governance error. This prevents impersonation when
       enforcement is unavailable. [G-ELICIT, P-029]
```

### Failure Scenarios

#### Scenario 1: Hook handler crashes on R2 tool call

```
Agent calls web_search → Hook handler throws exception
→ R2 fail-mode: OPEN
→ Tool call proceeds without governance
→ Audit entry logged: "HOOK_ERROR, failMode=open"
→ User impact: None (search works as expected)
→ Security impact: Low (read-only operation, audit logging lost for this call)
```

#### Scenario 2: Hook handler crashes on R5 tool call

```
Agent calls send_email → Hook handler throws exception
→ R5 fail-mode: CLOSED (non-negotiable)
→ Tool call DENIED
→ Audit entry logged: "HOOK_ERROR, failMode=closed, action=DENY"
→ User impact: Email not sent (agent reports governance error)
→ Security impact: Zero (impersonation prevented)
```

#### Scenario 3: Gateway plugin not loaded, A2A message arrives

```
Agent A sends message to Agent B → Plugin not loaded (missing file)
→ Plugin fail-mode: CLOSED for A2A
→ A2A message BLOCKED (default-deny without governance)
→ Audit: Plugin not available for A2A enforcement
→ User impact: Inter-agent communication fails
→ Security impact: Zero (lateral movement prevented by fail-closed default)
```

#### Scenario 4: Sidecar process crashes

```
Client sends request → Sidecar not responding
→ Network config determines behavior:
  - fail-closed (recommended): Request never reaches Gateway, client sees error
  - fail-open (HA mode): Request routes directly to Gateway, bypasses sidecar
→ Layers 2-4 still enforce at Gateway level
→ Security impact: Sidecar-specific checks lost (forensic logging, network-level enforcement)
```

#### Scenario 5: All runtime layers fail (total governance loss)

```
Skill not loaded + Hook handler missing + Plugin not registered + Exec file corrupted
→ Only compile-time governance remains (glint pinch validated the configuration)
→ Agent runs ungoverned at runtime
→ Detection: glint drift detects governance file absence on next scan
→ Recovery: glint init --reinstall rewires all 4 layers
→ This is why Layer 5 (sidecar) exists — it's a separate process that survives
  total Gateway-level governance loss
```

---

## Defense-in-Depth Diagram

```
                    ┌─────────────────────────────────────────┐
                    │           COMPILE TIME                   │
                    │  glint pinch (all 26 rules validated)   │
                    │  FE1-FE6 fence passes                    │
                    │  → classification.json, policy.json,     │
                    │    a2a-trust.json, guard stubs            │
                    └──────────────────┬──────────────────────┘
                                       │
          ┌────────────────────────────┼────────────────────────────┐
          │                            │                            │
          ▼                            ▼                            ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────────┐
│  L5: SIDECAR     │    │  L3: PLUGIN      │    │  L1: SKILL           │
│  ─────────────── │    │  ─────────────── │    │  ──────────────────  │
│  All rules       │    │  G-A2A-*         │    │  All rules           │
│  (independent)   │    │  G-OUTPUT        │    │  (advisory only)     │
│  Network-level   │    │  G-INPUT         │    │  Agent self-governs  │
│  Survives GW     │    │  G-CONTEXT       │    │  Weakest layer       │
│  compromise      │    │  All GW events   │    │                      │
└──────────────────┘    └──────────────────┘    └──────────────────────┘
          │                            │
          │             ┌──────────────┤
          │             │              │
          ▼             ▼              ▼
┌──────────────────┐    ┌──────────────────────┐
│  L2: HOOK        │    │  L4: EXEC APPROVALS  │
│  ─────────────── │    │  ──────────────────  │
│  G-CLASS         │    │  G-ELICIT (backup)   │
│  G-ELICIT        │    │  G-CLASS (backup)    │
│  G-BOUND         │    │  Host-level          │
│  G-PERM          │    │  Static allowlist    │
│  Per-tool-call   │    │                      │
│  PRIMARY for     │    │                      │
│  tool governance │    │                      │
└──────────────────┘    └──────────────────────┘
          │                            │
          └────────────┬───────────────┘
                       ▼
               ┌───────────────┐
               │  Agent → Tool │
               │    → Effect   │
               └───────────────┘
```

---

## Rule Enforcement Summary

| Category | Total rules | Fully enforced (compile + runtime) | Compile-only | Runtime-heavy | Advisory gap |
|----------|------------|-----------------------------------|-------------|--------------|-------------|
| Classification (G-CLASS, G-PERM, G-DATA) | 3 | 2 | 0 | 1 (G-DATA content) | 0 |
| A2A (G-A2A-*) | 5 | 5 | 0 | 0 | 0 |
| Input (G-INPUT-*) | 4 | 2 | 0 | 2 (injection is runtime) | 0 |
| Context (G-CONTEXT-*) | 4 | 0 | 2 | 2 (output/memory isolation) | 0 |
| Output (G-OUTPUT-*) | 4 | 2 | 2 | 0 | 0 |
| Bounds (G-BOUND-*) | 4 | 3 | 0 | 1 (budget caps) | 0 |
| Elicitation (G-ELICIT-*) | 4 | 4 | 0 | 0 | 0 |
| Supply (G-SUPPLY) | 1 | 1 | 0 | 0 | 0 |
| **Total** | **29** | **19** (66%) | **4** (14%) | **6** (21%) | **0** |

**Zero rules have ONLY advisory enforcement.** Every rule has at least compile-time validation. 19 of 29 have full compile-time + runtime enforcement. The 6 runtime-heavy rules (injection, isolation, budget counting) are inherently runtime problems where compile-time provides structural defense but can't prevent all attacks.

---

## Recommendations

### 1. Layer 2 (Hook) is the minimum viable runtime deployment

For teams that can't deploy a full Gateway plugin, the before_tool_call hook alone covers:
- G-CLASS (tool classification)
- G-ELICIT (OBO approval gates)
- G-BOUND (step/tool limits)
- G-PERM (capability check)

This is 4 of the most impactful rules with a single file and one config change. The hook is the "80/20" of runtime enforcement.

### 2. Layer 3 (Plugin) is required for A2A governance

If the workspace has multiple agents, the Gateway plugin is mandatory. ALL 5 G-A2A rules are PRIMARY-enforced at the plugin level with no alternative. Without the plugin, A2A governance is advisory-only.

### 3. Layer 5 (Sidecar) addresses the trust boundary problem

Layers 2-4 all run inside the Gateway process. If the Gateway is compromised (CVE-2026-25253), all three layers are bypassed. The sidecar is the only defense against Gateway compromise. For enterprise deployments handling CONFIDENTIAL or RESTRICTED data, the sidecar is not optional.

### 4. R5 fail-closed is the single most important runtime decision

The `G-ELICIT` enforcement chain (R5 → deny → await approval → deny-default on timeout) must be fail-closed at every layer. This is the one rule where there is zero ambiguity: impersonation tools must never execute without human approval, even when enforcement is degraded.
