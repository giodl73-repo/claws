# Tool Classification

<!-- atom:tool-classification (C10) -->

## The short version

Every tool an agent can use receives a risk classification from R1 (observe) to R5 (transact). The classification is per-tool, not per-workspace. A workspace with 20 tools may have 12 at R1, 5 at R3, 2 at R4, and 1 at R5. Each level adds governance controls: R1 gets audit logging only; R5 gets audit, confirmation, sandbox, and a mandatory elicitation gate. The classification determines what governance the tool receives, not whether the tool is allowed.

---

## The five risk levels

| Level | Name     | Capability                 | Governance applied                                    | Example tools                                                              |
| ----- | -------- | -------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| R1    | Observe  | Read-only, no side effects | Audit logging only                                    | Web search, clock, calculator                                              |
| R2    | Read     | Access to stored data      | Audit + data sensitivity labels                       | Read email, query database, read file                                      |
| R3    | Write    | Modify stored data         | Audit + confirmation prompt                           | Write file, update CRM record, edit database                               |
| R4    | Execute  | Run code or processes      | Audit + confirmation + sandbox                        | Execute shell command, run script, deploy service                          |
| R5    | Transact | Act as the user externally | Audit + confirmation + sandbox + **elicitation gate** | Send email, post to Slack, process payment, call API with user credentials |

---

## Per-tool, not per-workspace

This distinction matters for auditors. A workspace-level classification (e.g., "this workspace is high-risk") is too coarse. It either over-governs safe tools or under-governs dangerous ones.

Per-tool classification means:

| Scenario                            | Workspace classification                          | Per-tool classification                                 |
| ----------------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| Web search in a high-risk workspace | Full governance stack applied to a read-only tool | R1: audit logging only. No unnecessary friction.        |
| Send-email in a low-risk workspace  | Minimal governance. Email sends ungoverned.       | R5: full elicitation gate regardless of workspace tier. |

The workspace's trust tier (T0-T4) sets the ceiling -- which tools are available at all. The tool's risk classification (R1-R5) sets the floor -- how much governance each available tool receives. Together they form the security architecture.

---

## Classification criteria

Tools are classified based on what they can do, not what they are intended to do. Intent is unreliable. Capability is measurable.

| Criterion         | Lower risk (R1-R2)  | Higher risk (R4-R5)          |
| ----------------- | ------------------- | ---------------------------- |
| Side effects      | None or reversible  | Irreversible or external     |
| Data access       | Public or internal  | Confidential or restricted   |
| Identity exposure | Agent identity only | User identity or credentials |
| Blast radius      | Local workspace     | External systems or people   |
| Reversibility     | Easy to undo        | Cannot be undone             |

**R1 vs R2 distinction**: Both R1 and R2 have READ capability. The differentiator is data sensitivity context: reading local files is R1 (observe), querying a database with potentially sensitive data is R2 (read). The classifier uses data sensitivity labels from MEMORY.md to determine which read tools access sensitive stores.

**Multi-capability tools**: A tool with multiple capabilities is classified at the HIGHEST risk level implied by any single capability. For example, `send-email` with capabilities [COMMUNICATE, TRANSACT] is classified R5 (from TRANSACT), not R3 (from COMMUNICATE alone). The classifier uses maximum, not first-match.

**Context-dependent OBO**: For some tools, OBO status depends on usage context. Posting to a public Slack channel may be FOR-user (sharing information), while posting to a DM is AS-user (communicating on the user's behalf). When context is available in the tool configuration, the classifier considers it.

### Classification precedence

G-CLASS uses a four-level precedence when determining a tool's risk level:

1. **Explicit claws.json override** -- highest priority, replaces the derived score
2. **Capability analysis** -- examines declared capabilities (READ/WRITE/COMMUNICATE/EXECUTE/TRANSACT)
3. **Behavioral heuristic** -- OBO detection patterns ("send on behalf of", credential forwarding)
4. **Description keyword extraction** -- lowest priority, advisory only

Description keywords alone are insufficient. A tool named "send-invoice" whose description says "generates an invoice PDF" would be misclassified as R3 by keywords alone. Capability analysis catches TRANSACT if declared. Behavioral heuristic catches it via tool name analysis: "send" in the tool name maps to R5 candidate via the verb-to-risk dictionary (send/post/delete/transfer/pay -> R5 candidate, write/create/update -> R3 candidate, read/get/list/query -> R1 candidate). If levels 1-3 all return no classification, the tool is flagged for manual review rather than defaulting to keyword-only scoring. _(Source: CL-02 Amendment A1, PC2-S09-F01, PC2-S09-F02)_

### Classification overrides

The OBO flag and risk level support per-workspace overrides in claws.json:

```yaml
classification:
  overrides:
    send-invoice:
      risk: R3
      obo: false
      reason: "generates PDF for review, does not send"
```

Overrides appear in `claws check` output as `[OVERRIDE]` and are audited. The override replaces (not caps) the derived score. If the override downgrades the behavioral classification (e.g., override R3 when behavioral heuristic infers R5), a warning fires: "Override R3 is lower than inferred R5 -- confirm?" The override still wins but the developer is alerted to the downgrade. _(Source: CL-02 Amendments A1, A3, PC2-S09-F08)_

### Reclassification

Reclassification is the ONLY mechanism for changing an R5 tool's fail-mode behavior. There is no fail-open override for R5. If an operator reclassifies send-email from R5 to R4, three security properties change: (1) fail-mode becomes configurable (instead of non-negotiable fail-closed), (2) the elicitation gate may no longer be required, and (3) the tool is no longer flagged as an OBO boundary. All three changes are reflected consistently across all governance layers and artifacts.

A reclassification from R5 without a `reason` field produces a warning: "CLAWS-W015: R5 reclassification without reason." Upward reclassification (R1 to R5) is allowed -- more restrictive is always safe. The compliance evidence package includes all reclassifications with reasons. GovAnalysis reports both derived and effective counts: "10 tools classified R5 (5 overridden to R4, 5 effective R5)." _(Source: SCV-S13-F01, SCV-S13-F02, SCV-S13-F03, SCV-S13-F06, SCV-S13-F07)_

### Trust tier ceiling

The trust-to-risk mapping (T0=R1-max, T1=R2-max, T2=R3-max, T3=R4-max, T4=R5-max) caps which tools a workspace can have. A T2 workspace cannot have R5 tools. Per-target trust tier overrides are used for platform-specific artifacts. Platform built-in tools that exceed the ceiling produce a warning (not error) because the operator cannot remove built-ins. Resolution options: raise trustTier, remove the tool, or override classification downward. _(Source: SCV-S11-F01, SCV-S11-F02, SCV-S11-F03, SCV-S11-F05, SCV-S11-F06)_

### Platform built-in tools

Platform tools not declared in TOOLS.md are still classified using default tables:

| Platform | Tool  | Default    |
| -------- | ----- | ---------- |
| OpenClaw | exec  | R4/EXECUTE |
| OpenClaw | read  | R2/READ    |
| OpenClaw | write | R3/WRITE   |
| OpenClaw | bash  | R4/EXECUTE |

_(Source: CL-02 Amendment A4)_

### R1 audit failure behavior

R1 "audit-only" tools use fail-open audit: if the audit chain is unavailable, the tool still executes. Audit failures are recorded in `.claws/audit/fallback.log` and reconciled when the chain recovers. _(Source: CL-02 Amendment A2)_

---

## Governance controls by level

| Control                 | R1  | R2  | R3  | R4  | R5      |
| ----------------------- | --- | --- | --- | --- | ------- |
| Audit chain entry       | Yes | Yes | Yes | Yes | Yes     |
| Data sensitivity labels | --  | Yes | Yes | Yes | Yes     |
| User confirmation       | --  | --  | Yes | Yes | Yes     |
| Sandbox execution       | --  | --  | --  | Yes | Yes     |
| OBO elicitation gate    | --  | --  | --  | --  | **Yes** |
| Deny-default on timeout | --  | --  | --  | --  | **Yes** |
| Signed approval token   | --  | --  | --  | --  | **Yes** |

Each level inherits the controls of the level below it and adds its own. R5 gets everything.

---

## Fail mode by classification

The fail mode when governance encounters an error is determined by the tool's classification, not by a global setting.

| Classification | Fail mode              | Rationale                                                                    |
| -------------- | ---------------------- | ---------------------------------------------------------------------------- |
| R1-R2          | Fail-open              | Blocking reads on a governance error creates unnecessary downtime.           |
| R3-R4          | Configurable           | Enterprise policy decides. Default: fail-closed.                             |
| R5             | **Fail-closed always** | Non-negotiable. Non-configurable. The compiler refuses to emit R5 fail-open. |

See [Fail Mode](fail-mode.md) for full details.

---

## Regulatory alignment

| Framework           | Requirement                          | How tool classification addresses it                               |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| SOC2 CC6.1          | Logical and physical access controls | Per-tool classification enforces minimum governance per capability |
| SOC2 CC6.3          | Role-based access controls           | R1-R5 levels map to capability-based permission groups             |
| HIPAA 164.312(a)(1) | Access control mechanisms            | PHI-accessing tools classified R2+ with RESTRICTED data labels     |
| EU AI Act Art. 9    | Risk management system               | Tool-level risk scoring feeds system-level risk assessment         |
| OWASP #1            | Excessive Agency                     | R1-R5 constrains each tool to its minimum necessary governance     |

---

## What to tell the board

Not all tools are equal. A calculator does not need the same governance as an email sender. Tool classification ensures that each tool receives governance proportional to its risk -- measured by what it can do, not what someone says it will do. R5 tools that act as the user always require human approval and always fail closed if governance is disrupted.

---

## Scenario-Driven Additions

### From a2a-governance scenarios (53 findings applied)

- Delegation ceiling is per-tool, not per-risk-level: Agent A can delegate R3 file-write to Agent B but not R3 database-write, even though both are the same risk level
- Delegation map maintained per-workspace with per-invocation ceiling checks at runtime
- Independent G-A2A-DELEGATE and G-A2A-FLOW constraint checking: delegation permission and data flow classification are evaluated separately and both must pass

### From injection-defense scenarios (47 findings applied)

- URL validation modes: allowlist (enterprise, strictest), blocklist+heuristics (default), advisory (development only)
- URL shortener handling policy: shortened URLs are expanded before validation; unexpandable URLs are blocked
- Wildcard allowlist patterns produce a warning ("*.com" effectively disables URL validation)
- URL validation applies across all output channels, not just user-facing responses
- URL field identification in tool argument schemas enables compile-time detection of tools that accept URLs
- Data provenance context included in G-ELICIT approval requests so the human approver sees where data originated

## Related concepts

- [OBO Boundary](obo-boundary.md) -- what makes R5 tools different from R4
- [Elicitation Gate](elicitation-gate.md) -- the approval mechanism for R5 tools
- [Defense in Depth](defense-in-depth.md) -- the five governance layers
- [Fail Mode](fail-mode.md) -- what happens when governance encounters an error
