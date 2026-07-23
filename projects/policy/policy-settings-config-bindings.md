# Policy Settings Config Bindings

## Purpose

The Lobster policy settings UI should expose only controls that have an explicit
OpenClaw policy path and a known activation behavior. For editable controls,
Lobster should know how the selected setting becomes policy JSONC and, when
needed, which OpenClaw config field must already be baked or overlaid for the
effective config to pass policy validation.

This is intentionally narrower than arbitrary policy materialization. The
settings registry is the product boundary: unsupported policy paths stay hidden
or read-only until they have a binding.

## Binding Contract

Each exposed setting should declare:

- stable setting id
- UI section and scopes
- OpenClaw policy path
- generated policy value
- OpenClaw doctor check id
- config binding, if Lobster can materialize it
- exposure: `editable`, `readOnly`, `manual`, or `hidden`
- apply mode: `automatic`, `reviewRequired`, `validateOnly`, or `unsupported`

`doctor --fix` may reuse the same deterministic rule helpers, but it is not the
tenant activation mechanism.

## Current UI Control Classification

| Current UI control                               | Current path                       | Correct policy path                                                             | Exposure | Config binding / action                                                                                                                                                   |
| ------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Block Telegram tools                             | `tools.deny`                       | none in current policy for arbitrary `telegram*` tools                          | hidden   | Do not expose until OpenClaw has an arbitrary tool deny policy surface. Current `tools.denyTools` is for known built-in mutation/runtime classes, not Telegram wildcards. |
| Require elevated tools default off               | `tools.elevated.requireDefaultOff` | `tools.elevated.allow=false`                                                    | editable | Patch/verify `openclaw.tools.json` `elevated.enabled=false`.                                                                                                              |
| Disable agent-to-agent tool calls                | `tools.agentToAgent`               | pending/P2, not current policy                                                  | hidden   | Keep hidden until policy metadata and conformance checks exist. Runtime config exists, but policy does not yet govern it.                                                 |
| Allow only workspace-write sandbox               | `sandbox.allowModes`               | none; current policy uses `sandbox.requireMode` values `off`, `non-main`, `all` | hidden   | Current Lobster baseline requires `sandbox.requireMode=["off"]`; do not expose old sandbox mode names.                                                                    |
| Deny full filesystem access                      | `sandbox.denyModes`                | none in current policy                                                          | hidden   | Not a current policy surface.                                                                                                                                             |
| Restrict model providers                         | `models.providers.allow`           | `models.providers.allow`                                                        | manual   | Validation can flag unapproved providers, but Lobster cannot choose replacements automatically. Use as review/manual or hide until provider selection UX exists.          |
| Block private network access                     | `network.privateAccess`            | `network.privateNetwork.allow=false`                                            | editable | Patch/verify private-network opt-ins are disabled for browser/web fetch surfaces, or block if a specific source cannot be mapped.                                         |
| Require gateway attestation                      | `gateway.attestation.required`     | none in current policy                                                          | hidden   | Not a current OpenClaw policy surface.                                                                                                                                    |
| Disable unaudited remote gateway access          | `gateway.remoteAccess`             | `gateway.remote.allow=false`                                                    | editable | Patch/verify `gateway.remote.allow=false` or absence of remote gateway config.                                                                                            |
| Block Telegram channel ingress                   | `channels.telegram.ingress`        | `channels.denyRules[]` for provider `telegram`                                  | editable | Existing policy doctor repair can disable matching configured channels. Binding should generate a channel deny rule, not a custom Telegram path.                          |
| Require approval before external channel egress  | `channels.external.egressApproval` | none in current policy                                                          | hidden   | No current policy surface.                                                                                                                                                |
| Require secret redaction evidence                | `data.secrets.redactionEvidence`   | `dataHandling.sensitiveLogging.requireRedaction=true`                           | editable | Patch/verify `logging.redactSensitive` is not `off`.                                                                                                                      |
| Require delegated identity for user data actions | `auth.userDataActions`             | none in current policy                                                          | hidden   | Not a current policy surface.                                                                                                                                             |
| Require exec approval evidence                   | `execApprovals.requireFile`        | `execApprovals.requireFile=true`                                                | manual   | Requires an approved `exec-approvals.json` artifact. Do not auto-create approval evidence.                                                                                |
| Require scoped approval artifacts                | `execApprovals.scope`              | none in current policy                                                          | hidden   | Not a current policy surface.                                                                                                                                             |
| Require tenant-approved feeds                    | `plugins.feeds.requiredScope`      | pending feed policy RFC / not current policy                                    | readOnly | Existing `/feeds` source selection can enforce tenant-approved source activation, but OpenClaw policy surface is not merged.                                              |
| Block public feed bypass                         | `plugins.publicFeedBypass`         | pending feed policy RFC / not current policy                                    | readOnly | Keep as status/read-only until hosted feed policy surface lands.                                                                                                          |

## Recommended Initial Editable Set

The first bound settings should be the controls that map cleanly to current
OpenClaw policy metadata and Lobster shipped config:

| Setting id                       | Policy path                                      | Value                             | Check id                                  | Apply mode     |
| -------------------------------- | ------------------------------------------------ | --------------------------------- | ----------------------------------------- | -------------- |
| `tools.elevated.defaultOff`      | `tools.elevated.allow`                           | `false`                           | `policy/tools-elevated-enabled`           | automatic      |
| `network.privateNetwork.block`   | `network.privateNetwork.allow`                   | `false`                           | `policy/network-private-access-enabled`   | reviewRequired |
| `gateway.remote.disable`         | `gateway.remote.allow`                           | `false`                           | `policy/gateway-remote-enabled`           | automatic      |
| `channels.telegram.blockIngress` | `channels.denyRules`                             | provider deny rule for `telegram` | `policy/channels-denied-provider`         | automatic      |
| `data.redaction.require`         | `dataHandling.sensitiveLogging.requireRedaction` | `true`                            | `policy/data-handling-redaction-disabled` | automatic      |

Recommended manual/status settings:

| Setting id                     | Policy path                 | Reason                                                                                             |
| ------------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------- |
| `models.providers.allow`       | `models.providers.allow`    | Lobster cannot choose a replacement model/provider safely.                                         |
| `execApprovals.requireFile`    | `execApprovals.requireFile` | Requires attributable evidence, not config mutation.                                               |
| `plugins.feeds.tenantApproved` | pending                     | Lobster can select a tenant-approved feed source today, but OpenClaw feed policy is still pending. |

## UI Rules

- Editable controls must come from the settings registry, not ad hoc `path` and
  `previewValue` constants in `PolicyPage`.
- Hidden controls should not appear in the authoring grid.
- Manual controls can appear only as status/review items and must not generate
  an activatable draft unless the required external artifact is present.
- Read-only controls can show current state and link to `/feeds` or another
  owner surface.
- Generated policy JSONC must use OpenClaw policy paths exactly as registered in
  policy metadata.

## Next PR Shape

1. Add a typed policy settings registry in Lobster web/shared code.
2. Replace the current `POLICY_SECTIONS` preview constants with registry-backed
   sections.
3. Hide or mark manual every current control without a valid policy binding.
4. For the initial editable controls, generate corrected policy JSONC paths.
5. Add tests that every editable control has a policy path, check id, and
   activation classification.

Do not add `gateway.nodes.denyCommands` until the OpenClaw policy PR for that
surface lands.
