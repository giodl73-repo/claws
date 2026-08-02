# RFC Scope: Capability Surface Negotiation

- ID: EC-013
- Lane: Actions, tools, and integrations
- Status: Scoped draft
- Initial posture: Fork + focused RFC
- Primary owner: Tool/plugin capability composition

## Scope

- Distinguish inert definitions, installed capability, active binding,
  run-scoped surface, compatibility, and authorization requirements.
- Surface authorization requirements for EC-014 without owning authorization
  or effect settlement.

## Explicit Exclusions

- Capability advertisement as permission.
- One catalog as runtime owner.
- Authorized invocation and external-effect correlation, owned by EC-014.

## Required Outcomes

- Unsupported and degraded capabilities are explicit.
- Unsupported and degraded are distinct outcomes with owner/generation
  evidence.
- Negotiation declares contract, protocol, artifact, and extension version
  ranges for each surfaced capability; unknown authority, lifecycle, or effect
  semantics fail closed rather than appearing supported or merely degraded.
- Each negotiated run-scoped surface has a stable surface identity plus owner
  and generation so invocation and evidence correlate to the exact set.
- Discovery does not invoke or activate.
- Promotion beyond scoped draft requires a bounded evidence slice covering
  local and MCP capabilities, unsupported, degraded, and discovery-only paths.

## Dependencies

- EC-006 and EC-022.

## Proof and Deletion Gate

- Negotiate unlike local and MCP capabilities.
- Delete adapters that infer activation from registration.
- Disprove the separate contract if current local/MCP descriptions already
  negotiate capability/version compatibility, unsupported/degraded states,
  and run-scoped bindings without inferring activation from registration.
