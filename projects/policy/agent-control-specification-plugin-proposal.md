# OpenClaw Agent Control Specification Plugin Proposal

## Audience

This proposal is for an engineer on Microsoft Agent Control Specification (ACS)
or Agent Governance Toolkit (AGT) who wants to author an OpenClaw plugin that
brings ACS runtime governance into OpenClaw without making core OpenClaw
Microsoft-specific.

## Goal

Build an optional OpenClaw plugin that can load ACS manifests, evaluate ACS
intervention points during OpenClaw agent execution, and enforce ACS decisions
through OpenClaw's existing model, tool, approval, audit, and doctor surfaces.

The plugin should prove the ACS contract inside a real OpenClaw runtime while
keeping OpenClaw core vendor-neutral. Core should expose small generic
governance hooks; the ACS plugin should own ACS manifest parsing, ACS policy
runtime integration, ACS-specific doctor checks, and ACS documentation.

## Background

ACS is described by Microsoft as an open, vendor-neutral runtime governance
standard for agents. Its core artifact is a portable manifest that declares
where and how policies are evaluated across the agent lifecycle, independent of
agent framework, runtime, or policy engine.

Primary references:

- Microsoft ACS announcement:
  https://commandline.microsoft.com/agent-control-specification-runtime-governance/
- Microsoft Foundry trust-stack announcement:
  https://devblogs.microsoft.com/foundry/build-2026-open-trust-stack-ai-agents/
- AGT / ACS source:
  https://github.com/microsoft/agent-governance-toolkit/tree/main/policy-engine

## Non-Goals

- Do not add ACS-specific config, policy language, or Microsoft product
  dependencies directly to OpenClaw core.
- Do not replace OpenClaw's existing approvals, sandbox posture, provider
  routing, plugin policy, or doctor conformance checks.
- Do not require Microsoft Agent 365 for local ACS enforcement.
- Do not make LLM judges mandatory. Deterministic Rego/Cedar/classifier policy
  should work without model calls.
- Do not make the first milestone a complete lifecycle implementation. Start
  with the smallest enforceable point, preferably `pre_tool_call`.

## Proposed Package

Suggested package name:

```text
@openclaw/plugin-agent-control
```

Alternative names:

```text
@openclaw/plugin-acs
@microsoft/openclaw-agent-control
```

The plugin should be publishable and installable through OpenClaw's normal
plugin flow. If Microsoft authors it, Microsoft can own the package while using
OpenClaw's public plugin SDK and runtime governance hooks.

## User Experience

Minimal setup:

```bash
openclaw plugin install @openclaw/plugin-agent-control
openclaw config set plugins.agent-control.enabled true
openclaw config set plugins.agent-control.manifest .guardrails.yaml
openclaw doctor --deep
```

Example plugin config:

```json
{
  "plugins": {
    "agent-control": {
      "enabled": true,
      "manifest": ".guardrails.yaml",
      "mode": "enforce",
      "providerJudges": {
        "enabled": true,
        "defaultModel": "openai/gpt-5.5"
      }
    }
  }
}
```

Mode semantics:

- `off`: plugin installed but inactive.
- `audit`: evaluate ACS and emit evidence, but do not block.
- `warn`: warn and audit; only hard deny runtime errors that would be unsafe to
  ignore.
- `enforce`: apply ACS decisions to model calls, tool calls, output, and
  approvals.

## ACS To OpenClaw Lifecycle Mapping

| ACS intervention point | OpenClaw host point                                        | Initial support |
| ---------------------- | ---------------------------------------------------------- | --------------- |
| `agent_startup`        | agent/session startup after config resolution              | Advisory first  |
| `input`                | inbound user/channel message before agent context assembly | Phase 2         |
| `pre_model_call`       | provider request before dispatch                           | Phase 2         |
| `post_model_call`      | provider response before tool/action handling              | Phase 3         |
| `pre_tool_call`        | tool invocation before execution                           | Phase 1         |
| `post_tool_call`       | tool result before context reinjection                     | Phase 2         |
| `output`               | final user/channel response before send                    | Phase 3         |
| `agent_shutdown`       | session/run completion summary                             | Advisory first  |

Start with `pre_tool_call` because it has the clearest enforcement behavior and
the highest risk payoff: allow, deny, warn, or escalate before an action touches
the filesystem, network, gateway, provider auth, or external systems.

## Required OpenClaw Core Seam

The plugin needs a vendor-neutral runtime governance seam in OpenClaw core. The
core API should not mention ACS. A possible shape:

```ts
export type RuntimeGovernancePoint =
  | "agent_startup"
  | "input"
  | "pre_model_call"
  | "post_model_call"
  | "pre_tool_call"
  | "post_tool_call"
  | "output"
  | "agent_shutdown";

export type RuntimeGovernanceDecision =
  | { decision: "allow"; evidence?: unknown }
  | { decision: "warn"; message?: string; evidence?: unknown }
  | { decision: "deny"; reason: string; message?: string; evidence?: unknown }
  | { decision: "escalate"; reason: string; message?: string; evidence?: unknown }
  | { decision: "transform"; transformed: unknown; evidence?: unknown };

export interface RuntimeGovernanceProvider {
  id: string;
  evaluate(params: {
    point: RuntimeGovernancePoint;
    snapshot: unknown;
    mode: "audit" | "warn" | "enforce";
  }): Promise<RuntimeGovernanceDecision>;
}
```

OpenClaw core would own:

- Calling registered governance providers at supported lifecycle points.
- Building stable snapshots with redaction and provenance.
- Enforcing normalized decisions.
- Mapping `escalate` to existing OpenClaw approval flows.
- Recording audit/trajectory evidence.

The ACS plugin would own:

- Loading and resolving ACS manifests.
- Translating OpenClaw snapshots to ACS snapshot shape where needed.
- Calling the ACS runtime.
- Mapping ACS verdicts into `RuntimeGovernanceDecision`.
- ACS-specific doctor checks and docs.

## Leveraging OpenClaw AI Providers

ACS supports policy evidence from classifiers, endpoints, and LLM judges. The
OpenClaw plugin should let ACS use OpenClaw's existing provider routing instead
of requiring a separate model credential stack.

That means ACS LLM annotators or judges can call configured OpenClaw providers:

- OpenAI, Anthropic, Google, local/self-hosted, or other installed provider
  plugins.
- Existing OpenClaw model IDs such as `openai/gpt-5.5` or an organization
  default.
- Existing provider auth and secret references, without duplicating keys in the
  ACS manifest.

Proposed ACS plugin extension:

```yaml
agent_control_specification_version: "0.3.1-beta"
metadata:
  name: openclaw-governed-agent

annotators:
  sensitive_output_judge:
    type: llm
    provider: openclaw
    model: openai/gpt-5.5
    prompt: ./policies/judges/sensitive-output.md

intervention_points:
  output:
    policy:
      id: output_policy
    annotations:
      sensitivity:
        annotator: sensitive_output_judge
        from: "$.response"
```

The plugin would resolve `provider: openclaw` through an OpenClaw-owned
annotator dispatcher:

```ts
const dispatcher = createOpenClawAcsAnnotatorDispatcher({
  providerRouter,
  cfg,
  env,
  agentId,
});
```

Important constraints:

- LLM judges must be opt-in per manifest or plugin config.
- LLM judge prompts and model choices should be visible in doctor output.
- LLM judge calls should run with bounded token, timeout, and retry policy.
- LLM judge failures should follow ACS fail-closed semantics in `enforce` mode
  and downgrade only in explicit `audit` mode.
- The plugin must redact secrets and avoid sending raw tool credentials or
  private files to judge models unless the manifest explicitly authorizes that
  data class.
- Provider-backed judges should emit evidence pointers and stable decision
  metadata, not raw sensitive payloads.

## Approval Mapping

ACS `escalate` should map to OpenClaw's existing approval infrastructure rather
than invent a second approval queue.

Example:

- ACS denies direct execution of `send_email` to an external recipient.
- ACS returns `escalate` for a borderline case.
- OpenClaw creates an approval request with:
  - intervention point
  - tool name
  - redacted tool args
  - ACS policy ID
  - ACS reason/message
  - evidence pointers
- Existing OpenClaw approval clients can approve or reject.

The plugin should not own UI or channel-specific approval rendering. It should
provide structured evidence that existing approval surfaces can display.

## Tool Policy Mapping

For `pre_tool_call`, the snapshot should include:

- agent ID and workspace identity
- tool ID/name and owner plugin
- tool arguments after redaction
- command/executable plan when the tool is `system.run` or equivalent
- current approval state
- sandbox posture and cwd/workspace roots
- user/channel origin when available
- labels from prior input/model/output checks

The plugin should support tool catalog projection into ACS `tools` metadata:

```yaml
tools:
  system.run:
    type: Tool
    id: system.run
    clearance: restricted
    security_labels: ["exec", "filesystem", "network-risk"]
  send_email:
    type: Tool
    id: send_email
    clearance: internal
```

OpenClaw can generate an initial tool inventory from installed tools and plugin
manifests, but the ACS manifest remains the policy source of truth.

## Doctor Integration

The plugin should register structured doctor health checks:

- `agent-control/manifest-present`: configured manifest exists.
- `agent-control/manifest-schema`: manifest parses and validates.
- `agent-control/policy-runtime`: ACS runtime and policy engines are available.
- `agent-control/openclaw-hooks`: configured intervention points are enforceable
  by the installed OpenClaw version.
- `agent-control/provider-judges`: configured LLM judges have valid provider
  routes, model IDs, auth, timeout, and redaction posture.
- `agent-control/tool-catalog`: ACS tool IDs match OpenClaw tool IDs or declared
  aliases.
- `agent-control/dry-run`: sample snapshots can be evaluated without runtime
  errors.

Doctor should distinguish:

- hard errors that prevent enforcement
- warnings for advisory-only or unsupported points
- dry-run evidence showing what ACS would allow/deny/escalate

This fits OpenClaw's current structured doctor direction: plugin-owned health
checks should live in the plugin and register as extension health, while core
doctor ordering remains core-owned.

## Audit And Evidence

Every ACS evaluation should be able to emit an OpenClaw audit event:

```json
{
  "type": "runtime_governance.decision",
  "provider": "agent-control",
  "point": "pre_tool_call",
  "decision": "deny",
  "policyId": "email_policy",
  "reason": "external_recipient_requires_approval",
  "agentId": "main",
  "toolName": "send_email",
  "evidence": {
    "manifest": ".guardrails.yaml",
    "policyEngine": "acs",
    "redacted": true
  }
}
```

OpenClaw should store enough evidence to debug a decision without leaking raw
secrets, model prompts, private files, or sensitive user content.

## Milestones

### Milestone 0: Design Alignment

- ACS team reviews OpenClaw plugin SDK boundaries.
- OpenClaw maintainers confirm the generic runtime governance provider seam.
- Agree on whether ACS Node SDK, Rust sidecar, or local HTTP sidecar is the
  first runtime path.

### Milestone 1: Advisory Plugin

- Plugin installs and loads a manifest.
- Plugin validates schema and policy references.
- Plugin registers doctor health checks.
- Plugin can evaluate sample snapshots from `openclaw doctor --deep`.
- No runtime enforcement yet.

### Milestone 2: `pre_tool_call` Enforcement

- Core adds generic `pre_tool_call` runtime governance hook.
- Plugin evaluates ACS `pre_tool_call`.
- `allow`, `warn`, `deny`, and `escalate` are mapped to OpenClaw behavior.
- OpenClaw approvals are used for `escalate`.
- Focused tests cover system/tool allow, deny, and approval paths.

### Milestone 3: Provider-Backed Annotators

- Plugin implements `provider: openclaw` LLM annotator dispatch.
- LLM judges use OpenClaw provider routing, auth, model allowlists, and timeout
  policy.
- Doctor validates judge routes and warns on missing auth.
- Tests use a fake provider; optional live proof uses a real configured provider.

### Milestone 4: Model And Output Governance

- Add `pre_model_call`, `post_model_call`, and `output` hooks.
- Support redaction/transform where OpenClaw can safely apply it.
- Emit audit events and trajectory evidence for decisions.

### Milestone 5: Full Lifecycle And Export

- Add startup/shutdown/input/post-tool coverage.
- Add ACS manifest generation from OpenClaw tool inventory as an optional
  authoring helper.
- Add optional Microsoft Agent 365/AGT import-export alignment if desired.

## Open Questions For ACS Team

- What is the recommended Node integration path today: direct Node SDK, Rust
  native binding, or sidecar?
- Which ACS manifest version should OpenClaw target first?
- Should `.guardrails.yaml` be the preferred filename, or should OpenClaw use an
  ACS-neutral default such as `agent-control.yaml`?
- How should ACS represent OpenClaw provider-backed LLM judges without creating
  a nonportable manifest extension?
- Can ACS carry OpenClaw provider model IDs as annotations while preserving
  portability?
- What are the expected fail-closed semantics for unavailable annotators in
  audit, warn, and enforce modes?
- What evidence schema should OpenClaw persist so ACS decisions remain
  auditable and compatible with AGT tooling?

## Risks

- Runtime governance hooks are a new plugin SDK surface. They need owner review
  because they can become a sticky public contract.
- LLM judges can leak sensitive context if snapshots are not carefully redacted.
- A plugin-only implementation can be advisory but cannot reliably enforce
  pre-tool or pre-model behavior without core hooks.
- ACS manifest extensions for OpenClaw providers could reduce portability if not
  clearly isolated.
- Fail-closed behavior must be explicit; a governance plugin that silently
  downgrades failures can create false confidence.

## Recommended First PR Shape

OpenClaw core PR:

- Add a generic runtime governance provider type.
- Add one `pre_tool_call` call site.
- Add fake-provider tests for allow, deny, warn, and escalate.
- Do not mention ACS.

ACS plugin PR:

- Add plugin package.
- Load ACS manifest.
- Register doctor checks.
- Implement ACS runtime adapter.
- Implement `pre_tool_call` governance provider.
- Add fake ACS runtime tests.

This split keeps OpenClaw core reusable for other governance providers while
letting ACS demonstrate a complete end-to-end integration.
