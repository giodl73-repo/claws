# The Governance Plugin

<!-- atom:governance-plugin (C20) -->

`claws build` generates a Gateway plugin. Not a skill. This distinction is the most important architectural decision in claws's runtime enforcement design.

## Why a plugin, not a skill

In the OC codebase, skills and plugins are fundamentally different:

|                           | Skill                        | Plugin                                             |
| ------------------------- | ---------------------------- | -------------------------------------------------- |
| **Format**                | Markdown file (SKILL.md)     | TypeScript module (index.ts)                       |
| **Mechanism**             | System prompt injection      | Hook registration on Gateway                       |
| **Has hook registration** | No                           | Yes (registers on Gateway hooks)                   |
| **Can block actions**     | No (advisory only)           | Yes (`before_tool_call` returns `{ block: true }`) |
| **Can intercept**         | No                           | Yes (28 lifecycle hooks)                           |
| **Token cost**            | Yes (consumes context)       | Zero (runs in Gateway process)                     |
| **Source**                | `src/agents/skills/types.ts` | `OpenClawPluginDefinition`                         |

Skills are prompt-only. They have no `execute()` method, no hook registration, no ability to intercept or block tool calls. A skill can say "please don't access production" in the system prompt. A plugin can prevent it.

Governance that only advises is not governance. It is a suggestion. Enforcement MUST be a plugin.

## What `claws build` generates

```
plugins/claws-governance/
  index.ts              Plugin entry point, registers all hooks
  package.json          Dependencies (@claws/* as peer deps)

skills/claws-governance/
  SKILL.md              Advisory prompt (L1, pinch-compressed)

exec-approvals.json     Host-level backup (L4)
lobster.compiled.yaml   Governance-injected workflow DAG
```

The plugin is one TypeScript module that registers handlers across multiple Gateway hooks. It is NOT multiple plugins -- a single `OpenClawPluginDefinition` covers all enforcement layers.

## The `before_tool_call` hook

This is the primary enforcement point. Every tool call passes through `before_tool_call` handlers before execution. The handler classifies the tool (R1-R5), checks budget, validates A2A delegation, and enforces OBO elicitation. It returns `undefined` to allow, `{ block: true, blockReason }` to deny, or `{ requireApproval: {...} }` to prompt the user. The OC `before_tool_call` hook also supports param modification (`params` field in the return), but the claws governance plugin does not use this capability -- it classifies and blocks, never rewrites.

```typescript
api.on("before_tool_call", async (event, ctx) => {
  const risk = classifyToolRisk(event.toolName, event.params);
  if (exceedsBudget(event, ctx)) return { block: true, blockReason: "G-BOUND: budget exceeded" };
  if (requiresUserApproval(event, risk))
    return { block: true, blockReason: "G-ELICIT: user approval required" };
  return undefined; // allow
});
```

## The `requireApproval` pattern

For OBO elicitation, the OC plugin API supports a richer approval flow than
simple `{ block: true }`. The `before_tool_call` hook can return a
`requireApproval` object that prompts the user inline:

```typescript
api.on("before_tool_call", async (event, ctx) => {
  const risk = classifyToolRisk(event.toolName, event.params);
  if (requiresUserApproval(event, risk)) {
    return {
      requireApproval: {
        title: `${event.toolName} requires approval`,
        description: `This tool is classified R${risk} and acts on behalf of the user.`,
        severity: "critical",
        timeoutMs: 300_000,
        timeoutBehavior: "deny",
        onResolution: async (decision) => {
          await auditApprovalDecision(event, decision);
        },
      },
    };
  }
  return undefined; // allow
});
```

The user sees 5 possible `PluginApprovalResolution` values:

| Resolution     | Meaning                                               |
| -------------- | ----------------------------------------------------- |
| `allow-once`   | Approve this single tool call                         |
| `allow-always` | Approve all future calls of this type in this session |
| `deny`         | Reject the tool call                                  |
| `timeout`      | No response within timeoutMs -- deny-default applies  |
| `cancelled`    | User dismissed the approval prompt                    |

Use `requireApproval` for elicitation gates (OBO actions, R5 tools). Use
`{ block: true }` for hard denials (budget exceeded, policy violation) where
no user override is appropriate.

## 28 lifecycle hooks available

The Gateway exposes 28 hooks (as of OC v2.x). The governance plugin uses a subset:

| Hook                  | Governance use                                   | Layer |
| --------------------- | ------------------------------------------------ | ----- |
| `before_tool_call`    | Classification, elicitation, budget, permissions | L2    |
| `after_tool_call`     | Audit chain append, output validation            | L3    |
| `subagent_spawning`   | A2A trust escalation check, delegation depth     | L3    |
| `before_prompt_build` | Context assembly, governance layer injection     | L3    |
| `llm_output`          | Output filtering (PII, secrets, URLs)            | L3    |
| `gateway_start`       | Handler registration, table initialization       | L3    |
| `gateway_stop`        | WAL flush, audit chain finalization              | L3    |

Not all 28 hooks are used. The plugin registers only what the compiled governance rules require. If your workspace has no OBO tools, no elicitation hook is registered.

## The 50ms latency budget

The `before_tool_call` handler has 50ms to evaluate and return. This is non-negotiable -- the gateway-eng persona enforces it. The budget breaks down:

| Operation                           | Time  |
| ----------------------------------- | ----- |
| Tool classification (lookup table)  | <1ms  |
| Budget check (counter comparison)   | <1ms  |
| A2A delegation check (graph lookup) | <5ms  |
| Policy evaluation (rule table scan) | <10ms |
| Total typical                       | <17ms |
| Hard cap (`AbortSignal.timeout`)    | 50ms  |

If evaluation exceeds 50ms, the handler aborts and applies fail-mode:

- R1-R2: configurable (default: fail-open -- don't break reads)
- R3-R4: configurable (default: fail-closed for enterprise)
- R5: deny (non-negotiable)

## Generated code constraints

The plugin TypeScript protects the Gateway: no global state (scoped closures only), no blocking I/O (async APIs only), no dynamic allocation in hooks (`ReadonlyMap` tables pre-allocated at init), no event loop blocking (SIEM/audit deferred to async tiers), and no `@craftworks/*` imports. A Gateway engineer reading `index.ts` sees straightforward TypeScript -- hook registration, lookup tables, allow/deny returns.

**Catch clause minimalism** (emit-S07-F01, P-070): The try/catch in the handler must be the simplest possible code. No allocations, no async, no logging. The risk level is pre-computed at registration time via `riskMap.get(toolName) ?? 5` -- if the tool is unknown, it defaults to fail-closed. If the catch clause itself throws, the Gateway's fail-open default takes over and R5 tools execute ungoverned.

**AbortSignal propagation** (emit-S06-F01): The timeout wrapping must pass the AbortSignal to evaluatePolicy. Without propagation, evaluatePolicy continues running after the timeout and its side effects persist. The handler uses `evaluatePolicy(event, ctx, { signal })` so the signal can abort internal operations.

**Error type distinction** (emit-S06-F06): The handler distinguishes AbortError (timeout -- "evaluation took too long") from TypeError (bug -- "code crashed"). Both trigger fail-mode, but audit events record the cause type for diagnosis.

**Async error handling** (emit-S07-F06): The handler uses `await evaluatePolicy(event, ctx)` to catch Promise rejections. Unhandled microtask rejections must not escape the catch clause.

**Missing rule tables** (emit-S03-F07): If the plugin loads but `.claws/compiled/` is absent (user ran `claws build` without `claws compile`), the handler detects missing rule tables at first call and falls back to fail-closed for ALL tools rather than crashing.

**Post-emit static verification** (emit-S07-F02): Every build runs static analysis on the generated code: verifies try/catch coverage, risk-level branching correctness, and R5 block:true presence. This is a CI-gate check.

**TypeScript version targeting** (emit-S03-F06, P-082): Generated code targets a configurable minimum TS version (default: ES2020). No `satisfies` keyword, no newer syntax unless the target allows it.

**Node.js version compatibility** (emit-S06-F04, P-077): AbortSignal.timeout() requires Node 18+. For older versions, the generated code includes a setTimeout-based polyfill.

## Fail-mode and guard composition

```
R1-R2: configurable (default: fail-open)  |  R3-R4: configurable  |  R5: FAIL-CLOSED (non-negotiable)
```

R5 is structural -- `FailMode<5>` resolves to `"fail-closed"` only in the GovernanceIR type system. The compiler, `claws check`, and the runtime handler enforce this independently.

Inside `before_tool_call`, 8 checks compose in order: classify, checkBudget, checkA2A, filterInput, elicit, EXECUTE, validateOutput, audit. Custom guards can be injected at 8 extension points but cannot override governance DENYs.

## For the gateway-eng

This plugin is a guest in your process. It respects the 50ms budget, uses pre-allocated tables, defers heavy work to async tiers, and fails gracefully. If the plugin throws, it catches its own exception and applies risk-based fail-mode (R1-R2 configurable, default open; R3-R4 configurable, default closed; R5 always closed) before the Gateway's `catchErrors` default has a chance to swallow it. The user can disable specific enforcement layers without disabling all governance. `CLAWS_BYPASS=1` is the emergency exit -- it allows all calls but still records everything for audit.

## Scenario-Driven Additions

### From fleet-operations scenarios (89 findings applied)

- Governance plugin marker (`__claws_governance: true`) enables fleet scan identification of governed workspaces
- Plugin ordering enforcement: governance plugin must verify its own position (first or early) at runtime via self-position check
- Governance plugin ignores prior plugin approvals and performs authoritative evaluation independently
- Sidecar monitoring for plugin config changes detects dynamic unregistration or reordering
- Late validation mode for environments where plugin ordering cannot be controlled at install time
- Fleet context input for inherited policy resolution flows into the ANALYZE phase

### From injection-defense scenarios (47 findings applied)

- Guardrail Sandwich (G-INPUT, G-CONTEXT, G-BOUND, G-OUTPUT) layers fire at different chain steps, not sequentially
- Nonce-based boundary markers replace fixed markers to prevent forgery; nonce confidentiality enforced (never in content)
- G-CONTEXT marker injection is fail-closed independent of R-level -- crash during injection blocks the tool call
- Per-turn data flow graph for chain validation detects multi-tool exfiltration invisible to individual guards
- Truncation protection mechanism per platform prevents governance preamble from being evicted by context pressure
- Memory entry provenance tracking with trust labels (SYSTEM/DATA/UNTRUSTED) enables cross-session taint analysis

## For the founder

The generated plugin looks like something an OC contributor would write. Standard TypeScript, standard hook registration, standard `OpenClawPluginDefinition`. No proprietary runtime, no phone-home, no vendor lock-in. If the user runs `claws uninstall`, the plugin directory is removed and the Gateway runs exactly as it did before -- because claws never modified the Gateway, only added to it.
