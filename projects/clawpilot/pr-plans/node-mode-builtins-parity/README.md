# Node Mode Built-Ins Parity Stack

## Objective

After the M365 draft command PR, close the remaining Scout Desktop built-in
parity gaps for Cloud/OpenClaw node mode without renaming every existing
desktop tool into a new node command.

The rule for this stack:

- Use typed node commands for new stable desktop capability contracts.
- Use `executeLocalTool({ kind, toolName, toolArgs, sessionId })` for existing
  Desktop built-ins that already have approval policy and handlers.

This lets Cloud/OpenClaw call the existing Desktop surfaces while Desktop keeps
owning local policy, approval cards, token boundaries, and execution.

## Proposed Order

| Step | Planned PR | Area | Base |
| --- | --- | --- | --- |
| 1 | Planned | Self-tools bridge | After #4089 |
| 2 | Planned | WorkIQ/M365 read and metadata tools | After self-tools |
| 3 | Planned | WorkIQ/M365 mutating tools | After read parity |
| 4 | Planned | Browser MCP special actions and remaining permission kinds | After M365 mutations |

`system.run` can remain the shell-specific follow-up after these non-shell
built-in parity slices, or be kept as its already-open PR if review flow needs
to preserve the current stack. The architectural preference is still to review
non-shell built-ins before shell.

## Step 1: Self-Tools Bridge

### Scope

Route existing `m_*` self-tools through the Desktop local-tool bridge.

Representative tools:

- `m_get_settings`, `m_update_settings`
- `m_remember`, `m_recall`, `m_forget`
- `m_list_automations`, `m_create_automation`, `m_update_automation`,
  `m_run_automation_now`
- `m_m365_status`, `m_m365_sign_in`, `m_m365_sign_out`
- `m_relay_status`, `m_relay_connect`, `m_relay_disconnect`
- `m_ask_user`
- model, personality, skill, session-history tools already registered in the
  self-tool registry

### Implementation Shape

- Reuse `executeLocalTool({ kind: "custom-tool", toolName, toolArgs, sessionId })`.
- Reuse `execute-self-tool.ts` and the existing `getSelfTools(sessionId)`
  registry.
- Preserve `PermissionPolicy.evaluate` as the local deny floor.
- Add catalog/discovery exposure only if the caller currently cannot know which
  self-tools are available.
- Do not create one new node command per `m_*` tool.

### Acceptance Criteria

- Known read-only self-tools preserve read-only auto-approval behavior.
- Mutating self-tools still prompt through the existing permission card path.
- `m_ask_user` remains user-present only and cannot run invisibly in unattended
  mode.
- Unknown self-tools fail with a structured not-found/not-supported result.
- Local policy deny blocks execution even if a caller attempts to bypass cloud
  approval.

### Tests

- `execute-local-tool` routes `custom-tool` to self-tool executor.
- `execute-self-tool` runs a read-only self-tool and returns raw handler output.
- Mutating self-tool policy prompt/deny behavior is preserved.
- Unknown self-tool and unavailable registry return clean error envelopes.
- `m_ask_user`/unattended policy behavior remains covered.

## Step 2: WorkIQ/M365 Read And Metadata Tools

### Scope

Route existing read-oriented WorkIQ/M365 tools through `custom-tool` without
inventing new command names.

Representative tools:

- Email: `workiq_list_emails`, `workiq_get_email`, `workiq_search_emails`,
  `workiq_list_mail_folders`
- Calendar: `workiq_list_events`, `workiq_get_event`,
  `workiq_find_meeting_times`, `workiq_get_schedule`,
  `workiq_list_categories`
- OneDrive: `workiq_list_files`, `workiq_search_files`,
  `workiq_get_recent_files`, `workiq_download_file`
- Teams: `workiq_list_chats`, `workiq_list_chat_messages`,
  `workiq_search_chats`, `workiq_get_chat`, team/channel list/read tools
- People/presence/tasks read surfaces

### Implementation Shape

- Reuse `executeLocalTool({ kind: "custom-tool", toolName: "workiq_*" })`.
- Preserve `READ_ONLY_CUSTOM_TOOLS` and unattended-safety distinctions.
- Preserve untrusted wrapping for attacker-controlled returned content.
- Ensure M365 auth status and token failures remain local/brokered and redacted.

### Acceptance Criteria

- Read-only tools preserve auto-approval where current Desktop allows it.
- Presence/download tools keep their stricter unattended behavior.
- Returned content does not smuggle token or trusted-instruction state.
- Missing auth fails with the same Desktop-facing error shape as today.

## Step 3: WorkIQ/M365 Mutating Tools

### Scope

Route existing mutating WorkIQ/M365 tools after read parity is proven.

Representative tools:

- Email: send/reply/forward/mark/move/delete/create draft
- Calendar: create/update/delete/respond/forward/cancel events
- Teams: send chat, create chat, reply to chat/channel
- OneDrive: upload
- Tasks: create/update/complete/delete tasks and lists/subtasks

### Implementation Shape

- Reuse existing WorkIQ tool names and handlers.
- Require prompt by default through `MUTATING_CUSTOM_TOOLS`.
- Add scoped approval summaries for high-risk families where generic cards are
  too weak.
- Keep #4089 draft commands as the safer first-class draft subset, not the
  whole M365 story.

### Acceptance Criteria

- Mutating calls cannot run without prompt/approval.
- Tool-specific cards show enough target/preview context to review safely.
- Send/delete/cancel-style operations are visually and policy-distinct from
  read/list operations.
- Local policy deny blocks execution even if a cloud caller misroutes approval.

## Step 4: Browser MCP Special Actions And Remaining Permission Kinds

### Scope

Close the approval-only surfaces that are not covered by #4088 browser commands.

Representative surfaces:

- `browser_press_key`
- `browser_file_upload`
- `browser_handle_dialog`
- `browser_evaluate`
- `browser_run_code`
- generic Playwright MCP navigation/read/write tools
- `settings`, `memory`, `hook`
- extension management and extension permission access
- gateway `external-action` approval frames such as `m365.plan` and Graph
  action approvals

### Implementation Shape

- Use MCP/local-tool routing for existing Playwright MCP tools.
- Preserve the specialized approval card formatting in `permissions.ts`.
- Treat `settings`, `memory`, `hook`, and extension permissions case-by-case:
  some are executable built-ins, while others may remain SDK approval events
  rather than cloud-callable local tools.
- Preserve `external-action` as a gateway approval lane, not a local command
  executor unless the gateway also supplies a safe execution contract.

### Acceptance Criteria

- Browser file upload/dialog/code execution keep specialized approval cards.
- Existing server/tool permission keys still govern MCP browser actions.
- Non-executable approval events are documented as approval-only, not falsely
  exposed as callable node tools.
- Gateway external-action approvals keep allow-once semantics and do not gain
  "always allow" persistence.

## Open Questions

- Whether to insert this stack between #4089 and #4087 so shell remains last, or
  keep #4087's existing PR position and open this as the next non-shell series.
- Whether the cloud caller already has enough catalog data for self-tools and
  WorkIQ tools, or whether a small discovery endpoint is needed first.
- Which WorkIQ mutating tools need custom approval summaries beyond the generic
  `custom-tool` card.

## Follow-Up: True Harness Migration

The command stack gets node mode close to Desktop parity, but it does not by
itself move every old Copilot SDK/MCP harness behavior into the new node-mode
layer. Treat the remaining work as a harness migration: the cloud should call
normal node commands and `desktop.executeLocalTool`, while Desktop continues to
own local config, auth, approvals, policy, execution, and result classification.

### Already Covered By The Current Series

- #4045: node-routed MCP commands (`mcp.help`, `mcp.status`, `mcp.invoke`,
  `mcp.cancel`) with per-server/per-tool MCP approvals.
- #4086: filesystem node commands using existing filesystem policy.
- #4088: browser and local-app command entry points. Clipboard is not treated
  as a parity requirement because it is not an existing Desktop app capability
  today; it should only return as a separate product decision if needed.
- #4089: M365 brokered draft commands with Desktop-owned token acquisition.
- #4123: existing self-tools and WorkIQ/M365 built-ins through
  `desktop.executeLocalTool({ kind: "custom-tool" })`.
- #4087: `system.run` governance upgrade.
- #4090: command catalog and result-trust hardening.

### Remaining Harness Gaps

1. **MCP lifecycle parity.** Node mode needs the same lifecycle guarantees the
   Copilot SDK path currently gets from the local MCP harness: server config
   load, enabled/exposed state, OAuth/needs-auth status, reconnect, stale tool
   discovery refresh, and clear error propagation. #4045 gives the command
   surface; this follow-up proves the lifecycle stays correct over time.
2. **Approval persistence semantics.** Existing Desktop approval keys must
   remain the source of truth. MCP should keep `mcp:<server>:<tool>` policy;
   browser/filesystem/custom-tool/system-run commands must keep their current
   permission kinds and no command should accidentally gain broader saved
   grants than the old Desktop path.
3. **Cloud surfacing and dispatch.** The cloud-side tool catalog needs to prefer
   node commands and exposed MCP tools when a Desktop node is paired, while
   preserving graceful fallback when the node disconnects or a command is not
   supported by this build.
4. **Result trust and untrusted wrapping.** Local outputs that can contain
   attacker-controlled content need the same untrusted/result-trust treatment
   whether they came from the SDK MCP path, a node command, or
   `desktop.executeLocalTool`.
5. **Cancellation and in-flight cleanup.** `mcp.cancel` exists, but node-mode
   built-ins and shell/browser flows need a consistent story for timeouts,
   cancellation, stale approval cards, and activity-log cleanup.
6. **Harness proof lane.** Add a repeatable source-harness or real-node proof
   that runs the same scenario through the old Desktop path and the node-mode
   path, then compares approval kind, policy decision, execution result shape,
   and trust classification.

### Recommended Follow-Up PR

Open one focused follow-up after #4090:

**Node mode Desktop harness parity** - opened as
[`gim-home/m#4137`](https://github.com/gim-home/m/pull/4137).

Scope:

- Wire Gateway `desktop.executeLocalTool({ kind: "mcp" })` to the same
  node-mode MCP runtime used by raw `mcp.invoke`.
- Wire Gateway
  `desktop.executeLocalTool({ kind: "read" | "write", toolName:
  "filesystem.read" | "filesystem.write" | "filesystem.patch" })` to the same
  Desktop Node filesystem executor used by raw filesystem node commands.
- Prove MCP config/status/discovery/OAuth behavior across reconnects in node
  mode.
- Add tests that compare existing SDK MCP approval keys and node-routed MCP
  approval keys.
- Add a small proof harness that invokes `mcp.status` -> `mcp.help` ->
  `mcp.invoke` -> `mcp.cancel` against a fake local server and records the
  same lifecycle events the Desktop UI consumes today.
- Add filesystem harness tests proving exact command names, trusted Desktop
  context, request session propagation, and structured bad-request /
  not-supported error handling.
- Document which behaviors are Desktop-owned and which must be fixed in cloud
  surfacing/persona dispatch.

Keep this as a single PR rather than a new series. Browser expansion, M365
mutation expansion, and shell cancellation can stay as later targeted work
  unless this PR uncovers one shared harness primitive that they all require.
