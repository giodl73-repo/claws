# OpenClaw Policy Support Roadmap

This roadmap tracks candidate OpenClaw areas where policy can provide
enterprise conformance checks without becoming a second settings system.

The design principle is:

- `policy.jsonc` defines authored requirements.
- The policy extension registers health checks for those requirements.
- `doctor --lint` provides the shared validation gate.
- `policy check` records attestation evidence for audit.
- Runtime enforcement is added only where OpenClaw already has an appropriate
  hook.

Use the [policy-steward](../../.craft/roles/claws/policy-steward.md) role when
reviewing new policy areas or changes to policy evidence, checks, repairs,
runtime gates, or attestations.

## Policy Principles

Policy should describe conformance categories, not hard-code a permanent list
of individual product choices. A customer may care about providers, channels,
tools, gateways, memory, telemetry, or other future OpenClaw surfaces. The
policy model should let each area expose evidence and checks without forcing
policy to know every future setting name in advance.

- **Category first**: define policy areas such as `channels`, `models`,
  `tools`, `network`, or `gateway`; avoid one-off rules that only make sense
  for a single provider or plugin.
- **Evidence over duplication**: observe existing OpenClaw settings,
  registries, and workspace declarations. Do not copy those settings into
  policy as a second source of truth.
- **Stable references**: findings should point at the observed target and the
  authored requirement. Today those references are often `oc://` paths, but the
  policy fields should stay role-based (`target`, `requirement`,
  `evidenceRef`) so the addressing scheme can evolve.
- **Area-owned extraction**: each category should own how it extracts evidence
  from OpenClaw. Policy should compose evidence, not parse every feature's
  private details itself.
- **Narrow enforcement**: start with lint-only checks, add safe repairs only
  when OpenClaw already has a clear config mutation, and add runtime gates only
  where a stable runtime hook already exists.
- **Auditable by construction**: clean policy checks should produce hashes for
  the policy artifact, evidence, findings, and final attestation so operators
  can prove what was checked.
- **Future categories fit the same loop**: a new policy area should be able to
  add evidence, findings, optional repair, and optional runtime enforcement
  without changing the overall policy contract.

## Current Upstream Stack

### Wave 1: Doctor Health Contract

Goal: make doctor checks separately detectable, repairable, and lintable.

- Add `detect()` / `repair()` health-check shape.
- Add `openclaw doctor --lint`.
- Keep legacy `run(ctx)` support.
- Use post-repair validation to prove fixes cleared the same class of issue.

### Wave 2: Policy as a Bundled Extension

Goal: prove policy can enforce OpenClaw configuration conformance through the
doctor health surface.

- Add `policy` as a bundled extension.
- Register policy health checks.
- Add `policy check` attestation output.
- Include policy hash, evidence hash, findings hash, timestamp, and attestation
  hash.
- Keep policy as a conformance layer over existing OpenClaw settings.

### Wave 3: Channels

Goal: show policy working across channel configuration.

Candidate checks:

- Required channel providers are enabled.
- Forbidden channel providers are disabled.
- DM and group policies match authored requirements.
- Allowlist settings are present where required.
- Channel command and gateway-method exposure is constrained.
- Channel repair can safely turn forbidden providers off when the existing
  settings surface supports it.

Example requirement:

```jsonc
{
  "channels": {
    "deny": ["telegram"],
    "require": {
      "slack": {
        "dmPolicy": "allowlist",
        "groupPolicy": "allowlist"
      }
    }
  }
}
```

### Wave 4: Tools and Runtime Tool Policy

Goal: show policy working across tool metadata and a runtime enforcement hook.

Candidate checks:

- Registered tools have policy metadata.
- Tool metadata includes risk and sensitivity-relevant classifications.
- Runtime trusted-tool policy is enabled when required.
- Tool invocation audit can include policy/attestation identity.

Runtime enforcement should read the existing OpenClaw runtime hook state. Policy
should not duplicate the tool registry.

## Next Candidate Branches

### Model and Provider Conformance

Candidate branch: `policy-model-provider-conformance`

Checks:

- Approved provider list.
- Forbidden provider list.
- Approved model IDs or model classes.
- Default model and routing settings.
- Local vs hosted provider constraints.

Why it matters: enterprises often approve providers and models before allowing
production use.

### Web and Network Conformance

Candidate branch: `policy-web-network-conformance`

Checks:

- Approved web-search providers.
- Approved web-fetch providers.
- Domain allow/deny requirements.
- Private-network and local-network access constraints.
- External-content marking requirements.

Why it matters: web access is a common boundary for data loss, prompt injection,
and regulated network exposure.

### MCP and External Tool Server Conformance

Candidate branch: `policy-mcp-conformance`

Checks:

- Approved MCP servers.
- Allowed transports.
- Command/process server restrictions.
- Server origin and scope requirements.
- Exposed MCP tool inventory.

Why it matters: MCP can extend the tool surface quickly, so policy needs to
validate what the workspace is actually exposing.

### Gateway Exposure Conformance

Candidate branch: `policy-gateway-exposure-conformance`

Checks:

- Bind host and port.
- Auth mode.
- Public URL exposure.
- Registered gateway methods.
- Discovery service exposure.
- Webhook route exposure.

Why it matters: gateway configuration is where local workspace behavior becomes
externally reachable.

### Exec, Shell, and Node Host Conformance

Candidate branch: `policy-exec-node-host-conformance`

Checks:

- Approval mode.
- Sandbox and network settings.
- Node host command exposure.
- Dangerous command policy.
- Node invoke policy registration.

Why it matters: this is a critical path for elevated local execution. It should
likely follow maintainer feedback because changes here may require extra review.

### Secrets and Credential Conformance

Candidate branch: `policy-secrets-conformance`

Checks:

- Secret references instead of literal secrets.
- Required credential source.
- OAuth profile ownership.
- Token file requirements.
- Basic file permission expectations.

Why it matters: policy should help prove sensitive credentials are referenced
through approved mechanisms.

### Memory, Context, and Retention Conformance

Candidate branch: `policy-memory-retention-conformance`

Checks:

- Memory enabled or disabled by policy.
- Approved memory store.
- Retention requirements.
- Context-engine and compaction provider constraints.
- External memory export settings.

Why it matters: enterprise users often need predictable retention and context
handling rules.

### Diagnostics and Telemetry Conformance

Candidate branch: `policy-diagnostics-conformance`

Checks:

- OpenTelemetry and Prometheus enabled state.
- Endpoint allowlist.
- Sampling settings.
- Redaction requirements.

Why it matters: audit and observability are useful only when they are configured
consistently.

### Media, Speech, and Generation Provider Conformance

Candidate branch: `policy-media-provider-conformance`

Checks:

- Approved image, video, speech, music, and media-understanding providers.
- External media storage constraints.
- Safety or watermark settings where available.

Why it matters: media providers can move data across different vendor surfaces.

### Plugin Lifecycle and Supply Chain Conformance

Candidate branch: `policy-plugin-lifecycle-conformance`

Checks:

- Enabled plugin inventory.
- Required or forbidden plugins.
- Externalized plugin source.
- Version and update policy.
- Auto-enable probe and migration-provider exposure.

Why it matters: plugin install/update behavior is sensitive and should probably
be sequenced after maintainer feedback.

## Support Types

Each area should choose the smallest useful support type:

- **Lint-only**: reports drift or missing configuration.
- **Fixable settings**: repairs a safe setting through existing OpenClaw config
  APIs.
- **Runtime gate**: enforces at runtime through an existing hook.
- **Evidence-only**: records what was observed for audit without enforcement.

The policy extension should prefer lint-only first, add fix only where the
repair is obvious and reversible, and add runtime gates only where OpenClaw
already has a stable hook.
