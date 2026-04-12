# Experiment e: Elicitation and OBO Governance

**Method**: design analysis + scenario modeling
**Date**: 2026-04-11

> **Core principle**: Anything that acts AS the user (not just FOR the user) needs explicit human approval. "Any impersonation tool call is dangerous" -- send-mail-as-user, post-as-user, transact-as-user all need human approval gates.

---

## 1. The OBO Boundary

OBO ("On Behalf Of") is the line between an agent acting as a tool and an agent impersonating the user. The distinction is identity: does the downstream system see the agent's action as coming from the USER?

### The Test

> "Would a reasonable person expect to be asked before this happens?"

If the action creates an external commitment, transfers authority, expends resources, or communicates identity -- the answer is yes.

### Classification Matrix

| Action | Category | Gate? | Reasoning |
|--------|----------|-------|-----------|
| Read email | FOR the user | No | Agent is a tool reading data; no external effect |
| Search web | FOR the user | No | No identity commitment; read-only |
| Summarize document | FOR the user | No | Internal processing; no external effect |
| Draft response | FOR the user | No | Draft is not sent; user still decides |
| Query database (read) | FOR the user | No | Read-only; no state change |
| Generate report | FOR the user | No | Internal artifact; user reviews before sharing |
| **Send email** | **AS the user** | **Yes** | Recipient sees it as FROM the user |
| **Post to Slack/Teams** | **AS the user** | **Yes** | Team sees it as the user's statement |
| **Make payment** | **AS the user** | **Yes** | Financial commitment under user's identity |
| **Sign document** | **AS the user** | **Yes** | Legal commitment under user's identity |
| **Delete data** | **AS the user** | **Yes** | Irreversible state change under user's authority |
| **Call external API with user credentials** | **AS the user** | **Yes** | External system sees user's identity |
| **Create/modify calendar event** | **AS the user** | **Yes** | Commits user's time; visible to others |
| **Approve/reject workflow item** | **AS the user** | **Yes** | Exercises user's authority in a business process |
| **Post to social media** | **AS the user** | **Yes** | Public identity statement |
| **Commit to git repo** | Edge case | Configurable | Some orgs treat as AS-user (signed commits); others as tooling |
| **File support ticket** | Edge case | Configurable | Creates external record attributed to user |

### Edge Cases: The Configurable Zone

Some actions sit on the boundary. Whether they require a gate depends on organizational policy:

- **Git commits**: If the org uses signed commits with identity attribution, this is AS-user. If commits are from a bot account, it's FOR-user.
- **Internal API calls**: If the API uses the user's credentials, it's AS-user. If the agent has its own service account, it's FOR-user.
- **Draft-then-send workflows**: Drafting is FOR-user. Sending is AS-user. The gate goes on the send, not the draft.

glint handles this with configurable classification: each tool is marked as `for-user`, `as-user`, or `configurable` in the tool manifest. `configurable` tools require an explicit policy decision in `glint.json`.

---

## 2. Elicitation Policy Schema

The elicitation policy in `glint.json` declares which tools require approval, how approval is obtained, and what happens when no response is received.

```jsonc
{
  "elicitation": {
    // Tools that require human approval before execution.
    // Supports exact names and glob patterns.
    "requireApproval": [
      "send-email",
      "post-message",
      "delete-*",
      "payment-*",
      "external-api",
      "sign-document",
      "calendar-modify",
      "workflow-approve"
    ],

    // How approval is obtained.
    // "inline": agent pauses, user approves in chat
    // "async": notification sent, agent waits (with timeout)
    // "pre-approved": allowlist of specific actions approved in advance
    "approvalMode": "inline",

    // Seconds to wait for approval before deny-default triggers.
    // Only applies to "async" mode. Inline mode blocks indefinitely
    // (agent is paused). Pre-approved mode has no timeout.
    "timeout": 300,

    // If true, unapproved tools are denied by default.
    // If false, unapproved tools are allowed (NOT RECOMMENDED).
    "denyDefault": true,

    // If true, every approval/denial/timeout is recorded in the
    // audit chain via glint audit.
    "auditAllDecisions": true,

    // Pre-approved actions (only used when approvalMode includes
    // "pre-approved" for specific tools).
    "preApproved": {
      // Each entry: tool name -> conditions under which pre-approval applies.
      "send-email": {
        "allowedRecipients": ["team@company.com", "*.company.com"],
        "maxPerSession": 5,
        "expiresAt": "2026-05-01T00:00:00Z"
      },
      "calendar-modify": {
        "allowedCalendars": ["personal"],
        "maxPerSession": 3,
        "expiresAt": "2026-05-01T00:00:00Z"
      }
    },

    // Escalation policy for high-stakes actions.
    "escalation": {
      // Tools that require escalated approval (e.g., manager approval
      // in addition to user approval).
      "requireEscalation": ["payment-*", "sign-document"],

      // Who can approve escalated actions.
      "escalationApprovers": ["manager", "security-team"],

      // Timeout for escalation approval (seconds).
      "escalationTimeout": 600,

      // If escalation times out, deny the action.
      "escalationDenyDefault": true
    },

    // Per-tool overrides. These override the top-level settings
    // for specific tools.
    "overrides": {
      "send-email": {
        "approvalMode": "pre-approved",
        "fallback": "inline"
      },
      "payment-process": {
        "approvalMode": "inline",
        "requireEscalation": true,
        "maxAmount": 1000.00,
        "currency": "USD"
      }
    }
  }
}
```

### Schema Validation Rules

`glint pinch` validates the elicitation schema:

| Check | Diagnostic |
|-------|-----------|
| Every tool marked `as-user` in manifest has an entry in `requireApproval` | `G-ELICIT-MISSING: tool "{tool}" is OBO but has no elicitation policy` |
| `denyDefault` is `true` | `G-ELICIT-PERMISSIVE: denyDefault is false -- unapproved OBO tools will execute without gates` |
| `timeout` is > 0 for async mode | `G-ELICIT-NO-TIMEOUT: async approval with no timeout allows indefinite agent stall` |
| `preApproved` entries have `expiresAt` | `G-ELICIT-UNBOUNDED-PREAPPROVAL: pre-approved action "{tool}" has no expiration` |
| `escalation.requireEscalation` tools are a subset of `requireApproval` | `G-ELICIT-ESCALATION-ORPHAN: tool "{tool}" requires escalation but is not in requireApproval` |
| No tool is both `pre-approved` and `requireEscalation` without explicit override | `G-ELICIT-CONFLICT: tool "{tool}" is pre-approved and requires escalation` |

---

## 3. Approval Flow Design

### 3.1 Inline Approval

The simplest flow. The agent pauses and asks the user directly in the chat interface.

```
Agent: I'd like to send an email on your behalf.
       To: alice@partner.com
       Subject: Q3 Revenue Projections
       Body: [previewed below]

       [Approve] [Deny] [Edit before sending]
```

**Characteristics**:
- Agent is blocked until user responds
- No timeout (user is actively in the session)
- Lowest latency (user is present)
- Best for interactive sessions where the user is actively monitoring

**Implementation**: The agent emits an `elicitation-request` event. The runtime pauses tool execution and presents the approval UI. The user's decision is captured as an `elicitation-response` event. Both events are recorded in the audit chain.

### 3.2 Async Approval

For background agents or long-running tasks where the user is not actively monitoring.

```
Notification (email/Slack/Teams):
  Agent "finance-bot" requests approval:
  Action: Process payment of $450.00 to vendor XYZ
  Deadline: 5 minutes (deny-default at timeout)
  [Approve] [Deny]
```

**Characteristics**:
- Agent continues non-OBO work while waiting (does not block entirely)
- Timeout with deny-default (G-ELICIT-TIMEOUT)
- Higher latency (notification delivery + user response time)
- Best for batch processing, background automation, scheduled tasks

**Implementation**: The agent emits an `elicitation-request` event with a `channel` field (email, Slack, Teams). The runtime dispatches a notification. A background timer starts. If the user responds, the `elicitation-response` event resumes tool execution. If the timer expires, a `elicitation-timeout` event is emitted and the action is denied.

### 3.3 Pre-Approved

For repetitive, low-risk OBO actions that the user has explicitly approved in advance.

```json
"preApproved": {
  "send-email": {
    "allowedRecipients": ["team@company.com"],
    "maxPerSession": 5,
    "expiresAt": "2026-05-01T00:00:00Z"
  }
}
```

**Characteristics**:
- No runtime approval needed (action proceeds immediately)
- Bounded by conditions: recipient allowlist, per-session limit, expiration
- Logged but not gated (audit record, no pause)
- Best for trusted workflows with predictable, constrained OBO actions

**Implementation**: Before executing, the runtime checks the pre-approval conditions. If all conditions are met, the action proceeds and an `elicitation-preapproved` event is recorded. If any condition fails (wrong recipient, limit exceeded, expired), the flow falls back to the `fallback` mode (inline or async).

### 3.4 Deny-Default (G-ELICIT-TIMEOUT)

The critical safety property: if no response is received within the timeout, the action is DENIED. Never approved.

**Rationale**: The alternative (approve-on-timeout) creates a vulnerability: an attacker can trigger an OBO action and rely on the user being away to auto-approve it. Deny-default means inaction is safe.

```
Timeline:
  t=0:   Agent requests approval (async)
  t=0:   Notification sent to user
  t=120: User has not responded
  t=300: Timeout reached → action DENIED
  t=300: elicitation-timeout event recorded
  t=300: Agent notified: "Approval for send-email timed out. Action denied."
```

### 3.5 Audit Trail

Every elicitation decision is recorded in the audit chain via `glint audit`:

```jsonc
{
  "event": "elicitation-response",
  "timestamp": "2026-04-11T14:32:00Z",
  "agent": "email-assistant",
  "tool": "send-email",
  "action": {
    "to": "alice@partner.com",
    "subject": "Q3 Revenue Projections"
  },
  "decision": "approved",        // "approved" | "denied" | "timeout" | "preapproved"
  "decidedBy": "user:giodl",     // human identity, NEVER an agent identity
  "mode": "inline",
  "latencyMs": 4200,
  "sessionId": "sess-abc123"
}
```

Audit records are immutable (append-only). They feed into SIEM integration for compliance reporting. Every OBO action has a traceable chain: request -> decision -> execution (or denial).

---

## 4. OBO Delegation Chain

### The Problem

Agent A asks Agent B to send an email. Who approves?

In a naive implementation, Agent A acts as the "user" for Agent B. This is a critical vulnerability: if Agent A is compromised (via injection), it can approve its own OBO actions by delegating to Agent B and pretending to be the approver.

### The Rule: G-ELICIT-CHAIN

**The ORIGINAL user approves. Never an agent.**

```
User → Agent A → Agent B → send-email
                           ↑
                     Who approves?
                     Answer: User (the ORIGINAL human)
```

The approval request bubbles up through the delegation chain to the human at the top. Agent A cannot approve on behalf of the user.

### Delegation Depth Limit

**OBO actions are limited to 1 delegation hop.** Agent A can ask Agent B to perform an OBO action, but Agent B cannot delegate that OBO action to Agent C.

```
ALLOWED:  User → Agent A → Agent B → send-email (1 hop)
BLOCKED:  User → Agent A → Agent B → Agent C → send-email (2 hops)
```

**Rationale**: Each delegation hop adds opacity. At 1 hop, the user can understand what Agent B is doing. At 2+ hops, the action is too far removed from the user's oversight to be meaningfully approved.

This limit applies ONLY to OBO actions. Non-OBO delegation (Agent A asks Agent B to summarize a document) has its own depth limit (G-BOUND-4) but is not restricted to 1 hop.

### Verification Protocol

When Agent B receives an OBO action request from Agent A, it must verify:

1. **The approval came from a human, not from Agent A.** The approval token must contain a human identity claim that Agent B can verify against the governance config.
2. **The delegation depth is within limits.** The request carries a `delegationDepth` counter. Agent B increments it. If it exceeds the limit, the request is denied.
3. **The approval is for THIS specific action.** The approval token is bound to the specific tool call, parameters, and target. Agent A cannot get a generic "do whatever" approval and pass it to Agent B.

```jsonc
// OBO delegation request from Agent A to Agent B
{
  "action": "send-email",
  "params": {
    "to": "alice@partner.com",
    "subject": "Q3 Revenue Projections",
    "body": "..."
  },
  "delegationChain": ["user:giodl", "agent:assistant-a"],
  "delegationDepth": 1,
  "approval": {
    "token": "eyJ...",           // signed by runtime, NOT by Agent A
    "decidedBy": "user:giodl",   // human identity
    "scope": "send-email:alice@partner.com:Q3 Revenue Projections",
    "expiresAt": "2026-04-11T14:37:00Z"
  }
}
```

Agent B validates the approval token signature (issued by the runtime, not forged by Agent A), checks the scope matches the requested action, and verifies the token hasn't expired.

---

## 5. Governance Rules

### G-ELICIT: OBO Actions Require Human Approval

**What `glint pinch` checks at compile time**:
- Every tool marked `as-user` in the tool manifest has an entry in the elicitation policy
- Tools with no explicit policy default to `deny-all` (compile-time error if the developer hasn't made a conscious choice)
- The elicitation policy exists in `glint.json` and passes schema validation

**Diagnostic**: `G-ELICIT: tool "{tool}" is marked as-user but has no elicitation policy. Add to elicitation.requireApproval or explicitly exempt with justification.`

### G-ELICIT-TIMEOUT: Deny-Default on Timeout

**What `glint pinch` checks at compile time**:
- Async approval modes have a `timeout` > 0
- `denyDefault` is `true` (compile-time warning if `false`)
- Timeout values are within reasonable bounds (configurable; default: 60-3600 seconds)

**Diagnostic**: `G-ELICIT-TIMEOUT: async approval for tool "{tool}" has denyDefault=false. Timeout will auto-APPROVE the action, creating a security vulnerability.`

### G-ELICIT-CHAIN: No Transitive OBO Delegation

**What `glint pinch` checks at compile time**:
- A2A-capable agents that can invoke OBO tools have delegation depth limits declared
- OBO delegation depth limit is <= 1
- The agent manifest declares that OBO approval must come from a human identity (not an agent identity)

**Diagnostic**: `G-ELICIT-CHAIN: agent "{agent}" allows OBO delegation depth > 1. Transitive OBO delegation bypasses human oversight.`

### G-ELICIT-AUDIT: All Decisions Recorded

**What `glint pinch` checks at compile time**:
- `auditAllDecisions` is `true` in the elicitation policy
- The audit chain integration is configured (SIEM endpoint, log format)
- Audit records include all required fields (agent, tool, action, decision, decidedBy, mode, timestamp)

**Diagnostic**: `G-ELICIT-AUDIT: auditAllDecisions is false. OBO decisions will not be recorded, violating compliance requirements.`

---

## 6. Integration with `glint pinch`

At compile time, `glint pinch` performs the following elicitation checks:

### 6.1 Tool Manifest Scan

```
PASS 1: Scan tool manifest for OBO classification
  - For each tool: check if classified as "for-user", "as-user", or "configurable"
  - Flag unclassified tools as errors (not warnings — classification is mandatory)
  - Result: list of OBO tools requiring elicitation policies

PASS 2: Validate elicitation policies
  - For each OBO tool: verify matching entry in elicitation.requireApproval
  - Validate per-tool overrides against schema
  - Check pre-approved entries for expiration and conditions
  - Result: pass/fail per tool

PASS 3: Validate delegation chains
  - For each A2A-capable agent: verify delegation depth limits
  - Check that OBO delegation depth <= 1
  - Verify human-only approval requirement for OBO actions
  - Result: pass/fail per agent

PASS 4: Validate audit integration
  - Check auditAllDecisions flag
  - Verify audit chain configuration
  - Validate audit record schema completeness
  - Result: pass/fail
```

### 6.2 Compile-Time Output

When all checks pass, `glint pinch` emits:

1. **Runtime guard stubs** for each OBO tool:
   ```
   // Generated by glint pinch — do not edit
   beforeToolCall("send-email", async (params, context) => {
     const approval = await elicit({
       tool: "send-email",
       params,
       mode: context.elicitation.overrides["send-email"]?.approvalMode
             ?? context.elicitation.approvalMode,
       timeout: context.elicitation.timeout,
       denyDefault: context.elicitation.denyDefault,
     });
     if (approval.decision !== "approved") {
       throw new OBODeniedError("send-email", approval);
     }
     audit(approval);
   });
   ```

2. **OBO tool registry** listing all tools that require gates, their approval modes, and timeout configurations.

3. **Delegation chain validator** that runtime frameworks use to verify A2A OBO requests.

### 6.3 Default Policy for Missing Configuration

If an OBO-capable tool has no explicit policy:

```
DEFAULT: deny-all
```

The tool is blocked at compile time with an error. The developer MUST make an explicit choice. This prevents the "forgot to configure the gate" failure mode.

---

## 7. Scenarios

### Scenario 1: Agent Sends Email as User (Simple OBO Gate)

**Setup**: A user asks their email assistant agent to reply to a message from Alice.

**Flow**:
```
1. User: "Reply to Alice's email about the Q3 projections. Tell her we're
   on track and attach the latest spreadsheet."

2. Agent drafts the email (FOR-user, no gate):
   - Reads Alice's original email
   - Generates draft reply
   - Attaches spreadsheet

3. Agent attempts to send the email (AS-user, gate triggered):
   - Tool: send-email
   - Classification: as-user
   - Elicitation mode: inline (user is in active session)

4. Approval prompt presented:
   ┌─────────────────────────────────────────────────┐
   │  I'd like to send this email on your behalf:    │
   │                                                 │
   │  To: alice@partner.com                          │
   │  Subject: Re: Q3 Revenue Projections            │
   │  Body: Hi Alice, we're on track for Q3...       │
   │  Attachment: q3-projections-v4.xlsx              │
   │                                                 │
   │  [Approve]  [Deny]  [Edit before sending]       │
   └─────────────────────────────────────────────────┘

5. User approves.

6. Audit record:
   { event: "elicitation-response", tool: "send-email",
     decision: "approved", decidedBy: "user:giodl",
     mode: "inline", latencyMs: 3100 }

7. Email sent.
```

**What glint ensures**: At compile time, `glint pinch` verified that `send-email` has an elicitation policy. Without it, the compile fails. The developer cannot accidentally ship an agent that sends emails without asking.

---

### Scenario 2: Agent A Delegates to Agent B to Post on Slack (A2A + OBO)

**Setup**: A project manager agent (Agent A) coordinates a team update. It delegates the Slack posting to a communications agent (Agent B).

**Flow**:
```
1. User: "Post the weekly status update to #engineering."

2. Agent A (project-manager) prepares the status update (FOR-user):
   - Gathers data from project tracking tools
   - Formats status update

3. Agent A delegates to Agent B (comms-bot) to post on Slack:
   - A2A request: { action: "post-message", channel: "#engineering",
     body: "...", delegationDepth: 1 }

4. Agent B checks OBO classification:
   - Tool: post-message
   - Classification: as-user
   - Delegation depth: 1 (within limit)
   - Approval source: must be human, not Agent A

5. Approval request bubbles up to the ORIGINAL user:
   ┌─────────────────────────────────────────────────┐
   │  Agent "comms-bot" (via "project-manager")      │
   │  wants to post to Slack on your behalf:         │
   │                                                 │
   │  Channel: #engineering                          │
   │  Message: Weekly Status Update - April 11       │
   │           [preview of message body]             │
   │                                                 │
   │  Delegation chain: you → project-manager        │
   │                        → comms-bot              │
   │                                                 │
   │  [Approve]  [Deny]  [Edit before posting]       │
   └─────────────────────────────────────────────────┘

6. User approves.

7. Agent B verifies:
   - Approval token signed by runtime (not Agent A)
   - decidedBy is "user:giodl" (human, not agent)
   - Scope matches: "post-message:#engineering:Weekly Status..."
   - Token not expired

8. Agent B posts to Slack.

9. Audit records (two entries):
   a. { event: "elicitation-request", tool: "post-message",
        requestedBy: "agent:comms-bot", delegatedFrom: "agent:project-manager",
        delegationDepth: 1 }
   b. { event: "elicitation-response", tool: "post-message",
        decision: "approved", decidedBy: "user:giodl",
        delegationChain: ["user:giodl", "agent:project-manager", "agent:comms-bot"] }
```

**What glint ensures**: At compile time, `glint pinch` verified that Agent B's `post-message` tool has an elicitation policy, that the A2A delegation depth is <= 1, and that OBO approval requires a human identity. If Agent A tried to further delegate to Agent C (depth 2), the compile would fail.

**What if Agent A is compromised?** An injection in Agent A could craft a malicious Slack message and delegate to Agent B. But Agent B's elicitation gate still triggers -- the USER sees the malicious message in the approval prompt and can deny it. The injection cannot bypass the human gate.

---

### Scenario 3: Agent Processes Payment with User's Saved Card (High-Stakes OBO with Escalation)

**Setup**: A procurement agent processes a vendor invoice. The payment exceeds the pre-approved threshold and requires escalation.

**Flow**:
```
1. User: "Process the invoice from Acme Corp for $4,500."

2. Agent retrieves invoice details (FOR-user):
   - Reads invoice from document management system
   - Validates invoice against purchase order
   - Calculates tax and total: $4,500.00

3. Agent attempts payment (AS-user, gate triggered):
   - Tool: payment-process
   - Classification: as-user
   - Elicitation mode: inline
   - Escalation required: yes (payment-* in escalation.requireEscalation)
   - Amount: $4,500.00 (exceeds override maxAmount of $1,000.00)

4. First approval: USER approval (inline):
   ┌─────────────────────────────────────────────────┐
   │  Payment requires your approval:                │
   │                                                 │
   │  Vendor: Acme Corp                              │
   │  Invoice: INV-2026-0411                         │
   │  Amount: $4,500.00 USD                          │
   │  Payment method: Corporate card ending 4242     │
   │  PO reference: PO-2026-0389                     │
   │                                                 │
   │  ⚠ Amount exceeds $1,000 threshold.             │
   │  This payment also requires manager approval.   │
   │                                                 │
   │  [Approve & Escalate]  [Deny]                   │
   └─────────────────────────────────────────────────┘

5. User approves. Payment enters escalation queue.

6. Second approval: MANAGER approval (async):
   - Notification sent to manager via configured channel
   - Timeout: 600 seconds (escalationTimeout)
   - Deny-default on timeout

   Notification to manager:
   ┌─────────────────────────────────────────────────┐
   │  Escalated payment approval request:            │
   │                                                 │
   │  Requested by: giodl (via procurement-agent)    │
   │  Vendor: Acme Corp                              │
   │  Amount: $4,500.00 USD                          │
   │  User approved: Yes (2026-04-11T14:35:00Z)     │
   │                                                 │
   │  Deadline: 10 minutes (auto-deny at expiry)     │
   │                                                 │
   │  [Approve]  [Deny]                              │
   └─────────────────────────────────────────────────┘

7a. Manager approves within timeout:
    - Payment processed
    - Audit: two approval records (user + manager)

7b. Manager does NOT respond within 600s:
    - Payment DENIED (deny-default)
    - Audit: user-approved, manager-timeout, action-denied
    - User notified: "Payment denied due to manager approval timeout."

8. Audit chain (full sequence):
   a. { event: "elicitation-request", tool: "payment-process",
        amount: 4500.00, escalationRequired: true }
   b. { event: "elicitation-response", tool: "payment-process",
        decision: "approved", decidedBy: "user:giodl", mode: "inline",
        note: "user-level approval; pending escalation" }
   c. { event: "escalation-request", tool: "payment-process",
        amount: 4500.00, escalatedTo: "manager:jsmith" }
   d. { event: "escalation-response", tool: "payment-process",
        decision: "approved", decidedBy: "manager:jsmith", mode: "async",
        latencyMs: 142000 }
        // OR
   d'. { event: "escalation-timeout", tool: "payment-process",
         decision: "denied", reason: "escalation timeout (600s)",
         escalatedTo: "manager:jsmith" }
   e. { event: "tool-execution", tool: "payment-process",
        result: "success", amount: 4500.00 }
        // OR
   e'. { event: "tool-blocked", tool: "payment-process",
         reason: "escalation denied/timeout" }
```

**What glint ensures**: At compile time, `glint pinch` verified that `payment-process` has both a user-level elicitation policy AND an escalation policy. The `maxAmount` override in `glint.json` triggers escalation for amounts > $1,000. Deny-default on escalation timeout means a missing manager response is safe (payment is denied, not approved). The full audit chain provides compliance evidence.

**What if the agent is compromised?** An injection steers the agent to process a fraudulent payment. The OBO gate requires user approval (the user sees the suspicious invoice details). Even if the user is tricked into approving, the escalation gate requires manager approval. Two independent human checkpoints make injection-to-payment significantly harder than a single gate.

---

## Key Findings

1. **The OBO boundary is a clean, testable line.** "Does the downstream system see this as coming from the user?" is an unambiguous test. Every tool can be classified as FOR-user or AS-user with minimal edge cases. The configurable zone is small and handled by explicit policy.

2. **Deny-default is the single most important safety property.** Approve-on-timeout is an exploitable vulnerability. Deny-on-timeout is always safe. This is non-negotiable for any OBO governance system.

3. **The original human approves, never an agent.** This rule prevents compromised agents from self-approving OBO actions via A2A delegation. It is the fundamental trust anchor for the entire elicitation system.

4. **Delegation depth limit of 1 for OBO actions balances utility and safety.** Deeper delegation chains are too opaque for meaningful human oversight. At 1 hop, the user can see the full chain (me -> Agent A -> Agent B) and make an informed decision.

5. **Compile-time enforcement is the unique glint value.** Other systems (OpenClaw's exec approvals, Claude Code's permission system) enforce OBO gates at runtime only. glint ensures the gates EXIST at compile time. A missing gate is a build error, not a production incident.

6. **Escalation handles the high-stakes tail.** Two-level approval (user + manager) for financial and legal actions provides defense-in-depth against both injection attacks and social engineering. The escalation timeout with deny-default ensures that a missing manager is not a security hole.

7. **The audit chain provides compliance evidence.** Every OBO decision -- approved, denied, timed out, pre-approved -- is recorded with who decided, when, and through what chain. This satisfies SOC 2, HIPAA, and SOX audit trail requirements for agent-mediated actions.

8. **Pre-approved actions are a usability safety valve.** Without pre-approval, high-frequency OBO actions (sending emails to known teammates) would create approval fatigue. Pre-approval with expiration, recipient allowlists, and per-session limits provides convenience without abandoning the security model.
