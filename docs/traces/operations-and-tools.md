# Trace: Tool Classification, OBO Boundary, and Elicitation

> Covers: `atom:tool-classification`, `atom:obo-boundary`, `atom:elicitation-gate`

How tools are classified, how on-behalf-of boundaries are enforced, and how human confirmation gates work at runtime.

---

## Tool Classification Pipeline

```
  TOOLS.md declaration:
    - name: send-email
      description: "Send email via Outlook API"
      capabilities: [write-external, impersonate-user]
       │
       ▼
  [Capability Analysis]
       │   Examine declared capabilities
       │   write-external → minimum R3
       │   impersonate-user → minimum R5
       │   Maximum wins: R5
       ▼
  [OBO Detection]
       │   Does this tool act as the user externally?
       │   impersonate-user capability → YES
       │   Flag: OBO tool (requires USER.md authorization)
       ▼
  [Classification Record]
       │   tool: send-email
       │   level: R5 (Transact)
       │   obo: true
       │   governance: audit + confirmation + sandbox + elicitation gate
       ▼
  [Stored in GovernanceIR.tools[]]
```

Classification is per-tool, per-capability. The system examines what the tool CAN do, not what it is INTENDED to do. A tool with `execute` capability gets R4 even if the author says "it only runs safe commands."

---

## OBO Boundary Trace

When an agent uses a tool that acts on behalf of the user:

```
  Agent calls: send-email(to: "alice@contoso.com", body: "Meeting at 3pm")
       │
       ▼
  [L2: before_tool_call]
       │
       ├── [G-CLASS] Classification: R5, OBO: true
       │
       ├── [OBO Check]
       │     Read USER.md authority grants from GovernanceIR
       │     Agent authorized for "email" scope? 
       │
       │     ├── YES: continue to elicitation
       │     │
       │     └── NO: → BLOCK
       │              Diagnostic: G-OBO-UNAUTHORIZED
       │              "Agent is not authorized to send email on behalf of user.
       │               Grant: add 'email' to USER.md authority.scope"
       │
       ├── [G-ELICIT] Elicitation gate (required for all R5 + OBO)
       │     Present to user:
       │     "Agent wants to send email to alice@contoso.com: 'Meeting at 3pm'"
       │     [Approve] [Deny] [Edit]
       │
       │     ├── User approves → CONTINUE
       │     ├── User edits → re-submit with changes
       │     └── User denies → BLOCK, emit G-ELICIT-DENIED
       │
       ▼
  Tool executes with user's identity context
       │
       ▼
  [Audit] CGR: TOOL-CALL, tool: send-email, R5, OBO: true,
          authority: email, elicitation: approved-by-user,
          impersonating: user@contoso.com
```

---

## Elicitation Gate Detail

The elicitation gate is the human-in-the-loop mechanism for sensitive actions:

```
  Gate triggers (any of):
  ├── Tool classified R5 (Transact)
  ├── SOUL.md has `elicit` directive for this tool
  ├── Action crosses OBO boundary
  └── Budget threshold exceeded (configurable)
       │
       ▼
  [Build Confirmation Prompt]
       │   What: describe the action in user terms
       │   Why: explain why confirmation is needed
       │   Risk: show the tool's R-level and OBO status
       │   Context: show relevant SOUL.md directive
       ▼
  [Present to User]
       │   CLI: interactive prompt with [Approve] [Deny] [Edit]
       │   TUI: modal dialog with action detail
       │   API: webhook to external approval system
       ▼
  [Record Decision]
       │   CGR: G-ELICIT event with decision, timestamp, user identity
       │   Cache: if "always approve for this tool" → skip gate for session
       ▼
  [Apply Decision]
       ├── Approve → tool call proceeds
       ├── Deny → tool call blocked, agent receives denial reason
       └── Edit → agent receives modified parameters, re-submits
```

The gate is synchronous -- the tool call blocks until the user responds. There is no timeout (the user controls when to respond). The agent can continue other work while waiting if the workflow supports parallel task execution.

---

## Related

- [Tool Classification](../concepts/tool-classification.md) -- R1-R5 model
- [OBO Boundary](../concepts/obo-boundary.md) -- on-behalf-of trust model
- [Elicitation Gate](../concepts/elicitation-gate.md) -- gate architecture
- [Defense in Depth](../concepts/defense-in-depth.md) -- where gates sit in the layer model
