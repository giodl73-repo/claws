# Policy Doctor Fix Rule Inventory

## Purpose

Map current OpenClaw policy doctor findings to the kind of fix rule we can
support. This is the bridge between policy settings, `doctor --fix`, and
Lobster config materialization.

The rule for coverage is: every policy finding should have a fix classification,
but not every finding should have an automatic patch.

## Fix Classes

| Class | Meaning |
| --- | --- |
| `automatic` | Deterministic config patch that only narrows access or disables an unsafe capability. |
| `reviewRequired` | Patchable, but it may break workflows, remove user config, require choosing between allowed values, or widen access. |
| `manual` | Needs authored evidence, credentials, product migration, or policy author approval. |
| `validateOnly` | Doctor can explain the gap but should not patch it. |
| `unsupported` | Current evidence/config surface is insufficient for a safe fix. |

`doctor --fix` should be allowed to reuse deterministic rule helpers, but
Lobster tenant activation should stay registry-driven and should only expose
settings that declare policy path, check id, config binding, and apply class.

## Inventory

### Policy Artifact

| Finding | Policy path | Fix class | Possible fix rule |
| --- | --- | --- | --- |
| `policy/policy-jsonc-missing` | policy artifact | `manual` | Restore or create the approved policy artifact. Do not auto-author a baseline without review. |
| `policy/policy-jsonc-invalid` | policy artifact | `manual` | Repair JSONC syntax/schema by authoring the policy file. |
| `policy/policy-hash-mismatch` | expected hash config | `manual` | Restore the approved artifact or update the expected hash after review. |
| `policy/attestation-hash-mismatch` | expected attestation config | `manual` | Re-run policy check, review attestation, then update accepted attestation hashes. |

### Channels And Ingress

| Finding | Policy path | Fix class | Possible fix rule |
| --- | --- | --- | --- |
| `policy/channels-denied-provider` | `channels.denyRules` | `automatic` for product-managed config, otherwise `reviewRequired` | Disable configured channels matching the denied provider. For Lobster authoring, generate the deny rule rather than arbitrary tool denies. |
| `policy/ingress-dm-policy-unapproved` | `ingress.channels.allowDmPolicies` | `reviewRequired` | Set the channel DM policy to an allowed value, usually a more restrictive known mode. |
| `policy/ingress-dm-scope-unapproved` | `ingress.session.requireDmScope` | `reviewRequired` | Move session DM scope to the required or stricter ordered value. |
| `policy/ingress-open-groups-denied` | `ingress.channels.denyOpenGroups` | `automatic` for managed channels, otherwise `reviewRequired` | Disable open group ingress or require explicit allowlists. |
| `policy/ingress-group-mention-required` | `ingress.channels.requireMentionInGroups` | `automatic` for managed channels, otherwise `reviewRequired` | Require mention in group channels. |

### MCP, Models, Network

| Finding | Policy path | Fix class | Possible fix rule |
| --- | --- | --- | --- |
| `policy/mcp-denied-server` | `mcp.servers.deny` | `reviewRequired` | Remove or disable the denied MCP server. Automatic only when the server entry is product-managed. |
| `policy/mcp-unapproved-server` | `mcp.servers.allow` | `reviewRequired` | Remove the unapproved MCP server or choose an approved replacement. |
| `policy/models-denied-provider` | `models.providers.deny` | `reviewRequired` | Remove the provider or switch affected model refs to an approved provider. |
| `policy/models-unapproved-provider` | `models.providers.allow` | `reviewRequired` | Select an approved provider. Lobster cannot infer the correct replacement without model/provider UX. |
| `policy/network-private-access-enabled` | `network.privateNetwork.allow` | `reviewRequired` | Disable the concrete private-network opt-in. Needs source-specific config mapping. |

### Gateway

| Finding | Policy path | Fix class | Possible fix rule |
| --- | --- | --- | --- |
| `policy/gateway-non-loopback-bind` | `gateway.exposure.allowNonLoopbackBind` | `automatic` when local-only, otherwise `reviewRequired` | Set gateway bind address to loopback. |
| `policy/gateway-auth-disabled` | `gateway.auth.requireAuth` | `manual` | Configure token, password, or trusted-proxy auth. Do not invent secrets. |
| `policy/gateway-rate-limit-missing` | `gateway.auth.requireExplicitRateLimit` | `reviewRequired` | Add explicit rate-limit config from product defaults. |
| `policy/gateway-control-ui-insecure` | `gateway.controlUi.allowInsecure` | `automatic` | Disable the insecure Control UI toggle. |
| `policy/gateway-tailscale-funnel` | `gateway.exposure.allowTailscaleFunnel` | `reviewRequired` | Disable Tailscale funnel/serve exposure. |
| `policy/gateway-remote-enabled` | `gateway.remote.allow` | `automatic` for Lobster default, otherwise `reviewRequired` | Disable remote gateway mode/config. |
| `policy/gateway-http-endpoint-enabled` | `gateway.http.denyEndpoints` | `automatic` for managed endpoints, otherwise `reviewRequired` | Disable denied HTTP endpoints such as `chatCompletions` or `responses`. |
| `policy/gateway-http-url-fetch-unrestricted` | `gateway.http.requireUrlAllowlists` | `manual` | Add URL allowlists for each fetch input. Doctor cannot infer allowed domains. |
| `policy/gateway-node-command-denied` | `gateway.nodes.denyCommands` | `reviewRequired` | Add the command to `gateway.nodes.denyCommands`. Keep pending in Lobster registry until OpenClaw #99121 lands. |

### Agents And Tools

| Finding | Policy path | Fix class | Possible fix rule |
| --- | --- | --- | --- |
| `policy/agents-workspace-access-denied` | `agents.workspace.allowedAccess` | `reviewRequired` | Set agent workspace access to an allowed mode. Can break workflows. |
| `policy/agents-tool-not-denied` | `agents.workspace.denyTools` | `automatic` for required denies, otherwise `reviewRequired` | Merge required workspace tool denies such as `write`, `edit`, or `apply_patch`. |
| `policy/tools-profile-unapproved` | `tools.profiles.allow` | `reviewRequired` | Set the tool profile to an allowed profile. |
| `policy/tools-fs-workspace-only-required` | `tools.fs.requireWorkspaceOnly` | `reviewRequired` | Set workspace-only filesystem posture only when the deployment can still read required app/plugin assets. |
| `policy/tools-exec-security-unapproved` | `tools.exec.allowSecurity` | `reviewRequired` | Set exec security to an allowed value. |
| `policy/tools-exec-ask-unapproved` | `tools.exec.requireAsk` | `reviewRequired` | Set exec ask mode to an allowed value. |
| `policy/tools-exec-host-unapproved` | `tools.exec.allowHosts` | `reviewRequired` | Move exec host to an allowed host mode. |
| `policy/tools-elevated-enabled` | `tools.elevated.allow` | `automatic` | Set `tools.elevated.enabled=false`. |
| `policy/tools-also-allow-missing` | `tools.alsoAllow.expected` | `reviewRequired` | Add expected `alsoAllow` entries only if the policy intentionally grants them. This can widen access. |
| `policy/tools-also-allow-unexpected` | `tools.alsoAllow.expected` | `reviewRequired` | Remove unexpected `alsoAllow` entries. Automatic only for product-managed defaults. |
| `policy/tools-required-deny-missing` | `tools.denyTools` | `automatic` for built-in mutation/runtime classes, otherwise `reviewRequired` | Merge required deny tool classes into config. |
| `policy/tools-missing-risk-level` | `tools.requireMetadata` | `manual` | Add tool metadata in the owning plugin/tool declaration. |
| `policy/tools-unknown-risk-level` | `tools.requireMetadata` | `manual` | Replace with a supported risk level. |
| `policy/tools-missing-sensitivity-token` | `tools.requireMetadata` | `manual` | Add sensitivity metadata in the owning plugin/tool declaration. |
| `policy/tools-unknown-sensitivity-token` | `tools.requireMetadata` | `manual` | Replace with a supported sensitivity token. |
| `policy/tools-missing-owner` | `tools.requireMetadata` | `manual` | Add `owner:<team-or-person>` in the owning plugin/tool declaration. |

### Sandbox

| Finding | Policy path | Fix class | Possible fix rule |
| --- | --- | --- | --- |
| `policy/sandbox-mode-unapproved` | `sandbox.requireMode` | `reviewRequired` | Set sandbox mode to an allowed value. |
| `policy/sandbox-backend-unapproved` | `sandbox.allowBackends` | `reviewRequired` | Choose an approved backend that is actually installed. |
| `policy/sandbox-container-posture-unobservable` | container posture evidence | `unsupported` | Add observable evidence/config surface before patching. |
| `policy/sandbox-container-host-network-denied` | `sandbox.containers.denyHostNetwork` | `reviewRequired` | Disable host networking. |
| `policy/sandbox-container-namespace-join-denied` | `sandbox.containers.denyContainerNamespaceJoin` | `reviewRequired` | Disable joining container namespaces. |
| `policy/sandbox-container-mount-mode-required` | `sandbox.containers.requireReadOnlyMounts` | `reviewRequired` | Change mounts to read-only where policy requires it. |
| `policy/sandbox-container-runtime-socket-mount` | `sandbox.containers.denyContainerRuntimeSocketMounts` | `reviewRequired` | Remove container runtime socket binds. |
| `policy/sandbox-container-unconfined-profile` | `sandbox.containers.denyUnconfinedProfiles` | `reviewRequired` | Remove unconfined profiles. |
| `policy/sandbox-browser-cdp-source-range-missing` | `sandbox.browser.requireCdpSourceRange` | `manual` | Add an explicit CDP source range. Doctor cannot infer the safe range. |

### Data Handling, Secrets, Auth

| Finding | Policy path | Fix class | Possible fix rule |
| --- | --- | --- | --- |
| `policy/data-handling-redaction-disabled` | `dataHandling.sensitiveLogging.requireRedaction` | `automatic` | Set `logging.redactSensitive` to a redacting mode. |
| `policy/data-handling-telemetry-content-capture` | `dataHandling.telemetry.denyContentCapture` | `automatic` | Disable telemetry content capture. |
| `policy/data-handling-session-retention-not-enforced` | `dataHandling.retention.requireSessionMaintenance` | `reviewRequired` | Set session maintenance to enforced mode. This may delete data. |
| `policy/data-handling-session-transcript-memory-enabled` | `dataHandling.memory.denySessionTranscriptIndexing` | `reviewRequired` | Disable transcript indexing for the affected agent scope. |
| `policy/secrets-unmanaged-provider` | `secrets.requireManagedProviders` | `manual` | Migrate to a managed secret provider. |
| `policy/secrets-denied-provider-source` | `secrets.denySources` | `reviewRequired` | Move the secret out of the denied source. |
| `policy/secrets-insecure-provider` | `secrets.allowInsecureProviders` | `automatic` for overrides, otherwise `reviewRequired` | Remove insecure provider overrides. |
| `policy/auth-profile-invalid-metadata` | `auth.profiles.requireMetadata` | `manual` | Add required provider/mode metadata to auth profiles. |
| `policy/auth-profile-unapproved-mode` | `auth.profiles.allowModes` | `manual` | Change auth mode and credentials through the auth owner flow. |

### Exec Approvals Evidence

| Finding | Policy path | Fix class | Possible fix rule |
| --- | --- | --- | --- |
| `policy/exec-approvals-missing` | `execApprovals.requireFile` | `manual` | Restore an attributable `exec-approvals.json` evidence file. |
| `policy/exec-approvals-invalid` | evidence artifact | `manual` | Repair the evidence artifact schema/content. |
| `policy/exec-approvals-default-security-unapproved` | `execApprovals.defaults.allowSecurity` | `manual` | Update reviewed approval evidence or policy. |
| `policy/exec-approvals-agent-security-unapproved` | `execApprovals.agents.allowSecurity` | `manual` | Update reviewed agent approval evidence or policy. |
| `policy/exec-approvals-auto-allow-skills-enabled` | `execApprovals.agents.allowAutoAllowSkills` | `reviewRequired` | Disable auto-allow skills in the approval evidence/config owner surface. |
| `policy/exec-approvals-allowlist-missing` | `execApprovals.agents.allowlist.expected` | `manual` | Add the expected approval pattern only through approval review. |
| `policy/exec-approvals-allowlist-unexpected` | `execApprovals.agents.allowlist.expected` | `manual` | Remove unexpected approval patterns through approval review. |

## Recommended Implementation Shape

1. Add OpenClaw policy-plugin fix metadata that covers every current
   `POLICY_CHECK_IDS` entry with one of the classes above.
2. Start with recommendation-only structured output. Include `checkId`,
   `policyPath`, `fixClass`, `configTargets`, `risk`, and `summary`.
3. Add deterministic patch builders only for the safe automatic subset:
   elevated disabled, redaction enabled, telemetry content capture disabled,
   insecure Control UI disabled, managed remote gateway disabled, managed
   channel ingress disabled, and managed built-in deny-tool merges.
4. Treat review-required rules as generated patch previews, not silent fixes.
5. Keep evidence/auth/secrets/provider replacement findings manual.
6. Add a coverage test that fails when a new policy check id lacks a fix
   classification.

## Lobster Registry Implications

The Lobster settings registry should expose only the subset with concrete
activation behavior. Today that means:

- editable automatic: elevated default off, gateway remote disabled, sensitive
  logging redaction, selected product-managed channel denies
- editable review-required: private network block, selected gateway exposure or
  endpoint disables, selected tools posture changes
- manual/status: models, MCP replacements, exec approvals, auth profiles,
  secrets migration, retention, URL allowlists
- hidden until merged: `gateway.nodes.denyCommands` until OpenClaw #99121 lands
- unsupported: sandbox container posture when the required evidence surface is
  unobservable
