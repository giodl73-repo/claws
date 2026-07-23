# Trace: Runtime Enforcement

> Covers: `atom:governance-plugin`, `atom:defense-in-depth`, `atom:fail-mode`

How the governance plugin intercepts tool calls, how the five defense layers operate, and how failures are handled.

---

## Plugin Hook Trace

When an agent invokes a tool, the governance plugin intercepts via `before_tool_call`:

```
  Agent decides to call: send-email(to: "user@example.com", body: "...")
       │
       ▼
  [L1: SKILL.md advisory]     → agent already read "require user confirmation for email"
       │                          (advisory only — agent may or may not have followed it)
       ▼
  [L2: before_tool_call hook]
       │
       ├── [G-CLASS] Classify tool
       │     send-email → R5 (Transact)
       │     < 50ms budget check: 8ms ✓
       │
       ├── [G-ELICIT] Check elicitation gate
       │     R5 requires user confirmation
       │     Has user confirmed? NO
       │     → BLOCK: return { action: "deny", reason: "elicitation-required" }
       │
       │   ─── User confirms via CLI prompt ───
       │
       ├── [G-ELICIT] Re-check
       │     Has user confirmed? YES
       │     → CONTINUE
       │
       ├── [G-BOUND] Check budget
       │     Token budget: 8,500 / 10,000 remaining
       │     → CONTINUE
       │
       └── [G-PERM] Check permissions
             OBO check: agent authorized to send on behalf of user? YES
             → ALLOW
       │
       ▼
  [L3: Lifecycle hooks]
       │   No lifecycle event for this tool call
       │   (lifecycle hooks fire on subagent_spawning, llm_output, etc.)
       ▼
  [L4: exec-approvals.json]
       │   send-email in allowlist? YES
       │   → ALLOW (backup confirmation)
       ▼
  Tool executes: send-email(to: "user@example.com", body: "...")
       │
       ▼
  [Audit] CGR emitted: TOOL-CALL, tool: send-email, classification: R5,
          elicitation: confirmed, budget: 8500/10000
```

---

## Layer Interaction During A2A Delegation

```
  Agent A spawns Agent B to handle a subtask
       │
       ▼
  [L3: subagent_spawning hook]
       │   Check delegation graph (AGENTS.md → GovernanceIR)
       │   Agent A (R3 ceiling) → Agent B (R4 ceiling)?
       │   BLOCKED: privilege escalation detected
       │   Diagnostic: G-A2A-ESCALATION
       │   → Agent B spawn rejected
       │
       ▼
  Agent A spawns Agent C to handle the subtask
       │
       ▼
  [L3: subagent_spawning hook]
       │   Agent A (R3 ceiling) → Agent C (R2 ceiling)?
       │   ALLOWED: no escalation
       │   Effective restrictions: A's deny rules propagate to C
       │   → Agent C spawned with merged restrictions
```

---

## Fail Mode Handling

When a governance handler crashes:

```
  before_tool_call handler throws: TypeError (bug in classification logic)
       │
       ▼
  [Gateway error handler]
       │   Catch error, log stack trace
       │   Increment per-handler failure counter
       │
       ├── Counter < 3?  → DEFAULT DENY (fail-closed)
       │                     Tool call blocked, agent receives error message
       │                     Diagnostic: GOV-HANDLER-FAIL
       │
       └── Counter >= 3? → PERSISTENT FAILURE detected
              │
              ├── [Sidecar alert] → SIEM notification
              ├── [Recovery mode] → handler disabled for this tool
              │                      all calls to this tool → DEFAULT DENY
              └── [Operator action required]
                     claws doctor --recover --tool <name>
```

Key failure modes:

- **Single crash**: fail-closed (deny), retry next call
- **Persistent crash** (3+ in 60s): alert, disable handler, require operator recovery
- **Stack overflow** (RangeError): systemic — escalate immediately
- **Handler unregistration**: sidecar detects within 60s via presence check

---

## Related

- [Defense in Depth](../concepts/defense-in-depth.md) -- the 5-layer model
- [Fail Mode](../concepts/fail-mode.md) -- failure handling patterns
- [Governance Plugin](../concepts/governance-plugin.md) -- plugin architecture
- [Tool Classification](../concepts/tool-classification.md) -- R1-R5 levels
