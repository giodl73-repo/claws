# Claws RFC Sketch

Status: superseded by the draft RFC text in
`rfcs/0010-claws.md` on
`/root/src/openclaw-rfcs-capability-packs`.

## Current Framing

- User-facing name: `Claw`, with `Claws` plural.
- Purpose: a runnable starter setup manifest for OpenClaw agents.
- Initial member kinds: skills, plugins, MCP servers, connectors,
  workspace files, persona files, heartbeat/crons, schedules, and automations.
- Schema/feed naming: `openclaw.claw.v1` and `claw`.
- Feeds remain the discovery, curation, approval, block, pin, and
  source-selection layer. Claws describe scenario composition.
- Plugins may bundle companion skills when those skills are part of the plugin's
  own experience. Claws do not replace that; Claws compose starter setups across
  existing artifacts, files, and automations, including plugins that bundle
  their own skills.

## PR Tracks

OpenClaw owns Claw semantics, source-neutral local reading, planning, install
orchestration, workspace/automation previews, provenance, status, and lifecycle
proof.

Claw apply provenance should be Claw-owned state in OpenClaw's shared SQLite
state database. Plugins already have durable install records there, while skills
are primarily installed directories discovered from skill roots. The Claw layer
should therefore reference plugin install records by installed-plugin identity
and skill installs by canonical path/slug/source identity, then keep Claw
reference accounting in its own state rather than relying on skill directories
or plugin install records to encode Claw ownership.

ClawHub owns public Claw publishing, authoring docs, search/detail pages, feed
export, and published-artifact E2E proof.
