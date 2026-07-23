# Guardrail Provider

<!-- atom:guardrail-provider (C96) -->

Composable governance interface for the OpenClaw Gateway -- pluggable pre-authorization, post-audit, and deterministic decision composition.

> **Reading order**: This is the entry point for the ecosystem guides. No prerequisites. Next: [Aether Integration](aether-integration.md).

---

## Overview

The guardrail provider model defines how governance providers plug into the OC Gateway -- the request interception point where tool calls are evaluated before execution (see [OpenClaw](openclaw.md) for the full platform context). Providers classify risk, authorize or deny tool calls, modify arguments, and audit results. Multiple providers compose using deterministic priority ordering: deny beats review beats modify beats allow.

The `GuardrailProvider` interface and its supporting types (`ToolCall`, `AuditableResult`, `ProviderCapabilities`) are defined in the **OpenClaw governance specification** -- a design contract that host platforms implement. claws-sdk implements the **authorization decision types** and **composition semantics** from that spec, not the provider interface itself. Any OC developer can implement a `GuardrailProvider` and register it in the gateway.

---

## The interface

The `GuardrailProvider` interface is defined in the OpenClaw governance specification -- it is not yet implemented as a TypeScript interface in claws-sdk. The SDK implements the **decision types and composition semantics** that the spec defines, using them directly in guardrail composition logic.

The spec-level interface defines three methods:

- **preAuthorize** -- called before tool execution. Returns one of four `AuthorizationDecision` variants.
- **postAudit** -- called after tool execution. Fire-and-forget: failures are logged but never block.
- **getCapabilities** -- reports what the provider supports (risk classification, audit trail, external approval, argument modification).

The decision types (`AllowDecision`, `DenyDecision`, `ReviewDecision`, `ModifyDecision`) and risk level types are implemented in `claws-sdk/src/governance/guardrail-types.ts`.

---

## Authorization decisions

Decisions are a discriminated union on the `decision` field. Each variant carries only its valid fields -- invalid states are unrepresentable.

| Decision | Meaning                         | Key fields                                |
| -------- | ------------------------------- | ----------------------------------------- |
| `allow`  | Tool call proceeds              | `requiresExternalApproval?`, `riskLevel?` |
| `deny`   | Tool call is blocked            | `reason` (required), `ruleId?`            |
| `review` | Held for human review           | `requiresExternalApproval: true` (always) |
| `modify` | Proceeds with changed arguments | `modifiedArguments` (required)            |

---

## Risk levels

Two risk level representations exist at different layers:

- **`RiskLevel`** (governance layer, `guardrail-types.ts`): numeric `1 | 2 | 3 | 4 | 5`. Used by `resolveApprovalGate` and composition logic.
- **`ToolRiskLevel`** (IR/emit layer, `capability-manifest.ts`): string union `'critical' | 'high' | 'medium' | 'low'`. Used in GovernanceIR and emitted policies. Note: there is no R1 equivalent in `ToolRiskLevel` -- the minimum is R2 (`'low'`).

See [Tool Classification](tool-classification.md) for the full table with governance controls and examples.

---

## Provider composition

The composition model chains multiple providers with deterministic priority ordering:

```
deny (3) > review (2) > modify (1) > allow (0)
```

When multiple providers return different decisions:

| Scenario                   | Result                                         |
| -------------------------- | ---------------------------------------------- |
| Any deny                   | **deny** wins (first deny's reason used)       |
| No deny, any review        | **review** wins                                |
| No deny/review, any modify | **modify** wins (last modify's arguments used) |
| All allow                  | **allow**                                      |

Additional composition rules:

- **R5 enforcement**: if ANY provider reports risk level 5, `requiresExternalApproval` is forced to `true`. This is enforced by the registry, not individual providers.
- **requiresExternalApproval** is OR'd across all providers.
- **Empty registry**: returns allow with a console WARNING, alerting operators to missing configuration.

---

## ShellExecProvider reference implementation (planned)

The OpenClaw spec defines `ShellExecProvider` as a reference implementation that wraps the existing `exec-approvals.json` format as a `GuardrailProvider`. This is not yet implemented in claws-sdk. The planned behavior:

- Only produces `AllowDecision` (with or without external approval)
- Unknown tools are fail-closed: `requiresExternalApproval: true`, classified as R5
- No audit capability (postAudit is a no-op)
- No argument modification

---

## ToolCall structure (specification)

The OpenClaw governance spec defines the `ToolCall` input that providers receive. This type is not in claws-sdk -- it is implemented by each host platform:

- **server** -- MCP server name
- **tool** -- tool name within the server
- **arguments** -- tool input (providers MAY inspect but MUST NOT modify; use `ModifyDecision.modifiedArguments` instead)
- **context** -- conversation ID, optional agent ID and workspace ID
- **extensions** -- host-specific context (consumers MUST ignore unknown keys)

---

## Key types

| Type                          | Module                                 | Purpose                                        |
| ----------------------------- | -------------------------------------- | ---------------------------------------------- |
| `AuthorizationDecision`       | `claws-sdk/governance/guardrail-types` | Discriminated union (allow/deny/review/modify) |
| `RiskLevel`                   | `claws-sdk/governance/guardrail-types` | Numeric risk levels 1-5                        |
| `AllowDecision`               | `claws-sdk/governance/guardrail-types` | Tool call proceeds                             |
| `DenyDecision`                | `claws-sdk/governance/guardrail-types` | Tool call blocked                              |
| `ReviewDecision`              | `claws-sdk/governance/guardrail-types` | Held for human review                          |
| `ModifyDecision`              | `claws-sdk/governance/guardrail-types` | Proceeds with changed arguments                |
| `FailMode` / `FailModeConfig` | `claws-sdk/governance/guardrail-types` | Per-risk-level fail behavior                   |

> `GuardrailProvider` (interface), `ProviderRegistryImpl`, and `ShellExecProvider` are defined in the OpenClaw governance specification but not yet implemented as classes in claws-sdk.

---

## Related concepts

- [OpenClaw](openclaw.md) -- the platform and OC Gateway that hosts guardrail providers
- [Aether Integration](aether-integration.md) -- host approval policies emitted from GovernanceIR
- [OBO Boundary](obo-boundary.md) -- R5 on-behalf-of actions require external approval
- [Elicitation Gate](elicitation-gate.md) -- human-in-the-loop approval flow
- [Tool Classification](tool-classification.md) -- risk level assignment consumed by providers
