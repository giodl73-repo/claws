# RFC Scope: Extension Capability Metadata

- ID: EC-027
- Lane: Extensibility, artifacts, and release
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Extension definition owners

## Scope

- Define inert metadata for plugins, skills, tools, channels, providers, and
  host bindings: owner, version, capabilities, dependencies, compatibility,
  lifecycle, and trust requirements.
- Carry stable definition identity independent of display name, path, or
  consumer-specific manifest shape.

## Explicit Exclusions

- Catalog as activation authority.
- Changing the portable skill/workspace format.
- Evaluating or satisfying declared trust requirements, owned by EC-028.

## Required Outcomes

- Metadata is useful without EnterpriseClaw.
- Metadata is optional and additive; a skill remains loadable as a bare
  SKILL.md folder.
- Unknown optional fields and versions evolve safely; unknown required trust,
  lifecycle, or compatibility semantics make the definition incompatible
  rather than silently ignorable.
- Incompatible metadata is rejected or ignored according to declared
  compatibility rather than silently approximated.
- Definitions remain separate from selected and active bindings.
- Existing manifests migrate through additive adapters without requiring
  ecosystem-wide rewrites.
- Metadata evidence records definition owner, version, compatibility result,
  and observation time without activating the extension.

## Dependencies

- EC-013 and EC-022.

## Proof and Deletion Gate

- Describe one skill, plugin, and provider consistently.
- Delete duplicated consumer-specific manifests where possible.
- Disprove the separate contract if existing skill/plugin/provider definitions
  already expose stable, portable, inert capability metadata and
  compatibility/trust requirements without changing baseline artifact shape
  or adding parallel manifests.
