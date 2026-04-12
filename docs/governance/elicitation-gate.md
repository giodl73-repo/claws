# Elicitation Gate

<!-- atom:elicitation-gate (C12) -->

## The short version

An elicitation gate is the mechanism that asks a human for permission before an agent acts on their behalf. When an agent wants to send an email, post a message, or process a payment, the gate presents the action to the user, waits for a response, and either proceeds or blocks. If the user does not respond within the timeout window, the action is denied. The approval is recorded as a signed token that cannot be forged by another agent.

---

## Why elicitation gates exist

Without an approval mechanism, the [OBO boundary](obo-boundary.md) is a concept with no enforcement. The elicitation gate is the enforcement. It ensures that no R5 tool executes without explicit human authorization.

The gate addresses three specific threats from OWASP Agentic Top 10:

| Threat | OWASP # | Gate defense |
|--------|---------|-------------|
| Agent sends email as user without asking | #4 Tool Misuse | Gate blocks execution until human approves |
| Agent A tells Agent B to act as user | #5 Inter-Agent | No transitive OBO -- only original human can approve |
| Timeout defaults to "allow" | #1 Excessive Agency | Timeout always equals denial |

---

## Approval modes

Enterprises operate differently. A developer at a terminal can respond inline. An executive approving a fleet action may need an async notification. A CI pipeline needs pre-approved tool categories. The elicitation gate supports three modes.

| Mode | How it works | When to use |
|------|-------------|-------------|
| **Inline** | Prompt appears in the agent session. User approves or denies in the terminal. | Interactive development, single-user workspaces |
| **Async** | Notification sent to a configured channel (email, Teams, Slack webhook). User responds via link or reply. | Mobile approvals, executive sign-off, off-hours operations |
| **Pre-approved** | Specific tool-action pairs approved in advance via policy. No per-invocation prompt. | CI/CD pipelines, trusted automation with known tool sets |

Pre-approved mode does not eliminate governance. The pre-approval is itself a governed decision: it appears in the audit chain, it references the policy version that authorized it, and it can be revoked. Pre-approval is a standing authorization, not an absence of authorization.

**Pre-approved mode for scheduled tasks**: Scheduled R5 tools (via HEARTBEAT.md) require pre-approved mode because no human is present during scheduled execution. Standing approval for scheduled R5 must have conditions: time-bound (only during scheduled hours), scope-limited (specific tool/action only), and fully audit-logged. Unconditional standing approval for R5 is dangerous. Without pre-authorization, a scheduled R5 tool with deny-default will fail every execution -- the compiler detects this as a SCHEDULE-NO-APPROVAL error.

G-ELICIT checks USER.md OBO scope grants before flagging missing policies. If USER.md grants permanent approval for a specific R5 tool, the tool skips the missing-policy warning. *(Source: CL-02 Amendment A38)*

---

## Policy completeness

An elicitation policy must include all three fields: `approver` (who can approve), `mode` (inline, async, or pre-approved), and `timeout` (duration in seconds). If any field is missing, G-ELICIT flags the incomplete policy with a diagnostic listing the missing fields. *(Source: CL-02 Amendment A36)*

**Empty policy vs missing policy** (P-104): An empty elicitation policy (`"elicitation": {}` in claws.json) is technically present but functionally absent. G-ELICIT treats an empty policy the same as a missing policy -- it triggers OBO-WITHOUT-ELICIT. The presence of the key alone does not satisfy the elicitation requirement. *(Source: CL-02 Amendment A59)*

Tool names in elicitation policies are cross-validated against TOOLS.md using exact comparison with fuzzy match suggestions (Levenshtein distance <= 3). Exact comparison is preferred over automatic normalization because normalization hides mismatches that may be significant if the platform is case/convention-sensitive. Unmatched policy entries produce a hard error with suggestion: "Policy references 'send_payment' -- no match in TOOLS.md. Did you mean 'send-payment'?" An orphaned policy targeting an R5 tool (no match found) escalates from warning to error, because the real R5 tool is left ungoverned. Ghost policy entries (rules referencing tools removed from TOOLS.md) are detected by `claws pinch` as they may indicate a rename that was not propagated. *(Source: CL-02 Amendment A37, PC2-S14-F04, PC2-S14-F05, PC2-S14-F06, PC2-S14-F07, SCV-S10-F01, SCV-S10-F02, SCV-S10-F03, SCV-S10-F05)*

When resolution alternatives are presented ("add elicitation policy in claws.json" vs "add OBO scope in USER.md"), the guidance notes the security difference: claws.json requires per-use approval (stronger), USER.md grants standing authorization (weaker). For R5 tools, claws.json is recommended. *(Source: SCV-S03-F07)*

### OBO-WITHOUT-ELICIT severity by risk level (P-104)

OBO-WITHOUT-ELICIT uses risk-level-conditional severity:

| Risk level | Severity | Rationale |
|-----------|----------|-----------|
| R5 | **Error** (always) | R5 fail-closed invariant. An R5/OBO tool without elicitation produces a deployable but functionally broken artifact. |
| R3-R4 | Warning (advisory mode) | These tools can fail-open if configured. Warning is appropriate. |
| R3-R4 | **Error** (strict mode) | Enterprise strict mode: no OBO tool without explicit governance at any risk level. |

Each R5/OBO tool without an elicitation policy produces a separate error with individual remediation guidance, including a claws.json snippet showing the minimum configuration to resolve the conflict. The cross-spec invariant is: if CL-02 says "R5 always fail-closed", CL-04 must not allow compilation of R5 tools without a fail-closed path. OBO-WITHOUT-ELICIT at error severity is immune to advisory mode (`strict: false`) -- it remains error regardless. This makes it the only conflict that cannot be downgraded by advisory mode. *(Source: CL-02 Amendments A58, A59; CL-04 Pitfall-Coverage-1 Constraints; SCV-S03-F06)*

**Breaking change note** (P-123): The severity elevation from warning to error is a breaking change for existing workspaces. Workspaces with R5/OBO tools without elicitation policies will stop compiling. The ANALYZE phase must exhaustively check TOOLS.md, SOUL.md, and USER.md before firing -- if any one provides coverage (including fleet-inherited configuration), the conflict resolves. *(Source: SCV-S03-F01, SCV-S03-F02, SCV-S03-F03)*

### Perpetual denial for scheduled R4+ tools (P-103)

SCHEDULE-NO-APPROVAL detection is generalized beyond R5 to any tool classified R4+ where elicitation is required and no human is available during scheduled execution. An R5 tool scheduled at 02:00 AM with no pre-authorization and deny-default will fail every execution. The compiler detects this three-way conflict (R4+ tool + scheduled + no pre-auth) and reports it as an error.

Pre-authorization for R5 resolves the conflict but emits a dedicated warning: R5 pre-authorization is itself a significant governance decision that must appear in the audit chain. The compiler warning also mentions audit chain pollution -- perpetually denied tools generate 1000+ denied-by-timeout events per day. *(Source: CL-02 Amendments A55, A56, A57)*

---

## Per-tool timeout overrides

Enterprises may need different timeouts for different R5 tools:

```yaml
elicitation:
  timeout: 300           # global default (5 minutes)
  overrides:
    send-email: 60       # faster response needed
    process-payment: 600  # more time for financial review
```

G-ELICIT-TIMEOUT validates field interactions: inline mode with timeout over 120 seconds produces a warning (long agent block). Async mode with 300 seconds is typical. A timeout of 0 with deny-default immediately denies all R5 actions and produces a warning suggesting the tool deny list instead. *(Source: CL-02 Amendments A43, A44, A45)*

---

## Audit dependency

G-ELICIT warns if audit chain signing is not configured alongside elicitation policies. Warning severity scales by risk level: info for R1-R3, warning for R4, error for R5. An unsigned R5 approval is inadmissible in legal discovery -- six months later, anyone with audit chain write access could have forged the entry. Similarly, G-ELICIT cross-checks that approval token signing is enabled, since unsigned tokens can be forged by malicious subagents. *(Source: CL-02 Amendments A40, A41, PC2-S07-F04, PC2-S07-F05)*

## Platform timeout default override

The OC platform defaults to approve-on-timeout: if a human does not respond within 30 seconds, the tool executes. This contradicts claws's deny-default philosophy. The emit phase ALWAYS generates the deny-on-timeout override, regardless of claws.json configuration. This is a non-configurable safety default. If claws.json explicitly sets `approveOnTimeout: true`, the build fails with a hard error explaining the security implication. *(Source: PC2-S15-F01, PC2-S15-F02)*

---

## Subagent approval independence

A subagent's R5 tool requires its own approval path. The parent agent's approval policy does not cover subagent R5 tools. G-ELICIT-CHAIN enforces this: OBO authority cannot be delegated, so each agent with R5 tools must have its own elicitation policy or be covered by a fleet-level policy. *(Source: CL-02 Amendment A39)*

---

## The approval flow

1. Agent identifies an R5 or OBO tool call (classification determined at compile time)
2. Gate constructs an approval request: tool name, action description, target, estimated impact
3. Request is presented to the user via the configured mode (inline, async, or checked against pre-approval list)
4. Timer starts. Default timeout: 300 seconds (5 minutes). Configurable per policy.
5. **Three possible outcomes:**

| Outcome | What happens | Audit record |
|---------|-------------|-------------|
| User approves | Signed approval token issued. Action proceeds. | `APPROVED` with user identity, timestamp, token hash |
| User denies | Action blocked immediately. Agent informed. | `DENIED` with user identity, timestamp, reason (if provided) |
| Timeout expires | **Action blocked.** Deny-default. | `TIMEOUT_DENIED` with timestamp, timeout duration |

6. Decision is recorded in the [audit chain](audit-chain.md) regardless of outcome
7. Signed approval token is attached to the tool call for downstream verification

---

## Timeout equals denial

This is non-negotiable. If the human does not respond, the action does not proceed.

The alternative -- defaulting to approve on timeout -- means an agent can impersonate the user while they are asleep, in a meeting, on vacation, or otherwise unavailable. From a compliance perspective, that is not governance. It is a checkbox.

Deny-default aligns with the principle of least privilege: no action should proceed without explicit authorization. SOC2 CC6.1 and CC6.2 require that access controls be affirmatively established, not assumed by default.

---

## Signed approval tokens

When a user approves an action, the gate issues a signed token. This token serves two purposes:

| Purpose | What it prevents |
|---------|-----------------|
| **Proof of human origin** | Another agent cannot forge an approval. The token is signed by the runtime, not by the requesting agent. |
| **Non-repudiation** | The audit trail can prove that a specific human authorized a specific action at a specific time. |

Tokens are signed with HMAC-SHA256 (default) or Ed25519 (enterprise). The signing key is managed through the claws key lifecycle (see CL-02 Key Management). Tokens include: the tool name, action hash, user identity, timestamp, and expiry. A token is valid for one invocation only -- it cannot be replayed.

---

## No transitive OBO delegation

Agent A cannot ask Agent B to act as the user. Only the original human can approve an OBO action.

| Scenario | Permitted? | Why |
|----------|-----------|-----|
| User approves Agent A sending email | Yes | Direct human authorization |
| Agent A asks Agent B to send email, presenting its own approval | **No** | Agent A's approval does not transfer to Agent B |
| Agent A asks Agent B for information (read-only) | Yes | FOR-user action, not AS-user |
| Agent A forwards user's signed token to Agent B | **No** | Tokens are bound to the requesting agent. Forwarding is detected and blocked. |

The governance rule G-ELICIT-CHAIN enforces a maximum delegation depth of 1. The original human is always the approver. This prevents the "agent chain impersonation" attack described in OWASP Agentic #5.

---

## Regulatory alignment

| Framework | Requirement | How elicitation gates address it |
|-----------|------------|--------------------------------|
| SOC2 CC6.1 | Logical access controls | Human approval before agent impersonation |
| SOC2 CC6.2 | Authentication mechanisms | Signed tokens prove human origin |
| HIPAA 164.312(d) | Person or entity authentication | Only authenticated humans can authorize PHI actions |
| EU AI Act Art. 14 | Human oversight measures | Elicitation gates provide "ability to intervene on the operation of the high-risk AI system or interrupt the system" |
| NIST AI RMF | GOVERN 1.3 | Documented human-in-the-loop controls |

---

## What to tell the board

No agent can act as an employee without that employee's explicit approval. If the employee does not respond, the answer is no. The approval is cryptographically signed so it cannot be forged, and every decision -- approved, denied, or timed out -- is recorded in a tamper-evident audit chain. One agent cannot grant another agent permission to impersonate the user.

---

## Scenario-Driven Additions

### From obo-elicitation scenarios (68 findings applied)
- Approval token binding to invocation parameters: token includes hash of tool name + params + timestamp, preventing TOCTOU attacks where parameters change between approval and execution
- Token expiry window (60s default) with algorithm-agnostic signing (HMAC-SHA256 + Ed25519 supported)
- Forgery detection escalation: forged tokens trigger security incident response with progressive escalation (warn, block agent, quarantine workspace)
- Opaque forgery rejection: error messages reveal no information about why verification failed to prevent oracle attacks
- Constant-time token signature verification (crypto.timingSafeEqual) prevents timing side-channel attacks
- Approval key isolation from agent tools: signing keys stored outside agent-accessible paths, never in git or env vars
- Token nonce for replay prevention; dual-key verification during rotation grace period
- Elicitation request deduplication within timeout window prevents duplicate prompts from agent retry loops
- Rate limiting (max N per minute per agent) with post-denial cooldown period to prevent approval fatigue flood attacks
- Token encryption for A2A transit when approval flows through delegation chains

## Related concepts

- [OBO Boundary](obo-boundary.md) -- the line that triggers elicitation
- [Tool Classification](tool-classification.md) -- how tools are scored to determine gate requirements
- [Audit Chain](audit-chain.md) -- where approval decisions are permanently recorded
- [Fail Mode](fail-mode.md) -- what happens when the gate mechanism itself fails
