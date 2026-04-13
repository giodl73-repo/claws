# The OBO Boundary

<!-- atom:obo-boundary (C11) -->

## The short version

"On Behalf Of" is the line between an agent acting FOR you and acting AS you. Reading your email is FOR you. Sending an email from your address is AS you. The OBO boundary exists because the second case requires your explicit permission. The test is simple: would a reasonable person expect to be asked before this happens?

claws enforces this boundary with deny-default elicitation gates. Every tool that crosses the OBO line requires human approval. No approval, no action. No exception. An R5/OBO tool without an elicitation policy is a compile-time error -- the compiler will not proceed. This was elevated from warning to error because R5 fail-closed is non-negotiable: if the tool must fail-closed and no gate exists, the tool can never execute.

---

## Why this is the headline concept

Of the 824+ known malicious skills in the OpenClaw ecosystem, the most dangerous are those that act AS the user without asking. An agent that sends an email to a regulator, posts to Slack, processes a payment, or deletes files -- all using the user's identity and credentials -- creates legal liability, reputational damage, and compliance violations.

OWASP Agentic Top 10 lists Excessive Agency (#1) and Tool Misuse (#4) as the two highest-risk categories. The OBO boundary addresses both. Without it, every agent with communication or transaction tools is an impersonation risk.

---

## FOR-user vs AS-user

| Action | Category | Gate required? | Why |
|--------|----------|----------------|-----|
| Read email | FOR-user | No | Observation only. No external effect. |
| Search the web | FOR-user | No | Read-only information retrieval. |
| Draft a response | FOR-user | No | Internal preparation. Nothing leaves the workspace. |
| Summarize a document | FOR-user | No | Analysis of existing data. |
| Query a database (read) | FOR-user | No | Read access within existing permissions. |
| Ask another agent for information | FOR-user | No | Internal coordination. |
| **Send an email** | **AS-user** | **Yes** | Message leaves the workspace under the user's identity. |
| **Post to Slack or Teams** | **AS-user** | **Yes** | Public-facing communication as the user. |
| **Process a payment** | **AS-user** | **Yes** | Financial transaction on behalf of the user. |
| **Delete files** | **AS-user** | **Yes** | Irreversible change to the user's environment. |
| **Call an API with user credentials** | **AS-user** | **Yes** | Third-party action under the user's authority. |
| **Ask another agent to act as the user** | **AS-user** | **Yes** | Delegation of impersonation authority. |

The reasonable-person test makes this intuitive for auditors and board members. You do not need to understand risk classification or governance rules. You need only ask: would this person expect to be asked first?

---

## The 165 OBO skills

Ecosystem analysis of published OpenClaw skills identifies 165 skills that cross the OBO boundary. These include email senders, calendar managers, CRM updaters, social media posters, payment processors, and infrastructure provisioners. Each requires an elicitation gate when governed by claws.

An ungoverned workspace treats all 165 the same as a web search. A governed workspace distinguishes between reading data and acting on it.

---

## OBO overrides

The OBO flag is binary in classification but contextual in reality. A tool may act as the user in one workspace and generate content for review in another. claws.json supports per-workspace OBO overrides:

```yaml
classification:
  overrides:
    send-invoice:
      risk: R3
      obo: false
      reason: "generates PDF for review, does not send"
```

Without an override, OBO detection uses behavioral heuristics (credential forwarding, external API calls with user identity). Overrides are audited and appear in `claws check` output. *(Source: CL-02 Amendments A1, A3)*

---

## Deny-default

The OBO boundary operates on a deny-default principle. This means:

| Condition | Result |
|-----------|--------|
| User approves within timeout | Action proceeds. Token signed. |
| User explicitly denies | Action blocked. Reason recorded. |
| User does not respond (timeout) | **Action blocked.** Inaction equals denial. |
| Governance system crashes | **Action blocked.** Fail-closed for R5 tools. |
| Another agent forwards the request | **Action blocked.** No transitive OBO delegation. |

Deny-default is the only safe posture for impersonation actions. The alternative -- defaulting to approve on timeout -- means the user can be impersonated while asleep, in a meeting, or on vacation. That is the opposite of governance.

---

## Regulatory alignment

| Framework | Relevant requirement | How OBO addresses it |
|-----------|---------------------|---------------------|
| SOC2 Type II | CC6.1 Logical access, CC6.2 Auth mechanisms | OBO gates enforce human approval before agent impersonation |
| HIPAA Security Rule | 164.312(a)(1) Access control | PHI-touching tools require explicit approval before agent action |
| EU AI Act | Article 14 Human oversight | OBO gates provide the "ability to intervene" required for high-risk systems |
| OWASP Agentic | #1 Excessive Agency, #4 Tool Misuse | OBO boundary limits agent capabilities to what humans explicitly authorize |
| NIST AI RMF | GOVERN 1.3, MAP 2.3 | Human-in-the-loop controls documented and enforceable |

---

## What to tell the board

An agent has the same access as an employee. It can read what the employee reads, write what the employee writes, and communicate as the employee communicates. The OBO boundary ensures that anything the agent does that a reasonable person would want to approve first -- sending messages, making payments, deleting data -- requires that approval. No approval means no action. The audit trail records every decision, approved or denied, with a signed timestamp that survives legal discovery.

---

## Scenario-Driven Additions

### From obo-elicitation scenarios (68 findings applied)
- Standing approval: structured pre-authorization in USER.md frontmatter with conditions (time-bound, scope-limited, tool-specific) and 90-day expiry default
- Conditional classification: some tools are R5/OBO only in certain contexts (e.g., DM vs public channel); context_parameters in TOOLS.md enable per-invocation classification
- Multi-tool approval mode: serialized (one prompt per tool) vs batched (single prompt listing all tools) with per-tool individual tokens and correlation ID
- Three-source precedence: SOUL.md deny overrides claws.json policy, which overrides USER.md pre-authorization
- USER.md modification treated as an OBO action itself (R5) to prevent prompt injection from escalating pre-authorization
- Fleet policy vs USER.md pre-auth precedence: fleet-level deny overrides local pre-authorization
- Per-turn R5 request limit prevents a single turn from flooding the user with approval prompts
- Transitive OBO delegation blocking: per-invocation approval required regardless of delegation path; separate OBO hop counter vs A2A chain depth

## Related concepts

- [Tool Classification](tool-classification.md) -- how tools are scored R1 through R5
- [Elicitation Gate](elicitation-gate.md) -- how the approval mechanism works
- [Fail Mode](fail-mode.md) -- what happens when governance crashes during an OBO action
- [Audit Chain](audit-chain.md) -- how OBO decisions are recorded for auditors
