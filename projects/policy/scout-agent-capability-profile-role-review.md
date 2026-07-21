# Scout Standard Capability Profile Role Review

Date: 2026-07-20

Reviewed artifact:
`projects/policy/scout-agent-capability-profile-proposal.md`

Roles:

- `.craft/roles/claws/gateway-eng.md`
- `.craft/roles/claws/m365-connector-eng.md`
- `.craft/roles/claws/power-user.md`
- `.craft/roles/claws/ciso.md`

## Blocking finding

The original proposal used OpenClaw's `coding` profile as the base and then
removed unwanted tools with denies. That is not sufficiently fail-closed:
future OpenClaw tools added to `coding` could become visible to Scout without a
Lobster profile review. The current profile also includes more media,
session/subagent, and skill-authoring capability than Scout V1 needs.

Resolution: use `minimal` as the OpenClaw base and generate one exact
`scout-standard` inventory for approved core and plugin/MCP tool ids. Keep
targeted denies as defense in depth and assert the final model-visible list.

## Gateway runtime findings

- Reuse tool construction and `tools.fs.workspaceOnly`; do not add a policy
  lookup to every file operation.
- The profile must resolve once per run/config generation.
- Attachment bytes must stream from WorkIQ to the workspace sink without
  entering model context as base64.
- Attachment failure must not restart or destabilize the Gateway.
- Status should report effective tool ids from the final constructed surface,
  not only baked config.

## M365 connector findings

- WorkIQ owns attachment lookup and delegated identity.
- Workspace path validation must occur in the same operation before bytes are
  committed; an upstream validation claim is not sufficient.
- Refuse overwrite by default and return a digest so retries are idempotent and
  inspectable.
- Preserve distinct Graph retrieval, identity, size, destination, and write
  failures.
- Do not create a provider-neutral attachment framework before a second source
  needs it.

## Scout operator findings

- One generated inventory must replace repeated `alsoAllow` edits and
  feature-specific overlays.
- Effective-capability diagnostics must name whether a tool is absent,
  unapproved, policy-denied, or awaiting approval.
- Typed capabilities should replace exec workarounds.
- For the small residual diagnostic command set, `ask=on-miss` with an
  attributable safe-command bundle is preferable to repeated `ask=always`
  prompts. Unknown commands still require approval.

## Security findings

- `tools.fs.workspaceOnly=true`, elevated off, and cross-agent/session mutation
  denied are V1 invariants.
- No implicit all-tools fallback and no automatic inheritance from `coding` or
  `full`.
- `execute_code` is currently a compound WorkIQ read/write capability. The
  profile must preserve destructive/outbound confirmation and must not describe
  the tool as method-level read-only.
- Agents may inspect and request capabilities but cannot mutate their profile
  or `exec-approvals.json`.
- External issue filing requires delegated identity, destination policy,
  approval, and audit evidence.
- Attachment content must be bounded, path-safe, excluded from logs, and
  cleaned up on failure.

## Result

The proposal is suitable for a Lobster architecture PR after the following
changes, now incorporated:

1. `minimal` base plus exact generated inventory;
2. image understanding allowed while browser and media generation remain
   denied;
3. workspace-only filesystem enforcement required;
4. `ask=on-miss` limited to attributable allowlisted diagnostic commands;
5. exact final tool-surface proof required;
6. WorkIQ-specific attachment save kept as the first vertical slice;
7. WorkIQ compound-tool permissions documented without claiming read-only
   enforcement.

## 2026-07-21 Maintainer Follow-up

Omar's review of `bic/lobster#5336` added these accepted findings:

- lead with consequence-scaled confirmation rather than a flat capability
  table;
- make typed first-party plugin/code-mode primitives the default and exec a
  removable bridge;
- pin normalized `exec.mode=ask` and add a managed-policy mode guard so
  model-reviewed `auto` cannot silently appear;
- keep the fail-closed `media` group deny;
- make product-bug filing V1 and general GitHub/ADO filing Phase 2;
- add a representative-task table proving normal Scout convenience.

The follow-up source audit also found:

- #5284 was closed without merging; #5349 tracks native single-call
  `M365.messages.saveAttachment(...)` integration after an upstream package
  release;
- pinned OpenClaw v2026.5.28 already gives `read` resolved skill directories as
  additional read-only roots under `tools.fs.workspaceOnly=true`, while
  mutation remains workspace-confined;
- Lobster's existing assertion that `requireWorkspaceOnly=false` is necessary
  for skill reads should be replaced with assembled-path proof;
- profile/policy proof must not wait on the unreleased attachment package, so
  attachment integration is a separate V1 slice.

Phase 2 direction:

- author GitHub Issues and Azure DevOps Work Items as separate MOS3
  `AgentConnector` + `AgentSkill` pairs;
- implement exact acquired-connector/tool-selector binding before either
  connector can enter `scout-standard`;
- reuse the runtime MCP identity and approval rails;
- extend effective catalog diagnostics and WorkIQ method metadata rather than
  creating replacement plugins;
- keep tracker evidence upload connector-owned and distinct from WorkIQ
  attachment materialization.
