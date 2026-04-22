# CL-03: Runtime Enforcement

> **Status: Retired** — Succeeded by the per-package spec scheme in
> `c:\src\claws\docs\`. Successor: `guardrails/specs/GR-guardrails.md`
> + `GRR-runtime.md`. Content preserved for historical reference.
> Do not amend.

**Source**: Q12i, Q12r
**Reviewers**: platform-engineer, security-architect, reliability-engineer

---

## Overview

This spec defines how compile-time governance rules execute at runtime. Governance without enforcement is advisory. The 5-layer defense-in-depth model ensures that no single enforcement point is a single point of failure: the skill layer is advisory context, the plugin hooks are the enforcement engine, exec-approvals are the host-level backup, and the sidecar is the external auditor.

**CRITICAL ARCHITECTURAL DECISION**: The OC codebase confirms that skills are prompt-only -- they have no `execute()` method, no hook registration, and no ability to intercept or block actions (see `src/agents/skills/types.ts`). Enforcement MUST be a Gateway plugin. The claws governance SKILL.md provides advisory Layer 1 only (agent self-governance instructions). All enforcement (Layers 2-4) is implemented as a single Gateway plugin registering multiple hooks.

The GovernanceHost interface is the platform-agnostic contract between compiled governance and the hosting runtime. OpenClaw implements all 6 facets (tool, A2A, context, elicitation, audit, health). Other platforms implement what their extension APIs support. `claws init` installs layers 1-4 with one command; layer 5 (sidecar) is the DEFAULT for enterprise deployments.

The fail-mode policy is risk-based: R1-R2 fail-open (do not break reads), R3-R4 configurable (enterprise decides), R5 ALWAYS fail-closed (non-negotiable -- the compiler refuses to emit R5 fail-open).

## Scope

**In scope**:
- 5 defense-in-depth layers (skill advisory, plugin `before_tool_call` hook, plugin lifecycle hooks, exec-approvals bridge, sidecar)
- GovernanceHost 6-facet interface
- `claws init` as installer (creates config AND wires runtime enforcement)
- Risk-based fail-mode policy (R1-R2 open, R3-R4 configurable, R5 closed)
- Emergency bypass (`CLAWS_BYPASS=1`) for power users
- `claws uninstall` with backups preserved outside `.claws/`
- Crash recovery via governance WAL
- Event fanout tiers (synchronous through batch)
- Per-platform capability matrix

**Out of scope**:
- Specific governance rules (CL-02)
- Compilation pipeline that produces enforcement artifacts (CL-04)
- CI/CD pipeline integration (CL-05)

**Depends on**: CL-01 (claws.json config), CL-02 (security rules)

## Design

### 5 Defense-in-Depth Layers

```
L5: Sidecar -------- Infrastructure --- survives Gateway compromise
     |                                   (RECOMMENDED for enterprise)
     |
L3: Plugin lifecycle  All GW events --- A2A + output + input + context
     |                                   (same plugin, different hooks)
L2: Plugin before_tool_call ----------- classification + elicitation
     |                                   (same plugin, tool-call hook)
     |
L4: Exec ----------- Host level ------- HITL backup allowlists
     |                                   (exec-approvals.json bridge)
     |
L1: Skill ---------- Agent context ---- advisory self-governance
     |                                   (SKILL.md, prompt-only, PRESS-compressed)
Agent -> Tool -> Effect
```

**Skill vs Plugin distinction**: The OC codebase (`src/agents/skills/types.ts`) confirms that skills are prompt-only markdown files with no `execute()` method. Skills influence agent behavior through system prompt injection only. They cannot intercept, block, or modify tool calls. All enforcement is implemented as a Gateway plugin (`OpenClawPluginDefinition`) that registers multiple hooks.

**L2-L4 share the Gateway process**: Layers 2, 3, and 4 all run inside the same Gateway Node.js process. If the Gateway is compromised (e.g., CVE-2026-25253), layers 2-4 are all gone. This is why L5 (sidecar) is the RECOMMENDED deployment for enterprise -- it is the only layer that survives Gateway compromise.

| Layer | What It Is | Insertion Point | Intercepts | Bypassable? | Enforces |
|-------|-----------|----------------|-----------|-------------|----------|
| L1 Governance SKILL | SKILL.md (prompt, advisory) | `skills/claws-governance/SKILL.md` | Agent context | YES (weakest) | Advisory instructions, PRESS-compressed |
| L2 Governance PLUGIN `before_tool_call` | TypeScript, server-side | `api.on("before_tool_call", ...)` | Every tool call | No (Gateway-level) | G-CLASS, G-ELICIT, G-BOUND, G-PERM |
| L3 Governance PLUGIN lifecycle hooks | TypeScript, same plugin | `api.on("subagent_spawning" \| "before_prompt_build" \| "llm_output" \| ...)` | A2A, output, context | No (Gateway-level) | G-A2A-*, G-OUTPUT, G-INPUT, G-CONTEXT |
| L4 Exec approvals bridge | JSON config, host-level | `exec-approvals.json` | Tool execution | No (host-level) | G-ELICIT backup, G-CLASS backup |
| L5 Sidecar | Separate process/container | Reverse proxy | All Gateway traffic | No (separate process) | Full SIEM, forensics, kill switch |

**Enterprise recommendation (CB-04)**: L5 sidecar is the DEFAULT for enterprise deployments, not opt-in. `claws init --enterprise` installs all 5 layers including the sidecar. `claws init` (without `--enterprise`) installs L1-L4 and warns that L5 is recommended for production.

### GovernanceHost Interface (6 Facets)

```typescript
interface GovernanceHost {
  // Facet 1: Tool Governance
  onBeforeToolCall(handler: ToolGuardHandler): Disposable;
  onAfterToolCall(handler: ToolAuditHandler): Disposable;
  getAvailableTools(): Promise<ToolManifest[]>;

  // Facet 2: A2A Governance
  onAgentMessage(handler: A2AGuardHandler): Disposable;
  getAgentRoster(): Promise<AgentIdentity[]>;
  resolveTension(conflict: TensionConflict): Promise<Resolution>;

  // Facet 3: Context Governance
  assembleContext(rules: ContextRules): Promise<AgentContext>;
  validateOutput(output: AgentOutput): Promise<ValidationResult>;

  // Facet 4: Elicitation
  requestApproval(action: OboAction): Promise<ApprovalResult>;

  // Facet 5: Audit
  appendAuditEvent(event: GovernanceEvent): void;
  queryAuditEvents(filter: AuditFilter): Promise<AuditEvent[]>;
  verifyAuditChain(): Promise<ChainVerification>;
  onAuditEvent(handler: AuditEventHandler): Disposable;

  // Facet 6: Health
  getGovernanceHealth(): GovernanceHealthReport;
  emergencyKill(reason: string): Promise<void>;
}
```

Each facet is independently adoptable. Minimum viable integration: Tool Governance + Audit (2 facets). Full enterprise: all 6.

### Platform Capability Matrix

| Facet | OpenClaw | Bedrock | LangGraph | CrewAI | Cursor |
|-------|---------|---------|-----------|--------|--------|
| Tool | hooks.before_tool_call | GuardrailsAPI | ToolNode edges | @tool decorator | N/A |
| A2A | Plugin event bus | Custom Lambda | MessageGraph | Custom Process | N/A |
| Context | Plugin assembly | RetrieveAndGenerate | StateGraph pre-node | system_template | N/A |
| Elicitation | exec-approvals + chat | Step Functions | NodeInterrupt | human_input | N/A |
| Audit | File NDJSON + sidecar | CloudWatch/Trail | LangSmith | Custom Logger | N/A |
| Health | Sidecar endpoint | CloudWatch | Cancel API | No native | N/A |

OpenClaw has ALL 5 insertion points and ALL 6 facets. Other platforms have partial support. Cursor and GitHub Copilot are advisory-only (no runtime enforcement possible).

### What `claws init` Does (OpenClaw)

```
$ claws init --template soc2

  Detected OpenClaw workspace (SOUL.md, AGENTS.md)

  Governance setup:
  + Created claws.json (SOC2 baseline)
  + Created .claws/ (policies, audit, cache, keys)

  Runtime enforcement:
  + Installed governance SKILL    -> skills/claws-governance/SKILL.md (L1 advisory)
  + Registered governance PLUGIN  -> plugins/claws-governance/ (L2+L3 enforcement)
  + Synced exec-approvals bridge  -> exec-approvals.json (L4 backup)
  ⚠ Sidecar (L5) not installed   -> run 'claws init --enterprise' for full defense

  4 enforcement layers active. Run 'claws check' to validate.
```

```
$ claws init --template soc2 --enterprise

  [...same as above, plus:]
  + Installed sidecar             -> .claws/sidecar/ (L5 external auditor)
  + Configured health endpoint    -> :9091/health
  + Configured SIEM forwarding    -> .claws/config/siem.yaml

  5 enforcement layers active (enterprise). Run 'claws check' to validate.
```

Files created: 16 new files (18 with `--enterprise`). Files modified: 3 existing files (openclaw.json, exec-approvals.json, .gitignore). Originals backed up to `~/.claws-backups/<timestamp>/` (OUTSIDE `.claws/` -- see CB-08).

### Fail-Mode Policy

```
R1 (observe)  --- fail-open  --- don't break reads
R2 (read)     --- fail-open  --- don't break searches
R3 (write)    --- configurable -- enterprise decides (default: closed)
R4 (execute)  --- configurable -- enterprise decides (default: closed)
R5 (OBO)      --- FAIL-CLOSED -- NON-NEGOTIABLE
                   |
                   +-- Compiler refuses to emit R5 fail-open
                       claws check blocks it
                       Runtime enforces it
                       No override exists
```

### Governed Context Assembly (4 Layers)

```
Layer 1: GOVERNANCE (trust: SYSTEM)  -- always first, never truncated
Layer 2: SKILLS     (trust: SYSTEM)  -- isolated per-skill with markers
Layer 3: TOOLS      (trust: SYSTEM)  -- filtered by G-CLASS/G-PERM
Layer 4: DATA       (trust: DATA)    -- sanitized, labeled, isolated
```

Each layer separated by boundary markers (`<<<GOVERNANCE_END>>>`) that instruct the model to treat DATA sections as information, not instructions. This is the core defense against indirect prompt injection.

### Crash Recovery (3 Phases)

1. **WAL Recovery**: Read governance WAL entries, reconstruct budget state (conservative: count reserves as spent), identify pending approvals and unflushed audit events
2. **State Reconciliation**: Flush pending audit events to CGR chain, verify chain integrity, process pending approvals (timeout if exceeded, re-present if not)
3. **Resume Operations**: Re-register handlers, compact WAL, emit recovery event

Key invariant: **approval timeouts do not reset on crash.** If 4 of 5 timeout minutes elapsed before crash, only 1 minute remains after recovery.

### Event Fanout (4 Tiers)

| Tier | Mode | Examples | Failure Behavior |
|------|------|---------|-----------------|
| 1 Critical | Synchronous | CGR chain, budget WAL | Block governance decision |
| 2 Standard | Async + retry | SIEM, AlertManager | Dead-letter queue |
| 3 Best-effort | Fire-and-forget | Dashboard WebSocket | Silent drop |
| 4 Batch | Deferred read | Compliance reports | Reads chain on schedule |

Re-entrancy guard prevents infinite loops when audit handlers trigger further audit events.

### Enforcement Coverage

| Category | Rules | Fully Enforced | Compile-Only | Runtime-Heavy |
|----------|-------|---------------|-------------|--------------|
| Classification | 3 | 2 | 0 | 1 |
| A2A governance | 5 | 5 | 0 | 0 |
| Input defense | 4 | 2 | 0 | 2 |
| Context isolation | 4 | 0 | 2 | 2 |
| Output guards | 4 | 2 | 2 | 0 |
| Bounds | 4 | 3 | 0 | 1 |
| Elicitation | 4 | 4 | 0 | 0 |
| Supply chain | 1 | 1 | 0 | 0 |
| **Total** | **29** | **19** (66%) | **4** (14%) | **6** (21%) |

### 4 Gaps Where No Layer Can Operate

1. **Agent-internal reasoning** -- no layer can inspect chain-of-thought (mitigated by G-BOUND caps)
2. **Client-side rendering** -- chat client is outside Gateway boundary (mitigated by G-OUTPUT URL blocking)
3. **Direct MCP bypass** -- tools accessed outside Gateway (mitigated by sidecar network policies)
4. **Model-level attacks** -- adversarial inputs exploiting LLM behavior (mitigated by G-INPUT surface reduction)

### Fail-Mode Implementation (CB-01)

Every claws `before_tool_call` handler implements handler-level deny-on-error for R5 tools, independent of the OC hook runner's `catchErrors` / `failurePolicyByHook` settings (which default to fail-open):

```typescript
// Inside the claws governance plugin's before_tool_call handler
// Risk map pre-computed at init time — avoids riskLevel() crash in catch path (S05-F01)
const riskMap = buildRiskMap(compiledTables);

api.on("before_tool_call", async (event, ctx) => {
  try {
    return await evaluatePolicy(event, ctx);  // await required for async error handling (S07-F06)
  } catch (err) {
    // Pre-computed risk avoids nested crash in catch clause (S04-F01, S05-F01)
    const risk = riskMap.get(event.toolName) ?? 5;  // unknown tool = fail-closed (S07-F04)
    // Hardened audit: fire-and-forget to pre-opened fd, not normal chain (S04-F02)
    hardenedAudit(event, err, risk);
    if (risk >= 5) {
      // R5: ALWAYS deny on error (non-negotiable)
      return { block: true, blockReason: `claws-governance-error: ${sanitizeError(err)}` };
    }
    if (risk >= 3) {
      // R3-R4: configurable (default: closed for enterprise)
      return config.failModeR3R4 === "open"
        ? undefined   // allow
        : { block: true, blockReason: `claws-governance-error: ${sanitizeError(err)}` };
    }
    // R1-R2: fail-open (don't break reads/searches)
    // Secondary audit via process.stderr as last-resort trail (S02-F01)
    process.stderr.write(JSON.stringify({ type: 'fail-open', tool: event.toolName, ts: Date.now() }) + '\n');
    return undefined;
  }
});
```

This ensures that even if the OC hook runner catches the exception and proceeds (fail-open default), the handler itself has already returned a DENY for R5 tools. The handler-level try/catch is the primary defense; the upstream `failMode` on `PluginHookRegistration` (CL-02 CB-01) is the long-term structural fix.

**Persistent handler failure detection** (S04-F04): If the handler crash is persistent (happens on every invocation of a specific tool), the tool is permanently blocked. This is correct security behavior but bad UX. The sidecar (L5) MUST detect persistent handler failures (3+ consecutive crashes for the same tool within 60s) and trigger an alert to the workspace operator, not just silently block.

**Per-tool crash tracking** (SCV-S06-F01): The persistent failure detection threshold (3+ crashes in 60s) must be configurable and must track crashes per-tool, not in aggregate. Transient errors (random crashes across different tools) must be distinguished from persistent bugs (deterministic crash on specific tool). Per-tool tracking is essential.

**Recovery re-evaluation vs recompilation** (SCV-S06-F02): `claws recover --tool <name>` forces governance re-evaluation with fresh state. But if the bug is in the compiled rule tables (not transient state), re-evaluation will crash again. Recovery must include a fallback: if re-evaluation crashes, the tool remains blocked and the operator is told to recompile (`claws build`). Recovery is not a bypass.

**Per-tool governance health status** (SCV-S06-F03): The health dashboard must show per-tool governance status: healthy, degraded (transient errors), failed (persistent crash). The status includes the last error, crash count, and time of first failure.

**Basic failure detection without sidecar** (SCV-S06-F05): If the sidecar is not installed (L1-L4 only deployment), persistent handler failures are silent. The governance plugin itself MUST implement basic persistent failure detection (counter per tool) and log a warning to stderr after 3+ crashes, even without the sidecar.

**Correlated failure detection** (SCV-S06-F07): Multiple tools failing simultaneously with the same error type indicates shared-state corruption (e.g., corrupted classification cache). The sidecar must detect correlated failures and escalate as a systemic failure, not per-tool. Systemic failure triggers a higher-severity alert and may warrant CLAWS_BYPASS or `claws kill`.

**Crash counter reset after recovery** (SCV-S06-F08): After successful recovery, the crash counter for the tool must reset to zero. The health dashboard should show the transition history (failed -> recovered -> healthy) for audit purposes.

**Block reason formatting** (S03-F03): An R3 tool blocked by fail-closed must produce a user-visible message explaining why the write was blocked. The blockReason format is: `"governance-error: this action was blocked due to a governance system error — please retry or contact your administrator (tool: {name}, risk: R{n})"`. Technical error details are logged to the audit chain, not shown to the user.

**Persistent governance failure recovery** (S03-F01): R3 fail-closed blocks write operations on governance errors. If the governance hook has a bug that always crashes for a specific tool, that tool is permanently blocked. The sidecar (L5) MUST provide a recovery mechanism: a health dashboard showing per-tool governance status, and a `claws recover --tool <name>` command that forces a governance re-evaluation with fresh state.

**Error type classification for escalation** (S05-F02): The sidecar must classify governance errors by type for escalation priority. Stack overflow (RangeError: Maximum call stack size) indicates systemic recursion affecting ALL tools — escalate immediately. TypeError indicates a specific code path bug — escalate per-tool. Timeout indicates performance degradation — alert but do not escalate.

**Error classification taxonomy** (SCV-S07-F01): The taxonomy must be defined and documented: RangeError (systemic, immediate escalation), TypeError (per-tool, standard escalation), AbortError (timeout, alert only), SyntaxError (configuration, immediate escalation), generic Error (unknown, default to standard escalation). Custom error classes from the governance engine must also be classified.

**Escalation channel routing** (SCV-S07-F02): Escalation channels must be configurable: systemic errors (RangeError, SyntaxError) go to PagerDuty/OpsGenie, per-tool errors (TypeError) go to engineering, timeout alerts go to performance monitoring. SIEM receives all error types.

**Catch clause RangeError immunity** (SCV-S07-F03): A stack overflow in the catch clause is catastrophic -- the handler crashes without returning a deny result. The catch clause minimalism requirement is the defense: no function calls, no recursion, just pre-computed lookups and a return statement.

**Timeout frequency escalation** (SCV-S07-F04): If >50% of evaluations timeout within a window, escalate from "alert" to "standard escalation." Persistent timeouts indicate hookTimeoutMs is too low for workspace complexity.

**Timeout performance context completeness** (SCV-S07-F05): Timeout audit events must include: (a) rules evaluated before timeout, (b) phase where timeout occurred (classification, policy eval, A2A check), and (c) heap usage. This data enables root cause diagnosis without reproduction.

**Error deduplication and suppression** (SCV-S07-F06): The sidecar must deduplicate alerts to prevent storms. If every tool call produces the same RangeError, the sidecar escalates once and suppresses duplicates for a configurable window (e.g., 5 minutes). Suppression must note the count: "53 additional occurrences suppressed."

**Error cause chain traversal** (SCV-S07-F07): Error type classification must survive error wrapping. If the governance engine catches a TypeError and wraps it in a GovernanceError, the sidecar classifies based on the ROOT CAUSE error type (`error.cause` chain traversal), not the wrapper.

**Handler interruptibility and idempotence** (S06-F04): If the handler is interrupted by AbortSignal mid-execution, any partially-written state (e.g., half-updated classification cache) may be corrupted. The handler MUST be idempotent and interruptible — no partial writes survive an abort. All state mutations use atomic compare-and-swap operations on immutable snapshots.

**Runner behavior independence** (S04-F05): The CB-01 defense operates below the Gateway's hook runner. If the OC Gateway changes its hook runner semantics (e.g., from catchErrors: true to catching AND blocking), the handler-level defense must produce a consistent result regardless. The handler returns a definitive allow/block — the runner's behavior is irrelevant.

**Handler presence monitoring** (S04-F07): If the handler crashes so badly that it gets unregistered by the Gateway, the sidecar MUST detect the absence via the health endpoint. This scenario (crash-with-handler-unregistered) is distinct from crash-with-handler-present and requires a separate security-sim scenario.

### Hook Latency Enforcement (Gateway-eng BLOCKER)

Plugin hooks must not block the agent request path. The claws governance plugin enforces latency bounds on its own handler:

| Operation | Budget | Enforcement |
|-----------|--------|-------------|
| Policy evaluation (classify + check) | 50ms | `AbortSignal.timeout(50)` wrapping policy eval |
| Approval request (async) | 0ms sync | Non-blocking; approval manager handles timeout separately |
| Audit chain append | 5ms | Async fire-and-forget (Tier 3 fanout) |
| Full `before_tool_call` handler | 50ms | Hard cap; on timeout, apply fail-mode by risk level |

If the policy evaluation exceeds 50ms (configurable via `claws.json#hookTimeoutMs`), the handler aborts evaluation and applies the fail-mode policy for the tool's risk level (R5 = deny, R1-R2 = allow, R3-R4 = configurable).

**Configurable hook timeout with ceiling** (S06-F01): The 50ms timeout is the default but enterprises may need longer for complex workspaces. `claws.json#performance.hookTimeoutMs` allows configuration. Hard ceiling: 500ms. Values above the ceiling are clamped. The total per-call budget remains the pipeline latency constraint.

**Per-call vs per-workflow timeout budgets** (S06-F05): The 50ms hook timeout is per-tool-call. In a workflow with 10 tool calls, total governance overhead could reach 500ms just from hook timeouts. The distinction between per-call budget (50ms) and per-workflow budget (pipeline total <500ms) must be tracked. Workflow-level governance adds classify steps but does not add per-step hook overhead (governance steps are pre-evaluated at compile time).

**Performance context in timeout events** (S06-F03): Audit events for hook timeouts record both the configured limit and the actual duration. Additionally, a performance context field captures: (a) number of rules evaluated before timeout, (b) whether the timeout occurred during classification, policy eval, or A2A check, and (c) heap usage at timeout. This enables root cause diagnosis without reproducing the timeout.

**Timeout ceiling clamping at config load time** (SCV-S15-F01): If an enterprise configures `hookTimeoutMs: 1000`, the value must be clamped to 500 with warning: "CLAWS-W030: hookTimeoutMs 1000 exceeds ceiling of 500ms -- clamped to 500ms." Clamping happens at configuration load time, not at runtime.

**Per-workflow governance budget** (SCV-S15-F03): In a workflow with 10 tool calls, each with a 200ms timeout, total governance overhead could reach 2000ms. A separate workflow-level governance budget may be needed for workflow-heavy deployments. The per-call vs per-workflow distinction must be tracked.

**Timeout side effect cleanup** (SCV-S15-F05): If evaluatePolicy started writing to the classification cache before the timeout fired, the cache entry may be partial. The AbortSignal must abort side effects (cache writes, audit appends) from the abandoned evaluation. Without cleanup, partial state accumulates and corrupts future evaluations.

**Timeout vs crash classification** (SCV-S15-F06): The sidecar must distinguish timeout-caused blocks (performance issue, may resolve with higher timeout) from crash-caused blocks (code bug, requires fix). The error type classification (S07) handles this distinction.

**AbortError vs TypeError audit distinction** (SCV-S15-F08): AbortError (timeout) and TypeError (bug) must produce different audit events even though both trigger fail-mode. A timeout is expected behavior (performance under load); a TypeError is unexpected (code bug). Conflating the two makes it impossible to distinguish planned degradation from bugs.

**Dynamic audit path based on fail mode** (SCV-S12-F03): The secondary audit mechanism for fail-open events uses process.stderr as a last-resort trail. With global fail-closed, there are no fail-open events and stderr trail is not needed. If global override is removed later, secondary audit must reactivate. The audit path must be dynamic based on the effective fail mode.

**failModeForRisk precedence implementation** (SCV-S12-F04): The failModeForRisk() function checks in order: (1) per-tool override, (2) per-risk override, (3) global override, (4) default. If global override is checked at the wrong precedence level (before per-tool), it would override intentional per-tool fail-open configurations.

**User-facing block reason for R3** (SCV-S04-F07): The user-visible block reason for R3 fail-closed must explain why the write was blocked: "governance-error: this action was blocked due to a governance system error -- please retry or contact your administrator (tool: write-db, risk: R3)". Technical error details go to audit chain, not user message.

**R3 persistent failure recovery path** (SCV-S04-F04): R3 fail-closed blocks write operations on governance errors. If the governance hook has a persistent bug for write-db, that tool is permanently blocked. Without the sidecar, the only recovery is fixing governance code or CLAWS_BYPASS=1.

### Memory and Resource Bounds (Gateway-eng BLOCKER)

The generated governance plugin is constrained to prevent Gateway destabilization:

- **No global state**: All state lives in the plugin's scoped closure. No `globalThis` mutation, no module-level `let`/`var` that accumulates across calls.
- **No blocking I/O**: All file operations (audit chain, WAL) use async APIs. Sync operations are prohibited in generated code.
- **Max heap budget**: The policy evaluation engine pre-allocates fixed-size lookup tables at initialization. No dynamic allocation during `before_tool_call` evaluation. Classification tables are `ReadonlyMap` with bounded size.
- **No event loop blocking**: Long-running operations (SIEM export, audit chain verification) are deferred to Tier 2-4 fanout, never in the hook handler path.

### Emergency Bypass (F-PU-05)

For emergencies where governance is blocking legitimate work and a policy fix cannot wait:

```bash
CLAWS_BYPASS=1 openclaw start
```

When `CLAWS_BYPASS=1` is set in the environment:
- All `before_tool_call` handlers return immediately (no block, no approval)
- Audit chain still records every tool call with `bypassed: true` flag
- A prominent warning is emitted at Gateway startup: `⚠ CLAWS GOVERNANCE BYPASSED — all tool calls ungoverned`
- The bypass is logged to SIEM as a critical event
- `claws check` reports BYPASS_ACTIVE as a critical finding

This is the "break glass" escape hatch. It does NOT disable audit -- every action is still recorded for post-incident review.

### Clean Uninstall (F-PU-06/CB-08)

`claws uninstall` removes all claws artifacts from the workspace:

```
$ claws uninstall

  Backup location: ~/.claws-backups/2026-04-11T14-30-00/

  Removed:
  - skills/claws-governance/ (L1 skill)
  - plugins/claws-governance/ (L2+L3 plugin)
  - .claws/ (policies, audit, cache, compiled)

  Restored:
  - openclaw.json (original from backup)
  - exec-approvals.json (original from backup)

  Preserved (NOT deleted):
  - ~/.claws-backups/ (all backups)
  - ~/.claws-audit-archive/ (audit chain archive)

  Governance fully removed. Workspace is ungoverned.
```

Key design decisions:
- **Backups stored OUTSIDE `.claws/`**: At `~/.claws-backups/<timestamp>/`. Deleting `.claws/` (via `rm -rf .claws`) does not destroy restore files.
- **Audit chain preserved**: Governance audit history is archived to `~/.claws-audit-archive/` before removal. Compliance requires audit trail survival beyond governance uninstall.
- **Idempotent**: Running `claws uninstall` on an already-uninstalled workspace is a no-op.
- **`--purge` flag**: `claws uninstall --purge` also removes `~/.claws-backups/` and `~/.claws-audit-archive/`. Requires explicit confirmation.

## Constraints

- **R5 fail-closed is non-negotiable**: Impersonation tools must never execute when governance is degraded.
- **Handler registration, not method override**: `onBeforeToolCall(handler)` returns Disposable. Multiple handlers compose in order.
- **Async everything**: Even fast decisions may need async audit recording.
- **Correlation IDs everywhere**: Every context object carries correlationId for end-to-end tracing.
- **Deny-default on handler error**: If a handler throws, the decision is DENY.
- **Conservative crash recovery**: Budget reserves counted as spent. Approval timeouts do not reset. CGR chain is source of truth.
- **Data sensitivity propagates upward**: Diamond merge inherits highest sensitivity from all inputs.
- **Error type in persistent failure alerts**: Persistent failure alerts must include the error type for triage. TypeError = code bug (fix rule tables). RangeError = recursion (may affect all tools). AbortError = performance (may resolve with higher hookTimeoutMs). *(Source: SCV-S06-F04)*
- **failedTools in health endpoint**: The health endpoint must expose persistent failure data via a `failedTools` array listing tools with consecutive crash counts above threshold. *(Source: SCV-S06-F06)*
- **Governance hook independence from other plugins**: If another plugin's before_tool_call hook throws before the governance hook runs, the governance plugin must not depend on other plugins executing correctly. *(Source: SCV-S05-F02)*
- **Hot-reload hook ordering**: If the governance plugin is hot-reloaded, its hooks must re-register at the front of the hook chain, not be appended at the end. *(Source: SCV-S05-F05)*
- **Plugin vs internal hook distinction**: The governance plugin must be first among PLUGIN hooks, not necessarily first among ALL hooks (which may include internal Gateway hooks like telemetry). *(Source: SCV-S05-F07)*

## Pitfall-Coverage-2 Amendments (PC2-S01 through PC2-S15)

**Persistent handler failure with catch-clause crash** (PC2-S01-F04 major, PC2-S01-F05 major): The L5 sidecar MUST detect 3+ consecutive crashes for the same tool within 60s and trigger a structured alert. `claws recover --tool <name>` forces governance re-evaluation with fresh state: rebuild riskMap, reload rules.json, re-register handler. Recovery does NOT require a full workspace recompile.

**Crash vs policy distinction in sidecar alerts** (PC2-S01-F06 warning): Persistent failure alerts distinguish "tool blocked due to governance bug" (actionable -- fix the handler) from "tool blocked due to policy" (correct -- tool genuinely requires R5 approval). Alert includes crash stack trace for operator, never for user or agent.

**Independent sidecar crash detection** (PC2-S01-F09 warning): If process.stderr.write fails (pipe broken, full buffer), the last-resort audit is lost. The sidecar has an independent crash detection mechanism via handler health monitoring, not relying on handler stderr output.

**Secondary audit trail for fail-open events** (PC2-S07-F01 major, PC2-S07-F02 major, PC2-S07-F03 major): All fail-open events write to process.stderr using structured JSON: `{"event":"CLAWS-FAILOPEN","tool":"read-logs","risk":1,...}`. The sidecar captures stderr independently. If stderr itself is broken, the sidecar detects fail-open events by monitoring handler crash patterns independently of the handler's own reporting.

**SIEM-compatible audit format** (PC2-S07-F07 warning): The stderr audit uses structured JSON lines for SIEM ingestion: `{"event":"CLAWS-FAILOPEN","tool":"...","risk":N,...}`. Plain key=value format may conflict with other stderr output.

**Immutable snapshot protocol for classification cache** (PC2-S04-F04 major, PC2-S04-F05 major): The handler clones the classification cache at evaluation start and works on the clone. The live cache is replaced atomically (compare-and-swap) after evaluation completes. If AbortSignal fires, the clone is discarded. The classification cache is `ReadonlyMap` after initialization. The `ReadonlyMap` type is enforced in generated code via `Object.freeze()` or TypeScript's `ReadonlyMap<string, number>`.

**Fallback to previous evaluation on interrupt** (PC2-S04-F08 warning): Interrupted handler returns cached classification from previous successful evaluation, not a default. The previous-evaluation snapshot must always be retained.

**Proactive timeout budget warning** (PC2-S04-F07 warning): When evaluation time consistently approaches the configured timeout (80% threshold), the sidecar triggers advisory CLAWS-W050 recommending increased `hookTimeoutMs`.

**Unsigned elicitation approval is unverifiable** (PC2-S07-F04 major, PC2-S07-F05 major): G-ELICIT must warn if audit chain signing is not configured alongside elicitation policies. Warning severity scales: info for R1-R3, warning for R4, error for R5. Unsigned R5 approvals are inadmissible in legal discovery.

**Compliance framework mapping for audit gaps** (PC2-S07-F08 warning): SOC2 requires event logging (P-078 fail-open audit gap). HIPAA requires verifiable authorization (P-096 unsigned approvals). Both are compliance failures for different reasons and must be independently flagged.

## Pitfall-Final-1 Amendments (PF1-S01 through PF1-S26)

### PF1: Catch Clause Immunity and Single Point of Failure (P-109)

**Catch clause single point of failure** (S10-F01 major): The catch clause is the ONLY defense between governance evaluation failure and Gateway fail-open. Zero function calls other than Map.get, zero property chains >1, zero allocations. If catch throws, R5 tools execute ungoverned.

**Explicit null toolName guard** (S10-F05 major): `if (!toolName) return deny(5)` before Map lookup. Visible null handling for audit rather than implicit Map.get(null) -> undefined.

### PF1: Per-Tool Recovery Bypass (P-124)

**Per-tool recovery bypass** (S15-F02 major): `claws recover --tool write-db` provides temporary bypass. Time-limited (default 1 hour), logged in audit chain, requires explicit operator confirmation. Emergency escape hatch for governance bugs blocking critical tools.

**Governance error vs policy block distinction** (S15-F03 major): Error message distinguishes "blocked by policy" (intended) from "blocked by governance error" (unintended). Includes error location and recovery command.

**Basic failure detection without sidecar** (S15-F05 major): Without sidecar (L1-L4), plugin implements basic detection: if tool blocked 3+ times by governance errors (not policy), emit stderr warning with recovery instructions.

### PF1: Governance Hook Ordering (P-125)

**Plugin ordering advisory at compile time** (S16-F01 major): EMIT warns if governance plugin not first in openclaw.json. Warning includes exact change: "Move claws-governance to position 1 in openclaw.json plugins array." Cannot modify openclaw.json (lossless principle).

**Pre-governance exception bypass** (S16-F02 major): Plugin throwing before governance = bypass vector. Gateway may skip remaining hooks. Governance must not depend on other plugins executing correctly.

**Short-circuit pattern defense** (S16-F03 major): Malicious plugin can clone event, call tool directly, bypass hooks. Sidecar (L5) is the defense -- operates outside Gateway plugin system.

**Runtime hook ordering check** (S16-F04 warning): `claws check` verifies governance position at runtime by querying Gateway plugin registry. "CLAWS-W030: governance plugin at position 2 of 3."

**Post-init ordering instruction** (S16-F05 major): `claws init` output: "IMPORTANT: Ensure claws-governance is FIRST plugin in openclaw.json." Extra prominent if existing plugins detected.

**Hot-reload hook re-ordering** (S16-F06 warning): Hot-reload re-appends hooks at end. Governance hot-reload must re-register at position 1. If platform doesn't support, block governance hot-reload with warning.

**Fleet plugin ordering enforcement** (S16-F07 warning): `claws fleet scan` checks plugin ordering across all managed workspaces. Fleet-level security property.

### PF1: Persistent Handler Silent Block Detection (P-126)

**Per-tool crash counter** (S17-F01 major): Plugin implements basic failure detection: per-tool counter. After 3 consecutive failures: "CLAWS-W050: write-db governance evaluation failed 3 consecutive times. Tool blocked by fail-closed. Run 'claws recover --tool write-db'."

**Error signature tracking** (S17-F02 major): Distinguish same TypeError repeating (persistent bug) from different errors (systemic issue). Counter tracks error signatures (type + message hash).

**Configurable detection thresholds** (S17-F03 major): Default crash count (3) and time window (5 minutes) configurable in claws.json. Frequent tools (100 calls/min) vs rare tools (1/day) need different thresholds.

**Sidecar full detection capabilities** (S17-F04 warning): L5 provides: configurable thresholds, external notification (Slack, PagerDuty), automatic recovery, dashboard. Plugin basic detection (L2) is minimum viable for L1-L4 deployments.

**Crash counter reset on success** (S17-F05 major): Counter resets to 0 on tool success. Prevents false alerts from transient failures. Only persistent (consecutive) failures trigger alert.

**Threshold crossing audit entry** (S17-F06 warning): Audit records both individual failures and threshold crossing as distinct entries. SIEM can trigger workflows on threshold entries.

### PF1: Systemic Failure Classification (P-127)

**Error classification taxonomy** (S18-F01 major): RangeError = systemic (all tools), TypeError = per-tool (argument-specific), AbortError = timeout (per-call), SyntaxError = configuration. Each class drives different escalation path.

**Correlated failure detection** (S18-F02 major): 3+ different tools failing with same error type within 10 seconds = systemic, not per-tool. Detector switches to systemic alert. Includes all affected tools and common error type.

**Catch clause immune to RangeError** (S18-F03 major): Catch clause minimalism (P-109). Map.get does not recurse, cannot trigger RangeError. Catch must not be vulnerable to same error class that triggered try-block failure.

**Immediate escalation for systemic errors** (S18-F04 major): Not 3-strikes threshold of per-tool detection. Immediate alert on first RangeError. Bypasses crash counter. L2 emits stderr, L5 sends external alert.

**Bounded rule evaluation recursion** (S18-F05 warning): Maximum recursion depth (e.g., 100) with clear error: "rule evaluation exceeded maximum depth, possible circular policy reference." Prevents RangeError.

**Aggregate failure rate monitoring** (S18-F06 warning): Sidecar monitors success rate. Sudden 99% -> 0% = systemic failure. Aggregate rate sufficient for detection.

### PF1: riskMap Initialization Safety (P-132)

**Fatal initialization on riskMap failure** (S23-F01 major): Handler refuses to register if riskMap validation fails. Logs: "claws governance plugin failed to initialize: corrupt rules.json. Governance NOT active. All tools UNGOVERNED."

**riskMap validation requirements** (S23-F02 major): At least 1 entry, all values integers 1-5, map frozen (ReadonlyMap). Any validation failure = handler does not register.

**Undefined riskMap catastrophe** (S23-F03 major): Undefined riskMap = catch clause crashes = ALL tools ungoverned. Worse than empty map (all blocked). Handler ensures riskMap NEVER undefined.

**Fatal plugin failure signaling** (S23-F05 major): Plugin indicates fatal failure. If Gateway doesn't support fatal plugin failure, stderr + every available channel. Operator must know governance is down.

**Sidecar plugin health monitoring** (S23-F06 warning): L5 detects governance plugin initialization failure. For L1-L4, stderr warning is only notification.

### PF1: Partial Emit False Confidence (P-133)

**Partial emit creates false confidence** (S24-F02 major): SKILL.md present + index.ts absent = advisory without enforcement. WORSE than no governance because operator believes protection exists.

### PF1: Runtime Startup Consistency (P-134)

**Runtime startup consistency check** (S25-F06 warning): Gateway plugin validates its risk classifications against exec-approvals.json at startup. Logs: "Risk classification drift detected. Plugin: R3, exec-approvals: R5 for write-db. Run 'claws build' to reconcile."

### PF1: exec-approvals Field Name Validation (P-135)

**Runtime field validation** (S26-F04 warning): OC platform ignores unknown fields (lenient JSON). Runtime cannot detect "deny" vs "blocked" mismatch. Compile-time schema validation compensates.

## Pitfall-Final-2 Amendments (PF2-S01 through PF2-S26)

**Sidecar emergency deny policy on missing handler** (PF2-S01-F05 major): If handler refuses to register, OC Gateway has no governance hook. Sidecar detects "handler not registered" state and applies emergency deny policy for R4/R5 tools while allowing R1/R2 to proceed.

**No-governance-layer kill switch** (PF2-S01-F08 warning): If both handler and sidecar are down, platform-level kill switch disables workspace entirely. Ultimate backstop when no governance layer is operational.

**Registration failure diagnostic to sidecar** (PF2-S01-F04 major): Fatal registration error produces structured diagnostic to both stderr and sidecar alert channel: corrupt field path, expected schema version, recovery command.

**Timeout abort path by risk level** (PF2-S05-F04 major): Generated abort path for hook timeout: R4/R5 = deny (fail-closed), R1/R2 = allow with audit. Branches on pre-computed riskMap, does not re-classify in abort handler.

**Cache interruption audit logging** (PF2-S06-F05 major): AbortSignal interruption during cache update logged as structured audit event: tool name, old classification, intended new classification, abort fact.

**Read-only cache during tool calls** (PF2-S06-F06 warning): Classification cache read-only during tool call handling. Updates only during explicit reclassification. Eliminates AbortSignal corruption for common path.

**Runtime plugin order verification** (PF2-S08-F06 warning): Sidecar verifies plugin order at runtime startup and alerts if different from compile-time expectation. CLAWS-W060 is compile-time; sidecar covers runtime dynamic loading.

**Dynamic fleet identity monitoring** (PF2-S18-F07 warning): Sidecar monitors new agent registrations in fleet and re-runs collision detection. Collision from new workspace joining fleet detected within 60 seconds.

**Trust-context-aware content scanning** (PF2-S19-F04 major): Runtime content scanning uses trust context. SOUL.md instructions are trusted (operator-authored). User input at runtime is untrusted. Trust boundary determines which scanning rules apply.

**Lightweight runtime content scanning** (PF2-S19-F08 note -> warning-adjacent): Content scanning must be lightweight: pattern matching, not LLM-based analysis. Complex injection detection belongs in separate middleware, not governance handler.

**Fail-open detection latency SLA** (PF2-S10-F06 warning): Sidecar detects and alerts for fail-open events within 5 seconds for R2 tools with fail-open config. Limits ungoverned write window.

**Independent sidecar fail-open detection** (PF2-S10-F04 major): Sidecar detects fail-open by monitoring handler return value patterns: series of "allow" returns after crash. No reliance on handler's own reporting.

**Crash + audit corruption coupling** (PF2-S10-F01 major): Same crash that triggers fail-open corrupts audit chain. Audit writer shares state with crashed handler. Zero record of ungoverned execution. Requires independent secondary audit mechanism.

**Allocation-free stderr secondary audit** (PF2-S10-F02 major, PF2-S10-F03 major): Fail-open events write to process.stderr as JSON line. Write must be synchronous, allocation-free. Pre-formatted buffer pre-allocated at handler registration.

**Log flooding prevention** (PF2-S10-F07 warning): Batch fail-open events aggregated after first 3 individual records: `{"event":"CLAWS-FAILOPEN-BATCH","count":10,"tools":[...]}`.

**Immutable timeout configuration** (PF2-S26-F02 major): Object.freeze() on timeout configuration after handler registration. Runtime mutation by malicious skill blocked. Prevents compound attack (P-160).

**Runtime configuration integrity monitoring** (PF2-S26-F06 warning): Sidecar periodically verifies timeout configuration matches compile-time value. Drift = critical alert: "timeout modified at runtime -- possible malicious skill."

**Original tool call snapshot in handler** (PF2-S08-F03 major): Handler snapshots original tool call at entry via Object.freeze(). Classifies using snapshot.name. Difference between snapshot and current = "CLAWS-W061: tool call name mutated by prior plugin."

## Anubis-Thoth Amendments

### Fleet Operations

**Delegation depth limit emission independent of cycle detection** *(Source: FO-S07-F06)*: The runtime delegation depth limit (default 10 hops) must be emitted by the compiler regardless of whether a delegation cycle was detected at compile time. Fleet scan may detect a cycle and the workspace owner may ignore the warning; the runtime plugin must enforce the depth limit independently as the safety net for cycles that escape compile-time detection.

**Plugin ordering enforcement or verification mechanism** *(Source: FO-S09-F01)*: The OC Gateway's plugin loading order is determined by configuration, not by claws compilation. Since the spec relies on governance-first plugin ordering for security, there must be a mechanism to enforce ordering at compile time or verify it at scan time. The governance plugin's position in the chain depends on workspace owner configuration, which claws cannot control.

**Governance plugin self-position verification at runtime** *(Source: FO-S09-F04)*: On first tool call, the governance plugin should check whether it is the first handler registered for `before_tool_call`. If not, it logs a warning to the audit chain. This runtime self-check complements the fleet-level static check. The Gateway API may not expose handler registration order, so this is best-effort.

**Governance ignores prior plugin approvals** *(Source: FO-S09-F05)*: If a custom auth plugin runs before governance and approves an R5 tool call, the governance plugin receives the call with an "already approved" context. The governance plugin must ignore any prior approval and evaluate independently. Prior-approval bypass is a real attack vector: a malicious plugin could pre-approve all calls to circumvent governance. The governance evaluation is authoritative regardless of prior plugin decisions.

**Sidecar monitoring for plugin config changes** *(Source: FO-S09-F06)*: Plugin ordering may change after deployment. A workspace that passes the fleet ordering check today may have its plugin config modified tomorrow. The sidecar (L5) should monitor plugin configuration files and alert on ordering changes that move the governance plugin away from the first position. This is the runtime complement to the fleet scan's static ordering check.

**Late validation mode for uncontrollable plugin ordering** *(Source: FO-S09-F08)*: For workspaces where reordering is not possible (third-party Gateway configurations), the governance plugin should support a "late validation" mode: instead of blocking tool calls before execution, it audits tool calls after execution and flags violations for post-incident review. Late validation is weaker but better than no governance when ordering cannot be enforced.

### OBO Elicitation

**TOCTOU check between approval and execution** *(Source: OE-S01-F06)*: Between the time the user approves an R5 tool call and the tool executes, the tool parameters could be modified by a prompt injection in the conversation context. The approval token binds to specific parameters, but the runtime must verify that the actual tool call parameters match the approved parameters before execution. This closes the time-of-check-time-of-use vulnerability in the approval flow.

**Deny response delivery guarantee** *(Source: OE-S02-F09)*: If the timeout fires but the deny response fails to reach the Gateway (network partition, process crash), the tool call hangs indefinitely. The deny-on-timeout handler must have its own internal timeout (5s after the denial decision) to force-return the block response. If even that fails, the Gateway's own tool call timeout is the last resort. This provides a three-layer delivery guarantee.

**Dynamic agent OBO delegation enforcement** *(Source: OE-S03-F08)*: G-ELICIT-CHAIN enforcement at compile time (FE6) can only check static AGENTS.md configurations. Dynamic agent spawning (coordinator creates executor at runtime) bypasses compile-time checks entirely. The runtime handler must enforce the single-hop OBO delegation rule independently of compile-time validation, analogous to the three-layer R5 fail-closed defense (schema, compiler, runtime).

**Clock integrity for standing approval time windows** *(Source: OE-S05-F03)*: The time-window check at runtime depends on the system clock. If the clock is manipulated (NTP poisoning, VM time drift), an R5 tool could execute outside its authorized window. The runtime handler must use a monotonic clock for timeout enforcement and verify wall-clock time against a trusted source when evaluating standing approval conditions.

**Proximate vs original sender in A2A trust evaluation** *(Source: OE-S08-F03)*: A malicious agent could avoid the OBO gate by encoding the DM target in a non-obvious way: using a channel alias that resolves to a DM, a group DM that looks like a channel, or posting to a public channel and immediately deleting it. The context evaluation must use the resolved target type (as determined by the platform API), not the agent-supplied target string. Runtime target resolution before OBO classification is required.

**Target resolution before OBO classification** *(Source: OE-S08-F03)*: Context-dependent OBO classification requires runtime resolution of ambiguous targets. The compiler emits the resolution hook, but the runtime handler must call the platform API to resolve agent-supplied target strings to their actual types (DM vs channel, private vs public) before applying the classification rule. Without runtime resolution, agents can bypass OBO gates through encoding tricks.

### A2A Governance

**Default-deny for dynamic agents** *(Source: A2A-S01-F02)*: Default-deny at compile time means FE6 flags missing trust declarations. But agents spawned dynamically at runtime (not declared in AGENTS.md) have no compile-time trust validation. The runtime handler must enforce default-deny for ALL agent pairs, regardless of whether they were declared at compile time. Unknown agent identities default to no trust.

**Lateral movement pattern detection from correlated blocks** *(Source: A2A-S06-F01)*: Lateral movement detection requires correlating multiple blocked events from the same agent identity. Individual blocks (default-deny, ceiling exceeded, identity mismatch) are handled by separate rules, but the PATTERN of repeated blocks from the same source agent within a time window is the lateral movement signal. The audit chain must support correlation queries and a dedicated lateral movement detector should trigger on N blocked communication attempts within a configurable window.

**Lateral movement alert context** *(Source: A2A-S06-F03)*: A misconfigured agent that accidentally tries to reach a payment processor looks identical to a compromised one. The lateral movement alert must include context to help operators distinguish between misconfiguration and compromise: recent prompt injection indicators, trust policy changes, or skill updates that coincide with the blocked attempts.

**Progressive lateral movement escalation response** *(Source: A2A-S06-F05)*: The escalation response for detected lateral movement should be progressive: (1) 1 blocked attempt = normal operation, log only; (2) 3 blocked attempts in 60s = SIEM alert + operator notification; (3) 5 blocked attempts in 60s = quarantine the agent (block ALL communication, not just denied targets). The quarantine threshold must be configurable per workspace or fleet policy.

**Correlated SIEM export for lateral movement incidents** *(Source: A2A-S06-F08)*: Lateral movement detection generates security incident audit events that must be exported to SIEM in near-real-time (not batch). The SIEM export should include the full attack chain (all blocked attempts with timestamps) as a single correlated incident, not individual events. This enables SIEM correlation rules to match the complete attack pattern.

**Agent-level quarantine vs workspace-level kill switch** *(Source: A2A-S06-F09)*: The out-of-band kill switch (CB-05) is currently workspace-level (all governance goes to deny-all). When the sidecar detects a lateral movement pattern, it should have the authority to quarantine the specific agent (surgical kill) or the entire workspace (broad kill). Agent-level quarantine is a finer-grained response that preserves other agents' functionality while isolating the threat.

**Side-channel data exfiltration defense via G-CONTEXT + G-DATA** *(Source: A2A-S06-F06)*: A compromised agent blocked from direct A2A communication may write sensitive data to a shared resource (file, memory entry, environment variable) that another agent reads. This side-channel bypass is invisible to A2A governance because no A2A communication occurs. G-DATA labels and memory isolation (G-CONTEXT) are the runtime defenses for side-channel data exfiltration, and must be enforced at the handler level.

### Injection Defense

**G-INPUT runtime scan classification** *(Source: ID-S01-F05)*: G-INPUT-01 requires runtime detection of instruction-like content crossing the DATA boundary via regex or classifier scanning of all DATA-layer content, which adds latency to every tool call. The spec must classify this scan as Tier 2 (async, best-effort) or Tier 1 (sync, blocking) within the Event Fanout framework. If the scan is expensive, it may need to be async rather than blocking within the 50ms hook budget.

**G-CONTEXT marker injection fail-closed** *(Source: ID-S02-F04)*: If the G-CONTEXT marker injection hook crashes (e.g., malformed UTF-8), tool output enters context WITHOUT boundary markers -- exactly the vulnerability the markers are supposed to prevent. G-CONTEXT enforcement must be fail-closed for the marker injection step regardless of tool risk level. Even R1 (observe) tool output must not bypass markers on crash.

**Per-tool sub-boundaries within DATA layer** *(Source: ID-S02-F05)*: The 4-layer context assembly defines layer boundaries but not intra-layer isolation. If multiple tool outputs are present in the DATA layer, an attacker who controls one tool's output could position content to influence interpretation of an adjacent tool's output. Per-tool sub-boundaries within the DATA layer are required to prevent cross-tool content manipulation.

**Truncation protection mechanism per platform** *(Source: ID-S01-F07)*: The spec states Layer 1 (GOVERNANCE) is "never truncated" but does not specify the mechanism. Context window truncation in long conversations may remove the GOVERNANCE layer (first in = first truncated by some providers). For OpenClaw, the plugin must use a protected context slot or pin the governance preamble. Without this mechanism, the primary defense evaporates under context pressure.

**Per-turn data flow graph for chain validation** *(Source: ID-S06-F01)*: G-OUTPUT-04 (chain validation) requires tracking data provenance across tool calls within a turn: which tool outputs feed which tool inputs. The runtime must maintain a data flow graph per session/turn. The compile-time check can only verify that chain validation is enabled; the runtime must build and analyze the provenance graph to detect chains like web-search -> summarize -> draft-email -> send-email.

**Proximate data provenance granularity** *(Source: ID-S06-F02)*: The data flow graph must be constructed from tool call sequence, not from content analysis. A conservative approach treats ALL prior tool outputs as potential inputs to the current tool call, but this over-approximation blocks all downstream R5 calls after any external tool. The spec must define provenance granularity: per-tool (coarse, conservative) or per-content (fine, requires NLP, unreliable).

**Graceful halt procedure for G-BOUND limit exceeded** *(Source: ID-S04-F07)*: When G-BOUND limits are exceeded, an abrupt halt abandons in-progress work: partial file writes, open connections, pending subagent tasks. The halt should allow the agent to complete cleanup (close files, notify subagents) before termination, with a short grace period (5s for cleanup, no new tool calls allowed during the grace window).

**WAL write latency bounds and lag window risk** *(Source: ID-S04-F02)*: The governance WAL is a synchronous Tier 1 operation, but if WAL writes become a bottleneck during rapid tool calls, the budget counter may lag behind actual spending. An injection could exploit the WAL lag window to exceed the budget limit before the counter catches up. The spec must define WAL write latency bounds and document the lag window risk.

**Chain validation data structure for O(1) amortized lookups** *(Source: ID-S06-F07)*: Chain validation adds overhead to every tool call (maintaining the data flow graph, checking provenance rules). For chains of 10+ tools, validation may exceed the per-hook latency budget of 50ms. The graph operations must use O(1) amortized data structures (append-only log with indexed lookup) rather than O(n) graph traversal per tool call.

**Memory loading error behavior** *(Source: ID-S05-F05)*: G-CONTEXT-03 differentiates memory loading contexts (system prompt = error, user message = warning, tool call = note). Memory loaded during context assembly (before_prompt_build hook) is system prompt context where an error blocks the entire session. The spec must define whether "error" means blocking the individual memory entry (load without it) or the entire session (per-entry vs session-level failure).

**Flag memory entries without write-audit provenance** *(Source: ID-S05-F04)*: If the governance handler crashes during a memory write (R3, configurable fail-mode), the entry is written without governance audit. When loaded in a subsequent session, there is no audit trail for the write. The absence of a write audit event for a memory entry must be flagged as a provenance gap during memory load, alerting the runtime to potentially unaudited content.

**Symmetric entry/exit boundary markers per context layer** *(Source: ID-S01-F01)*: The spec defines boundary markers as `<<<GOVERNANCE_END>>>` but does not specify DATA-layer entry markers. Without a symmetric `<<<DATA_START>>>` marker, there is no way for the runtime to detect if content has escaped the DATA layer. The governed context assembly needs both entry and exit markers for each layer, not just exit markers.

### Compliance Evidence

**SIEM export sidecar vs batch consistency** *(Source: CE-S05-F09)*: The sidecar (L5) provides real-time SIEM forwarding (Tier 2 async) while `claws audit export` is a batch operation (Tier 4) for historical data. Both may produce overlapping data for the same governance events. Both must produce identical event representations for the same event to avoid SIEM deduplication issues and ensure consistent forensic analysis.

**Streaming export for large audit chains** *(Source: CE-S05-F08)*: Export of 5,000+ events could produce large files. The export must support streaming output (write to stdout, pipe to SIEM ingestion) rather than requiring the full export to be written to disk first. For enterprise deployments with millions of events, the export must be streamable with constant memory usage to avoid OOM during compliance evidence generation.

## Pitfall Scenario Amendments (P-162 through P-249)

### Three-Ring Coordination

**P-168: Watcher Fires During Doctor** *(Sources: PA-S07-F03)*: The sidecar (L5) must respect the inner ring's pause token during middle ring operations like `doctor --fix`. When a pause token is active, the sidecar holds alerts for the pause duration rather than firing immediately on intermediate governance IR states. This prevents false CRITICAL alerts during maintenance operations where files are in transient inconsistent states.

**P-170: Broadcast Stale Governance** *(Sources: PA-S09-F04)*: The governance plugin must independently detect policy staleness by comparing the policy overlay timestamp with its own build timestamp. If the policy is newer than the build, the plugin enters degraded mode and denies R4/R5 tools until recompilation completes. This is the runtime safety net for the stale enforcement window between fleet broadcast push and workspace recompilation.

**P-184: Pre-Governance Plugin R5 Bypass** *(Sources: PA-S23-F01, PA-S23-F02, PA-S23-F03, PA-S23-F04, PA-S23-F06, PA-S23-F07)*: The governance plugin must perform authoritative evaluation regardless of any prior plugin decisions in the chain. The plugin must strip or ignore all "approved," "denied," or "deferred" flags set by prior plugins, treating them as untrusted input. Context isolation must be architectural -- the approval field must not be accessible to the governance plugin's input, not merely ignored by convention. R5 fail-closed is enforced regardless of any prior-plugin context. The audit trail records when the governance plugin overrides a prior approval, and a warning is emitted if the governance plugin detects it is not the first plugin in the chain. Plugin ordering documentation must note that the isolation guarantee holds regardless of ordering.

### OBO Elicitation

**P-197: Approval Token TOCTOU** *(Sources: PT1-S01-F02, PT1-S01-F03, PT1-S01-F05, PT1-S01-F07, PT1-S01-F08)*: Parameter serialization for approval token hashing must use canonical form (sorted keys, no whitespace) to ensure deterministic hashing. The approve-and-execute must be a single atomic operation from the runtime's perspective -- no intervening operations between approval consumption and tool execution. The audit event for parameter mismatch must include both approved and attempted parameter hashes (not raw parameters). On mismatch, denial is final with no re-prompt, and the parameter hash must be computed by the runtime at both approval and execution time, never by the agent.

**P-198: Stale Approval Token Replay** *(Sources: PT1-S02-F04, PT1-S02-F05, PT1-S02-F06)*: The runtime must respond to expired-token denials with a structured "re-elicitation-required" error, enabling the agent framework to trigger a new approval rather than endlessly retrying. A single approval token must be consumed exactly once, tracked via a short-lived nonce cache (TTL = validity window + grace period). The nonce cache must be bounded with an LRU policy, and timestamp checks must precede nonce lookups to reject obviously stale tokens before consuming cache capacity.

**P-199: Approve-on-Timeout Override** *(Sources: PT1-S03-F02, PT1-S03-F06, PT1-S03-F08)*: The capability probe for AbortSignal must test actual abort callback behavior, not just API surface existence. A platform could expose AbortSignal in type definitions without implementing the abort. For managed Gateway environments, the probe must run at registration time against the actual runtime, not rely on a configured version string. Defense-in-depth requires a secondary per-invocation AbortSignal verification at each R5 tool execution, covering the TOCTOU between probe and invocation.

**P-200: Duplicate Approval Retry** *(Sources: PT1-S04-F02, PT1-S04-F05, PT1-S04-F06, PT1-S04-F07)*: The deduplication window must align with the elicitation timeout. Pending requests remain in the table for the full timeout duration, removed only after resolution. Suppression must occur at the Gateway level before the prompt reaches the UI transport to prevent race conditions. When the user responds, the outcome propagates to all deduplicated retries and the tool executes exactly once. The deduplication table should be persisted to a durable store (e.g., SQLite WAL) for crash-resilient deduplication.

**P-201: Approval Fatigue Flood** *(Sources: PT1-S05-F02)*: When the per-agent rate limit is exceeded, all subsequent R5 requests from that agent within the window must be denied silently before reaching the UI transport. The user must not see excess prompts -- displaying them with auto-deny still imposes cognitive load. The denial happens at the runtime layer, not at the UI rendering layer.

**P-202: Deny Delivery Failure** *(Sources: PT1-S06-F01, PT1-S06-F02, PT1-S06-F03, PT1-S06-F04, PT1-S06-F05, PT1-S06-F06, PT1-S06-F07)*: The runtime must implement a 5-second internal delivery timeout for deny responses with escalation to a force-abort control endpoint on a separate channel from the elicitation transport. If both delivery paths fail, a critical split-brain security event is recorded. The Gateway must independently deny-on-timeout (Gateway timeout strictly greater than runtime timeout, e.g., 35s vs 30s). Delivery acknowledgment must be end-to-end from the Gateway, not transport-level ACK from intermediate proxies. Stale denies arriving after partition recovery are logged but not applied if the call already resolved. The audit reconciliation process compares runtime and Gateway logs to detect divergence.

**P-203: Transitive OBO Relay** *(Sources: PT1-S07-F04)*: The runtime must block all unapproved R5 invocations intent-agnostically. Even well-intentioned agents that read another agent's output and logically conclude they should take the next step must obtain their own per-invocation approval. Intent is unverifiable; approval tokens are verifiable. The enforcement mechanism relies on agent-bound approval tokens, not behavioral analysis.

**P-204: USER.md Injection Escalation** *(Sources: PT1-S08-F04, PT1-S08-F08, PT1-S08-F09)*: Governance-critical path detection must resolve canonical absolute paths before comparison, handling symbolic links, path traversal, and case-insensitive matching on Windows. Detection must hook into all file-modification vectors -- not just the file-write tool, but also shell commands, git operations, and file copies. After a blocked governance file modification attempt, the agent session is flagged for elevated monitoring for the remainder of the session, as the attempt is a strong signal of prompt injection compromise.

**P-206: Clock Manipulation Bypass** *(Sources: PT1-S10-F01, PT1-S10-F02, PT1-S10-F03, PT1-S10-F04, PT1-S10-F05, PT1-S10-F06, PT1-S10-F07, PT1-S10-F08)*: The runtime must use dual-clock verification for time-bounded standing approvals: system wall clock cross-checked against monotonic clock and a trusted external NTP source queried every 5 minutes. Drift exceeding 30 seconds suspends all time-bounded standing approvals. Monotonic clock must be used for all security-critical elapsed-time calculations (token expiry, rate limiting, cooldown). Container environments must originate their own outbound NTP queries rather than trusting the host clock. VM suspend/resume events (monotonic gap > 5 seconds) trigger mandatory wall-clock re-verification. Timezone resolution must use the approval's configured timezone, not the system timezone. When the trusted time source is unavailable, time-bounded approvals fail-closed to per-invocation elicitation.

**P-207: Timing Side Channel** *(Sources: PT1-S11-F06, PT1-S11-F07)*: For enterprise deployments, the handler process should run with process isolation (separate container or VM) from agent processes to mitigate hardware-level timing channels beyond software constant-time comparison. The error response for failed signature verification must include a fixed delay matching average tool execution overhead to prevent timing-based approval status inference.

**P-208: Approval Key Exposure** *(Sources: PT1-S12-F02, PT1-S12-F09)*: The compiled handler must access the approval key through a platform API (keychain, secrets manager) at handler startup, never by reading a file. The key is loaded into process memory and zeroed on exit using secure memory wipe. If the approval key is compromised, the runtime must support emergency key revocation that invalidates all existing tokens immediately and forces recompilation with a new key, propagated to all deployed handlers within seconds via a dedicated revocation endpoint.

### A2A Governance

**P-210: Dynamic Agent Default Deny** *(Sources: PT1-S14-F01, PT1-S14-F02, PT1-S14-F03, PT1-S14-F04, PT1-S14-F05, PT1-S14-F06, PT1-S14-F07, PT1-S14-F08)*: The runtime must treat absence from the governance IR as DENY, not ALLOW -- the fundamental default-deny principle. Dynamic agent spawning is supported via a registration API that creates a minimal trust profile inheriting the spawner's trust level minus one tier, with a hard ceiling preventing dynamic agents from exceeding their spawner's trust. The runtime must have independent trust enforcement that does not depend on compile-time artifacts for completeness. Audit trail must distinguish "policy-deny" from "unknown-agent-deny" and include spawner identity. Rate limiting on dynamic agent creation via G-BOUND prevents probing attacks. Denied agents receive structured remediation without leaking governance details.

**P-211: Transitive Trust Bridging** *(Sources: PT1-S15-F08)*: Runtime enforcement must complement compile-time bridge detection. Even if the compiler flags a bridge at compile time, dynamic group assignment at runtime could create new bridges. The runtime must re-check group membership on every delegation that crosses a group boundary, ensuring no transitive trust path is created through shared group membership after compilation.

**P-213: Confidential-to-Public Data Flow** *(Sources: PT1-S17-F06)*: Runtime enforcement must complement compile-time label chain detection. Dynamic delegation at runtime can create data flow paths not visible at compile time. The runtime must track data labels on every message and enforce the high-water-mark at every hop, ensuring CONFIDENTIAL data never flows to agents rated below CONFIDENTIAL regardless of the number of intermediate hops.

### Injection Defense

**P-216: Side-Channel Exfiltration** *(Sources: PT1-S20-F01, PT1-S20-F02, PT1-S20-F03, PT1-S20-F05, PT1-S20-F07, PT1-S20-F08)*: The runtime must enforce file system label tracking: when an agent writes a file, the data label of the writing agent is recorded against the file path, and subsequent reads verify the reading agent's clearance level meets the file's label. Environment variables must be isolated per agent, and each agent gets its own temp directory with writes to shared /tmp blocked. Shared memory regions require per-agent isolation or documented risk acceptance. The audit trail must capture per-agent file operations for both real-time enforcement and forensic reconstruction.

**P-217: Boundary Marker Forgery** *(Sources: PT1-S21-F01, PT1-S21-F02, PT1-S21-F03, PT1-S21-F04, PT1-S21-F05, PT1-S21-F06, PT1-S21-F07, PT1-S21-F08)*: Static boundary markers are a known-broken pattern. Markers must include a per-session random nonce (minimum 128 bits from CSPRNG) that is computationally infeasible to guess. Defense-in-depth requires both nonce-based markers AND output sanitization to strip or escape marker-like substrings. The marker format should use syntactically improbable patterns (UUID-bearing delimiters). Post-assembly validation must count markers and abort if the count differs from expected. The marker abstraction must be provider-agnostic. Audit trail records forgery attempts with source tool and exact forgery string. Encoding-aware sanitization must operate on decoded content, not raw bytes.

**P-218: Nonce Leaks Enable Forgery** *(Sources: PT1-S22-F01, PT1-S22-F02, PT1-S22-F03, PT1-S22-F04, PT1-S22-F05, PT1-S22-F06, PT1-S22-F07, PT1-S22-F08)*: The session nonce is a secret with cryptographic-key-level confidentiality. It must never appear in error messages, log entries, debug output, or any content entering the context. A post-assembly nonce-presence scan must abort assembly if the nonce appears in content rather than as a marker. Boundary markers must be stripped from the model's visible context so the model never sees actual marker strings. Crash handlers must redact nonce patterns from stack traces. Nonce rotation (per-N-turn) limits blast radius of any leak. Debug mode must never be enabled in production, and the compiler must refuse to emit governance plugins with debug mode active. Third-party tool integrations must respect the assembled context confidentiality contract.

**P-219: Marker Injection Crash** *(Sources: PT1-S23-F01, PT1-S23-F02, PT1-S23-F03, PT1-S23-F04, PT1-S23-F05, PT1-S23-F06, PT1-S23-F07, PT1-S23-F08)*: The marker injection hook MUST be fail-closed on any error. If the hook throws for any reason -- malformed UTF-8, OOM, timeout, or any exception -- the tool output is blocked, never passed through without markers. UTF-8 sanitization must occur before marker injection logic. The hook must be defensive against all crash vectors: malformed encoding, null bytes, control characters, extremely long output, and regex catastrophic backtracking. Catch blocks must be audited for fail-open anti-patterns. Safe static error templates replace raw output on failure. Fuzz testing must verify fail-closed invariant in CI. Hook timeout triggers fail-closed, and three consecutive failures from the same tool escalate to tool suspension for the remainder of the session.

**P-223: Cross-Session Memory Poisoning** *(Sources: PT1-S27-F05, PT1-S27-F09)*: The memory write API must distinguish between user-initiated writes (keyboard input) and agent-initiated writes (tool calls), passing caller type explicitly rather than inferring it. The runtime must support a "session review" command allowing the user to retrospectively mark a session as compromised, triggering bulk tainting of all memory entries from that session so future sessions do not load poisoned instructions into the INSTRUCTION zone.

**P-224: Chain Tool Injection** *(Sources: PT1-S28-F01, PT1-S28-F02, PT1-S28-F03, PT1-S28-F04, PT1-S28-F05, PT1-S28-F06, PT1-S28-F07, PT1-S28-F08, PT1-S28-F09)*: Per-turn data flow graph analysis is the primary defense against chain injection. The runtime constructs a directed graph of all tool calls per turn, with data provenance tracked across transformations (label inheritance). Outbound tools (send-email, WebFetch POST, Bash curl) are classified as EXTERNAL sinks via the tool manifest, and any data flow from a higher label to a lower sink classification is blocked. Chain analysis must detect when outbound tool destinations originate from untrusted content. G-ELICIT approval prompts must include the full data flow chain context. Cross-turn tracking is the aspirational target beyond per-turn analysis. The algorithm must be O(V+E) to avoid perceptible latency. Chain alerts integrate with G-ELICIT for user override. Per-turn data flow graphs are persisted in the audit trail.

**P-225: Preamble Truncation** *(Sources: PT1-S29-F01, PT1-S29-F02, PT1-S29-F03, PT1-S29-F04, PT1-S29-F05, PT1-S29-F07, PT1-S29-F09)*: The governance preamble must be pinned to a protected position exempt from context window truncation, with platform-specific mechanisms (system messages, priority markers). If the platform lacks pinning, the runtime implements its own "sliding window with pinned prefix" truncation strategy. Context pressure detection triggers a warning at 80% usage and begins proactive summarization of old tool output. Per-tool-call output is capped (e.g., 4096 tokens) to prevent intentional context flooding. A preamble sentinel string is verified before every model request, and if missing, the runtime refuses to send and re-injects the preamble. ALL governance-carrying messages must be pinned, not just the system message. Context truncation events are recorded in the audit trail with preamble status.

### Budget Enforcement

**P-221: WAL Lag Budget Overshoot** *(Sources: PT1-S25-F01, PT1-S25-F02, PT1-S25-F03, PT1-S25-F04, PT1-S25-F05, PT1-S25-F06, PT1-S25-F07, PT1-S25-F08)*: Budget enforcement must use synchronous in-memory atomic counters with reserve-before-dispatch semantics, not WAL reads. The WAL is a persistence mechanism for crash recovery, not an enforcement mechanism. Concurrent tool calls require atomic compare-and-swap (CAS) for correct concurrent decrements. WAL write latency must have a configurable ceiling (default 100ms). The counter must track three states: reserved (dispatched), consumed (completed), and remaining. Crash recovery uses the WAL counter as a floor with a safety margin for un-persisted entries. Token-based budgets (post-response) are distinguished from call-count budgets (pre-dispatch) as separate enforcement modes. Audit events for overshoot include financial impact estimates.

**P-222: Halt Abandons Work** *(Sources: PT1-S26-F01, PT1-S26-F02, PT1-S26-F03, PT1-S26-F04, PT1-S26-F05, PT1-S26-F06, PT1-S26-F07, PT1-S26-F08)*: Budget limit halt must include a graceful 5-second cleanup period (configurable, capped at 30s) during which no new tool calls are allowed but in-progress operations complete or roll back. Write operations must use atomic write semantics (write-to-temp, rename-on-success). Subagents receive a cancellation signal with force-termination as fallback. Open resources are closed in LIFO order. Every tool call should follow atomic semantics: fully completed or fully rolled back, never partially applied. Halt state is persisted for session continuity. Audit events distinguish clean halt (all operations finalized) from dirty halt (operations force-terminated), with dirty halts triggering automatic workspace integrity checks at next session start.

### Compliance Evidence

**P-227: Tampered Chain Undetectable** *(Sources: PT2-S02-F07)*: The sidecar (L5 ring) must maintain an independent running hash of the audit chain. If the sidecar's hash diverges from the chain file's hash, tampering occurred between the sidecar and the storage. This serves as a second witness independent of the external witness service, providing defense-in-depth against sophisticated chain rewrite attacks where the attacker recomputes valid internal hashes.

**P-230: HIPAA Audit Chain PHI** *(Sources: PT2-S05-F06)*: The sidecar (L5 ring) that monitors the audit chain must be classified as PHI-handling if it reads chain entries containing PHI. The sidecar's own logs, metrics, and alerts must not leak PHI. Alert messages triggered by PHI-containing chain entries must redact all PHI before transmission to monitoring systems, ensuring that the sidecar's operational telemetry does not become a secondary PHI exposure surface.

**P-231: CEF Severity Mapping Undefined** *(Sources: PT2-S06-F08)*: The sidecar (L5 ring) generates its own events (persistent crash, resource exhaustion, dead-man-switch trigger) that must have explicit CEF severity mappings. A dead-man-switch trigger (governance-offline) must map to CEF 10 (emergency) because it indicates complete loss of governance enforcement. All sidecar-generated events must be included in the normative CEF mapping table alongside governance plugin events.

## Open Questions

1. Should `claws init` detect existing hook/plugin registrations and warn about conflicts with other governance tools?
2. Should the sidecar emit Envoy WASM filters for service mesh integration, or remain a standalone container?
3. Should the `before_tool_call` hook support a "challenge" response alongside ALLOW/DENY/MODIFY?
4. Should `claws watch` hot-reload runtime enforcement handlers when classifications change?
5. How does GovernanceHost version? Breaking changes, capability negotiation, deprecation protocol?
6. Should `CLAWS_BYPASS=1` require a second confirmation (e.g., `CLAWS_BYPASS_CONFIRM=yes`) to prevent accidental activation?
7. Should the immutable snapshot protocol use structural sharing (persistent data structures) to reduce clone overhead for large classification caches? *(Source: PC2-S04)*
8. Should the sidecar emergency deny policy be configurable per-workspace, or is R4/R5 deny always the right default? *(Source: PF2-S01)*

## Research References

| Source | What it contributed |
|--------|-------------------|
| Q12i | 5 insertion points, `claws init` as installer, defense-in-depth matrix, fail-mode policy, per-platform init spec |
| Q12r | GovernanceHost 6-facet interface, governed context assembly (4 layers), 6 composition patterns, WAL crash recovery, 4-tier event fanout |
| R1 review | CB-01 fail-open fix, CB-04 sidecar default, CB-08 backup location, skill vs plugin correction, hook latency/memory bounds, bypass and uninstall |
