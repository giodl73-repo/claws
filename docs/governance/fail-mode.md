# Fail Mode

<!-- atom:fail-mode (C24) -->

## The short version

When governance encounters an error -- a crashed hook, a signing failure, a timeout in the policy engine -- the system must decide: does the tool call proceed (fail-open) or is it blocked (fail-closed)? The answer depends on the tool's risk classification. R1-R2 tools fail open because blocking reads on a governance error creates unnecessary downtime. R5 tools fail closed because allowing an impersonation action during a governance failure is unacceptable. R3-R4 tools are configurable by enterprise policy.

R5 fail-closed is non-negotiable. The compiler refuses to emit a policy with R5 fail-open. No administrator can override it.

---

## Fail mode by classification

| Classification | Default fail mode | Configurable? | Rationale |
|---------------|-------------------|---------------|-----------|
| R1 (Observe) | Fail-open | Yes (default: open) | A web search should not be blocked because the audit system hiccupped. Enterprises can override to fail-closed if needed. |
| R2 (Read) | Fail-open | Yes (default: open) | Reading email or querying a database during a governance error is safe. The action has no side effects. Enterprises can override to fail-closed if needed. |
| R3 (Write) | Fail-closed | Yes | File writes and database updates are reversible but consequential. Enterprise policy decides. |
| R4 (Execute) | Fail-closed | Yes | Code execution and deployments carry higher risk. Most enterprises choose fail-closed. |
| R5 (Transact) | **Fail-closed** | **No** | Sending email as the user, processing payments, posting externally. **Never proceeds ungoverned.** |

The `FailMode<R>` type in the GovernanceIR makes this configurable at the type level: R1-R2 accept both `"fail-open"` and `"fail-closed"` (defaulting to open), R3-R4 accept both (defaulting to closed), and R5 resolves to `"fail-closed"` only -- structurally unrepresentable as fail-open.

---

## What "configurable" means for R3-R4

Enterprise policy sets the fail mode for R3 and R4 tools in the governance configuration. This is a compile-time decision, not a runtime toggle. The default for R3-R4 is **fail-closed**. *(Source: fail-mode S03-F02)*

| Policy setting | R3 behavior | R4 behavior |
|---------------|-------------|-------------|
| `failMode: open` | File writes proceed on governance error | Code execution proceeds on governance error |
| `failMode: closed` (default) | File writes blocked on governance error | Code execution blocked on governance error |

The choice reflects the organization's risk appetite. A development environment may accept fail-open for R3 writes. A production environment handling financial data will require fail-closed for everything above R2.

**Configuration precedence**: Fail mode is resolved in strict order: per-tool > per-risk-level > global > default. If claws.json has both a global override and a per-tool override for read-file, the per-tool override wins. The runtime check uses strict equality (`===`), not coercion -- `undefined` and `null` both fall through to the default correctly. *(Source: SCV-S12-F01, SCV-S04-F03)*

**Global override**: An enterprise that wants ALL tools to be fail-closed (including R1-R2) can set `failMode.global: fail-closed` in claws.json. This overrides per-risk defaults but does not affect R5 (which is already fail-closed and non-configurable). The global override has a ceiling: it can make things MORE restrictive (R1 fail-closed) but cannot make R5 less restrictive. Setting `failMode.global: fail-open` does NOT override R5 fail-closed. The compiler warns: "CLAWS-W025: global fail-closed will block R1 read tools on governance errors" (informational -- the enterprise made a deliberate choice). Setting global fail-open warns: "CLAWS-W026: global fail-open overrides R3-R4 fail-closed default." *(Source: fail-mode S02-F03, SCV-S12-F02, SCV-S12-F05, SCV-S12-F06)*

**Reclassification impact**: If a tool is reclassified from R1 to R3 (e.g., due to a new data source), its fail-open setting may become inappropriate. The compiler warns when fail-open is configured for R3-R4 tools, since those risk levels default to fail-closed. *(Source: fail-mode S02-F06, SCV-S04-F08)*

**Migration note**: The R3-R4 default fail-closed is a breaking behavioral change from the earlier unspecified state. Existing workspaces that relied on implicit fail-open behavior will see write tools blocked on governance errors. Set `failMode.r3r4: "fail-open"` in claws.json if your workspace prefers resilience over security for R3-R4 tools. *(Source: SCV-S04-F01)*

---

## What happens when hooks crash

The OpenClaw Gateway runs governance through `before_tool_call` hooks. The Gateway's default behavior is fail-open for all hooks: if a hook crashes, the tool call proceeds. This is safe for most plugins but unacceptable for governance.

claws inverts the default at the handler level. Every claws `before_tool_call` handler wraps its logic in error handling that consults the tool's fail mode:

| Scenario | R1-R2 result | R3-R4 result (default) | R5 result |
|----------|-------------|----------------------|-----------|
| Policy evaluation succeeds | Tool call proceeds | Tool call proceeds | Tool call proceeds |
| Policy evaluation throws an exception | Tool call proceeds (fail-open) | **Tool call blocked** (fail-closed) | **Tool call blocked** (fail-closed) |
| Policy engine unreachable | Tool call proceeds | **Tool call blocked** | **Tool call blocked** |
| Signing key unavailable | Tool call proceeds | **Tool call blocked** | **Tool call blocked** |
| Audit chain write fails | Tool call proceeds | Configurable | **Tool call blocked** |

When a tool call is blocked due to a governance error, the block reason is recorded: `governance-error: <description>`. This distinguishes a policy denial (the tool violated a rule) from a governance failure (the governance system itself had an error).

**Block reason formatting**: The user-facing message is: "this action was blocked due to a governance system error -- please retry or contact your administrator." Technical error details (stack traces, file paths) are logged to the audit chain, not shown to the user. The blockReason string is sanitized to remove paths and config values. *(Source: fail-mode S03-F03, S04-F03)*

### R1 audit failure behavior

R1 "audit-only" governance degrades to no-audit if the audit chain is unavailable (signing key missing, disk full, chain corrupted). R1 tools use fail-open audit: the tool executes even if audit recording fails. Audit failures are recorded in a local fallback log (`.claws/audit/fallback.log`) and reconciled when the audit chain recovers. This ensures read operations are never blocked by audit infrastructure failures. *(Source: CL-02 Amendment A2)*

### Platform default override for deny-on-timeout

Some platforms default to approve-on-timeout for elicitation requests, which contradicts claws's deny-default requirement. The generated plugin overrides the platform default using `AbortSignal.timeout()` or equivalent, returning `{ block: true, blockReason: "elicitation-timeout-denied" }` when the timeout expires. *(Source: CL-02 Amendments A42, A46)*

### Configurable severity for bounds

Missing bounds (step limits, tool call limits, budget limits, recursion limits) produce warnings by default. Enterprise deployments can escalate to errors via `bounds.strictMode: true` in claws.json. Each of the 4 G-BOUND sub-rules (G-BOUND-01 through G-BOUND-04) is checked individually -- a workspace with step limits but no tool call limit receives a warning for the missing tool call limit only. *(Source: CL-02 Amendments A32, A33)*

**Secondary audit for fail-open events**: When R1-R2 tools fail open, a secondary audit trail via `process.stderr` records the event as structured JSON: `{"event":"CLAWS-FAILOPEN","tool":"...","risk":N,...}`. This ensures forensic evidence survives even if the primary audit chain is corrupted by the same crash that caused the fail-open. If stderr itself is broken (pipe closed, buffer full), the L5 sidecar has an independent detection mechanism via handler health monitoring. *(Source: fail-mode S02-F01, PC2-S07-F01, PC2-S07-F02, PC2-S07-F03)*

**Persistent failure recovery**: If the governance hook has a bug that crashes on every invocation of a specific tool, the sidecar (L5) detects the pattern (3+ crashes within 60s) and alerts the workspace operator. The alert distinguishes "blocked due to governance bug" (actionable) from "blocked due to policy" (correct behavior). `claws recover --tool <name>` forces re-evaluation with fresh state: rebuild riskMap, reload rules.json, re-register handler. Recovery does NOT require a full workspace recompile. *(Source: fail-mode S04-F04, S03-F01, PC2-S01-F04, PC2-S01-F05, PC2-S01-F06)*

**Immutable classification cache**: The handler clones the classification cache at the start of each evaluation and works on the clone. The live cache is replaced atomically (compare-and-swap) only after evaluation completes. If AbortSignal fires mid-evaluation, the clone is discarded and the live cache retains its previous consistent state. An interrupted handler returns a classification from the previous successful evaluation rather than a default. *(Source: PC2-S04-F04, PC2-S04-F05, PC2-S04-F08)*

### Pre-computed risk map in catch clause (P-109)

The catch clause is the ONLY defense between a governance evaluation failure and the Gateway's fail-open default. If the catch clause itself throws, there is no further fallback -- R5 tools execute ungoverned. To eliminate all runtime computation from the catch path:

1. **Risk map built at registration time**: At handler registration (not per-call), the risk map is built once from the GovernanceIR as a frozen ReadonlyMap. The map is immutable for the handler's lifecycle.
2. **Catch clause does only map lookup**: `riskMap.get(toolName) ?? 5`. Unknown tools default to risk 5 (fail-closed). This is the correct conservative default -- an alternative `?? 1` would be a security vulnerability. *(Source: PC1-S10-F02, PC1-S10-F03)*
3. **Null/undefined toolName handling**: If toolName is null or undefined, `riskMap.get(null)` returns undefined, `?? 5` returns 5. The catch clause also explicitly checks for null/undefined toolName as a hard deny before the map lookup. *(Source: PC1-S10-F05)*
4. **Post-emit static verifier**: The catch clause AST is validated after code generation. Allowed operations: Map.get, nullish coalescing, numeric comparison, return/throw. Disallowed: function calls (except Map.get), await, new, property access chains (length > 1), template literals. *(Source: PC1-S10-F04)*
5. **Audit logging must not throw**: The catch clause logs the evaluation failure using a fire-and-forget pattern or pre-allocated log buffer. The log entry includes toolName, risk level, original error message, and deny/allow decision. The log operation itself cannot throw. *(Source: PC1-S10-F09)*
6. **Defense-in-depth regardless of platform default**: Even if the OC platform eventually changes its default to fail-closed, the catch clause remains as defense-in-depth. The design must not depend on the platform's default behavior changing. *(Source: PC1-S10-F07)*

---

## R5 fail-closed is non-negotiable

This constraint is enforced at three levels:

| Level | Enforcement |
|-------|-------------|
| **Compile time** | The claws compiler refuses to emit a policy where any R5 tool has `failMode: open`. The compilation fails with a hard error. |
| **Runtime startup** | On gateway start, the claws plugin verifies that the compiled policy IR has not been tampered with. Hash comparison against the signed manifest. |
| **Runtime periodic** | Every 60 seconds, the loaded policy tables are re-hashed and compared against the signed manifest. If a mismatch is detected, degraded mode activates: all R5 tools are blocked, SIEM alert is emitted. |

No administrator override exists. This is by design. If an administrator could override R5 fail-closed, the security model reduces to the trustworthiness of a single person. Regulatory frameworks (SOC2, HIPAA) require that critical controls not be bypassable by individual administrators.

If the compiler classifies a tool as R5 and the user disagrees, the only recourse is to reclassify the tool to R4 or below -- which changes the risk level, not the fail mode. Reclassification is the ONLY mechanism for changing an R5 tool's fail behavior. *(Source: fail-mode S01-F03)*

---

## The CISO question

The CISO will ask: "If the `before_tool_call` hook crashes, does the email still send?"

The answer is **no**.

If the hook crashes for an R5 tool, the handler returns a block response before the exception propagates. The Gateway never sees an unhandled error -- it sees a deliberate block. The email does not send. The block is recorded in the audit chain. The SIEM is alerted.

---

## Degraded mode

When runtime integrity verification detects a problem (tampered policy, missing handler, unresponsive health endpoint), the system enters degraded mode:

| Condition | Response |
|-----------|----------|
| Policy IR hash mismatch | All R5 tools blocked. SIEM alert. |
| `before_tool_call` handler missing | L5 sidecar detects via health endpoint. Kill switch activated. |
| Health endpoint unresponsive (5 seconds) | L5 sidecar writes `.claws/KILL`. All tools blocked. |

Degraded mode is not a permanent state. It persists until the integrity issue is resolved. `claws resume` restores normal operation after the root cause is addressed and verified.

---

## Regulatory alignment

| Framework | Requirement | How fail mode addresses it |
|-----------|------------|--------------------------|
| SOC2 CC6.1 | Access controls operate effectively | Fail-closed ensures controls are not bypassed during errors |
| SOC2 CC7.2 | Incident response | Degraded mode is an automated incident response |
| HIPAA 164.312(a)(1) | Access control mechanisms | PHI tools (R5) always fail closed -- no ungoverned PHI access |
| EU AI Act Art. 14 | Human oversight | Fail-closed preserves human oversight when governance degrades |
| NIST AI RMF | MANAGE 2.4 | Fail-safe mechanisms documented and tested |

---

## What to tell the board

When governance encounters an error, low-risk tools (reading data, searching the web) continue to work. High-risk tools (sending email, processing payments) are automatically blocked until governance is restored. The highest-risk category -- tools that act as the user -- can never be configured to proceed during a governance failure. This constraint is built into the compiler and cannot be overridden by any administrator.

---

## Scenario-Driven Additions

### From fleet-operations scenarios (89 findings applied)
- Kill switch semantics clarified as deny-all, not disable-governance: killed workspaces still record audit events and block all tool calls rather than running ungoverned
- Synchronous kill with per-workspace acknowledgment: fleet kill waits for each workspace to confirm the kill took effect
- Kill partial failure escalation: if kill fails for unreachable workspaces, the event is escalated to CRITICAL alert with no silent failures
- Pre-kill snapshot with failure tolerance: automatic snapshot before kill; if snapshot fails, kill proceeds but logs the snapshot failure
- Post-kill restoration via `claws resume` or `claws snap restore`: documented recovery path from killed state
- Double-kill prevention: repeated kill on an already-killed workspace does not overwrite the pre-kill snapshot with the killed state (P-179)

## Related concepts

- [Tool Classification](tool-classification.md) -- how tools are scored R1 through R5
- [Defense in Depth](defense-in-depth.md) -- the five layers, including L5 sidecar
- [OBO Boundary](obo-boundary.md) -- why R5 fail-closed is non-negotiable
- [Audit Chain](audit-chain.md) -- where governance errors and degraded mode events are recorded
