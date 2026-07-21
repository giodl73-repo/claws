# Scout Agent Capability Profile Proposal

Status: source proposal; the filed and maintained architecture is
`bic/lobster#5336` and
`docs/design/2026-07-20-scout-standard-capability-profile.md` on its branch.

## 2026-07-21 Maintainer Revision

Omar's review and the subsequent source audit supersede these initial details
below:

- consequence-scaled confirmation is the governing rule: bounded/local work
  runs, externally visible work asks once, and unnecessary high-blast work is
  unavailable;
- product capabilities should be typed first-party plugin/code-mode primitives,
  with exec used only for a removable diagnostic bundle;
- normalized `tools.exec.mode` is pinned to `ask`; managed policy must reject
  model-reviewed `auto` and unguarded `full` in the same atomic change;
- OpenClaw `coding` remains rejected; the current omitted profile is already
  allow-only, so `minimal` primarily makes ownership explicit and avoids future
  profile inheritance;
- Lobster #5284 was a two-call build-time shim prototype and closed without
  merging. Lobster #5349 tracks release integration for native single-call
  `M365.messages.saveAttachment(...)`; the pinned `@agents/tools` 0.2.7 does
  not expose it yet;
- V1 includes typed Scout product-bug filing over the existing consent-gated
  runtime rail (#5346). General GitHub/ADO issue creation is Phase 2;
- `tools.fs.workspaceOnly=true` confines mutation while pinned OpenClaw
  v2026.5.28 already permits resolved skill directories as additional
  read-only roots. Sandbox workspace mounts remain `none`/`ro`;
- implementation is split into profile/policy, release-gated attachment, and
  typed product-bug slices.
- Phase 2 requires two MOS3 `AgentConnector` + `AgentSkill` pairs—GitHub Issues
  and Azure DevOps Work Items—not generic in-container tracker plugins. Exact
  `server__tool` selector binding must land before either connector is
  acquirable by `scout-standard`; runtime MCP identity/approval rails are
  reused.
- The canonical implementation stack now lives in the Lobster architecture:
  OpenClaw exec-mode policy, Lobster OpenClaw pin/patch rebase, inventory
  generation, atomic profile activation, native attachment package/integration,
  typed product-bug plugin, then evals. Phase 2 starts with a fixture-proven
  exact connector-selector gate before either tracker connector.

The remainder records the original source audit and proposal evolution. Where
it differs from this revision, the filed Lobster architecture is authoritative.

## Thesis

Scout should ship one explicit, inspectable capability profile that can complete
normal knowledge-work tasks without blanket auto/yolo mode.

The profile should:

- allow read and mutation inside the agent workspace;
- allow governed Microsoft 365 and issue-tracker tools;
- keep shell execution approval-gated and allowlisted;
- deny elevated and high-blast runtime control by default;
- expose binary attachment materialization without sending base64 through the
  model or requiring shell decoding.

This should reuse OpenClaw's existing tool profiles, per-agent configuration,
workspace filesystem guard, plugin/MCP tool names, and exec approvals. Lobster
should compose and validate the profile, not create another permission engine.

## Problem

Hosted Scout currently has enough capability to answer questions but not enough
to reliably complete common tasks:

- save an email attachment into the workspace;
- edit or create workspace files without tool-list surprises;
- file a product bug or tracker issue through an approved connector;
- run a bounded diagnostic command without repeated `exec` deny/ask misses.

The operational workaround is to add individual `alsoAllow` entries, switch on
auto mode, or use exec for missing product capabilities. That creates three
costs:

1. capability is discovered through failures rather than declared by role;
2. safe tasks inherit shell approval friction;
3. broad auto/yolo settings become attractive because the narrow path is
   incomplete.

## Current Source-Backed State

### OpenClaw

- Core profiles are `minimal`, `coding`, `messaging`, and `full`.
- The `coding` profile already includes `read`, `write`, `edit`,
  `apply_patch`, and `exec`.
- `tools.fs.workspaceOnly=true` confines read/write/edit/apply-patch to the
  workspace. Its default is `false`.
- The built-in `write` tool accepts UTF-8 text.
- Chat request attachments can be decoded, stored, and staged into an agent
  workspace, including bounded non-image attachments.
- Gateway `artifacts.download` can return transcript artifact bytes as base64
  or a URL, but it is an operator API rather than a model-facing workspace
  materialization tool.
- The optional file-transfer plugin can move binary files to and from paired
  nodes with explicit path policy. It does not retrieve WorkIQ/Graph
  attachments.
- Exec supports host, allowlist, ask, safe-bin, and attributable approval
  evidence.

Primary OpenClaw sources:

- `src/agents/tool-catalog.ts`
- `src/config/types.tools.ts`
- `src/agents/agent-tools.read.ts`
- `src/agents/sessions/tools/write.ts`
- `src/gateway/chat-attachments.ts`
- `src/gateway/server-methods/artifacts.ts`
- `extensions/file-transfer/src/tools/descriptors.ts`

### Lobster

- PR #3623 aligned the baked configuration with the managed policy baseline.
- PR #4247 removed baked sandbox defaults.
- PR #4345 restored approval-gated gateway exec.
- PR #4362 restored OpenClaw's default tool posture while retaining targeted
  denies.
- Current `openclaw.tools.json` uses targeted denies plus a hand-maintained
  `alsoAllow` list. It does not set `tools.fs.workspaceOnly=true`.
- Current policy allows only `minimal` and `messaging` profiles. The desired
  Scout behavior can stay on `minimal` and add an exact generated inventory,
  avoiding implicit inheritance from the broader `coding` profile.
- WorkIQ code mode exposes clone-safe Microsoft 365 data APIs. It does not
  expose a blob-to-workspace attachment operation.
- The self-diagnosis path can submit Lobster feedback through the adapter, but
  it is not a general GitHub or Azure DevOps issue-creation capability.

Primary Lobster sources:

- `src/openclaw_container/config/openclaw.tools.json`
- `src/openclaw_container/config/policy.global.jsonc`
- `src/openclaw_container/plugins/workiq-code-mode/`
- `src/openclaw_container/src/bug_report_api.rs`

## Proposed V1 Contract

### 1. A Lobster-owned `scout-standard` composition

`scout-standard` is a product profile name, not a new OpenClaw core profile.
Lobster materializes it using the existing fail-closed `minimal` profile plus
an exact generated inventory:

```jsonc
{
  "tools": {
    "profile": "minimal",
    "fs": {
      "workspaceOnly": true
    },
    "deny": [
      "process",
      "code_execution",
      "gateway",
      "sessions_send",
      "sessions_spawn",
      "subagents",
      "browser",
      "image_generate",
      "music_generate",
      "video_generate",
      "tts"
    ],
    "exec": {
      "security": "allowlist",
      "ask": "on-miss",
      "host": "auto"
    },
    "alsoAllow": [
      "read",
      "write",
      "edit",
      "apply_patch",
      "exec",
      "web_search",
      "web_fetch",
      "image",
      "sessions_list",
      "sessions_history",
      "cron",
      // Lobster-owned plugin/MCP tool ids generated from the approved profile.
    ]
  }
}
```

The exact generated `alsoAllow` entries remain owner-declared. They must not be
copied into multiple overlays or reconstructed by runtime feature code.

The managed policy baseline should continue to permit `minimal`, require
`tools.fs.workspaceOnly=true`, permit `exec.ask=on-miss` only with attributable
allowlist evidence, preserve elevated-default-off, and retain the targeted deny
requirements.

### 2. Approved capability classes

| Capability | V1 posture |
| --- | --- |
| Workspace read/write/edit/patch | Allowed only inside the active workspace |
| WorkIQ code mode | Allowed as the current compound capability; destructive/outbound methods retain the existing user-confirmation contract |
| Email attachment save | Allowed through the bounded WorkIQ operation below |
| Product self-diagnosis feedback | Allowed through the existing Lobster path |
| GitHub/ADO issue creation | Explicit namespaced connector tools; connector-owned approval and delegated identity |
| Exec | Visible, allowlisted, `ask=on-miss`, no elevated execution |
| Process management / arbitrary code execution | Denied |
| Gateway administration | Denied |
| Cross-agent/session mutation | Denied |
| Browser and media generation | Denied; image understanding remains allowed |

Omitting a tool from the profile means unavailable. It must not silently fall
back to exec.

### 3. WorkIQ attachment materialization

Add one source-specific WorkIQ operation:

```ts
WorkIQ.outlook.saveAttachment({
  messageId,
  attachmentId,
  destinationPath,
  overwrite?: false,
})
```

Required behavior:

- resolve the attachment using the caller's delegated WorkIQ identity;
- stream bytes without placing base64 in model context;
- resolve `destinationPath` beneath the active workspace;
- reject absolute paths, traversal, symlink escapes, directories, and
  over-limit files;
- refuse overwrite by default;
- write atomically;
- return the normalized workspace path, byte count, media type, and SHA-256;
- emit an attributable audit event without logging attachment bytes;
- clean up temporary files after success or failure.

V1 should stay WorkIQ-specific. Extract a generic binary workspace sink only
when a second provider needs the same contract.

Saving an attachment to the workspace is a local, bounded write. It does not
send or mutate Microsoft 365 data and should not inherit the confirmation
requirements for destructive or outbound WorkIQ methods.

`scout-standard` can govern whether `execute_code` is visible, but the current
WorkIQ adapter exposes read and write methods behind that single compound tool.
Until WorkIQ publishes method-level capability metadata, the profile must not
claim read-only WorkIQ enforcement. It must preserve the existing confirmation
contract for destructive/outbound methods and report the compound-tool boundary
in effective-capability diagnostics. Method-level policy belongs in the WorkIQ
namespace/plan layer, not in OpenClaw's top-level tool allowlist.

### 4. Governed issue filing

Do not add a generic shell-based `gh` or `az` workaround.

Issue filing should use owner-provided namespaced tools, for example a GitHub
or Azure DevOps MCP/plugin tool selected by the Scout profile. The connector
owns:

- delegated identity;
- repository/project allowlists;
- create-vs-comment permissions;
- duplicate confirmation where applicable;
- approval for externally visible writes;
- returned issue URL/id and audit evidence.

The existing self-diagnosis feedback path remains the default for Scout product
defects. General tracker creation is a separate approved capability.

### 5. Exec without approval fatigue

Use `security=allowlist` and `ask=on-miss` in V1. Commands already covered by
the attributable role bundle run without repeated prompts; unknown commands
still require approval and remain denied if approval delivery is unavailable.

Reduce friction by publishing a small role-specific safe-command bundle for
diagnostics that genuinely require exec. Each entry must be:

- exact or structurally constrained;
- available in the shipped image;
- non-elevated;
- unable to write outside the workspace;
- attributable in `exec-approvals.json`;
- removable when a typed tool replaces it.

Do not use `auto` as a substitute for missing typed capabilities. Host `auto`
may choose the execution location; it does not remove approval requirements.

## Configuration Ownership

| Surface | Owner |
| --- | --- |
| Core profile and filesystem enforcement semantics | OpenClaw |
| `scout-standard` composition and approved plugin list | Lobster |
| Tenant equal-or-stricter baseline | Lobster policy administration |
| WorkIQ attachment retrieval and delegated identity | WorkIQ/Lobster plugin |
| Workspace path enforcement and write result contract | OpenClaw-native filesystem seam reused by the plugin |
| Issue tracker authorization | Connector owner |
| Exec approval artifact | Operator/admin |

Agents may inspect their effective capabilities and request a change, but they
must not mutate their own profile or approval artifact.

## Status and Diagnostics

Scout should expose an effective capability report containing:

- product profile id and generation;
- effective OpenClaw base profile;
- allowed and denied model-visible tool ids;
- workspace-only filesystem status;
- exec host/security/ask posture;
- active governed plugin/MCP tool ids;
- missing requested capability with owning configuration source.

When a task cannot run, the error should distinguish:

- tool not installed;
- tool installed but not in profile;
- denied by policy;
- approval required;
- approval delivery unavailable;
- connector identity/authorization missing;
- source data unsupported;
- workspace destination rejected.

This replaces generic "exec denied" guidance for tasks that should use a typed
capability.

## E2E and Eval Plan

### Capability gates

1. **Workspace write**
   - write a text file inside the workspace;
   - reject an absolute or traversal destination outside it.
2. **Attachment materialization**
   - locate seeded `Re: Monitors`;
   - list attachments;
   - save a seeded PNG;
   - verify exact bytes, hash, media type, and returned workspace path;
   - reject overwrite and path escape.
3. **Issue filing**
   - create against a reusable test repository/project or deterministic fake;
   - verify delegated identity, approval, returned id/url, and audit record;
   - reject an unapproved destination.
4. **Exec**
   - approved diagnostic command succeeds after approval;
   - unlisted command and unavailable approval delivery fail distinctly.
5. **Effective profile**
   - assert the final model-visible tool list, not only config fragments.

### Model evals

- The model chooses attachment materialization rather than exec/base64.
- The model chooses the approved issue connector rather than shelling out.
- The model reports the saved path or created issue URL.
- The model asks for approval when required and does not claim completion after
  denial.
- Tool-choice latency and unnecessary calls are tracked as experience metrics,
  not capability correctness gates.

## Migration and Deletion

1. Define the generated `scout-standard` inventory in one Lobster source.
2. Materialize `profile=minimal`, `workspaceOnly=true`, targeted denies, and
   the exact approved core/plugin inventory.
3. Update policy conformance to permit `ask=on-miss` only when attributable
   allowlist evidence is present.
4. Add effective model-visible tool-list proof.
5. Add WorkIQ attachment save and its capability E2E.
6. Add approved issue connector entries as their owners provide them.
7. Delete duplicated `alsoAllow` constants and feature-specific overlays that
   only reconstruct the same baseline.
8. Remove safe exec entries when typed tools replace them.

The migration must preserve stricter operator or tenant overlays.

## Internal Analogues

| Analogue | Decision | Reason |
| --- | --- | --- |
| OpenClaw `minimal` profile | Reuse | Fail-closed base that does not inherit future coding tools |
| `tools.fs.workspaceOnly` | Reuse | Existing tested path boundary for filesystem tools |
| Exec approvals evidence | Reuse | Existing attributable ask/allowlist mechanism |
| File-transfer plugin | Adapt | Good bounded binary/path precedent, but wrong source and destination model |
| Chat attachment staging | Adapt | Good byte limits and media-store precedent, but input is chat request data |
| Gateway artifacts API | Adapt later | Useful artifact representation, but not a model-facing workspace write |
| Lobster `alsoAllow` overlays | Avoid as authority | Useful compatibility mechanism, poor long-term profile source |
| Blanket auto/yolo | Avoid | Removes friction by widening trust instead of completing capabilities |

## External Comparator

GitHub Copilot custom agents use named profiles with an explicit `tools` list,
including namespaced MCP tools. An omitted list grants all tools, while a
specific list narrows the agent. The useful precedent is the inspectable
agent-to-tool binding, not its exact defaults.

Scout should be stricter for hosted enterprise use:

- explicit profile required;
- workspace confinement required;
- namespaced connector grants;
- policy and approval evidence separate from tool visibility;
- no implicit all-tools fallback.

Reference:
<https://docs.github.com/en/copilot/reference/custom-agents-configuration>

## Role Review Findings

### Gateway runtime owner

- Do not add a synchronous policy lookup to every filesystem operation.
- Resolve the profile at run construction and use existing filesystem guards.
- Stream attachment bytes; never route large base64 through the model payload.
- Fail the operation without destabilizing or restarting the Gateway.
- Do not use `coding` as the base: profile expansion can add future tools
  without a Lobster review. Use `minimal` plus a generated exact inventory.

### M365 connector owner

- Attachment retrieval must use delegated identity and validate the final
  destination in-path.
- Retry must be safe: refuse overwrite by default and return a stable digest.
- Graph or WorkIQ errors must remain distinguishable from workspace write
  failures.

### Scout operator / power user

- One named profile must replace repeated allowlist surgery.
- The effective capability report must explain the owner of a missing grant.
- Approval prompts should remain only where a typed, bounded tool cannot replace
  exec.

### Security owner

- Workspace confinement, non-elevated execution, and cross-agent default deny
  are V1 invariants.
- The tool inventory must fail closed when an unknown or newly introduced tool
  appears; no implicit profile expansion or all-tools fallback.
- External issue creation requires delegated identity, destination policy, and
  audit evidence.
- Agents cannot edit their own profile or approval artifact.
- Binary content must be size-bounded, path-safe, and excluded from logs.

## Non-Goals

- No fleet-wide yolo mode.
- No arbitrary command self-approval.
- No agent-authored tool grants.
- No general binary `write(base64)` tool in V1.
- No universal attachment-provider abstraction before a second provider.
- No generic issue API that bypasses GitHub/ADO connector authorization.
- No browser, media-generation, gateway-admin, elevated, or cross-agent
  capabilities in the standard profile.

## Smallest Evidence Slice

The first implementation slice should contain only:

1. generated `scout-standard` config using `minimal`, an exact approved
   inventory, targeted denies, and `tools.fs.workspaceOnly=true`;
2. one effective model-visible tool-list assertion;
3. WorkIQ `saveAttachment` for one seeded PNG;
4. one accepted workspace destination and one rejected escape;
5. returned path, size, media type, and SHA-256;
6. deletion of the attachment scenario's exec/base64 workaround.

If that slice cannot complete the deterministic `Re: Monitors` scenario without
exec, the proposal's core thesis is false or incomplete.
