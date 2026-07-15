# B5: Host Integration Bundle Registration

## Outcome

Register one namespaced host offerings bundle and expose its effective
inventory without centralizing owner activation.

## Repository And Dependencies

- Repository: `openclaw/openclaw`
- Depends on: B3 and B4 provide real contribution types
- Fork branch: `user/giodl/hosted-integration-b5-bundle-registration`
- Head: `facdc99dc48`
- Draft fork PR:
  [giodl73-repo/openclaw#45](https://github.com/giodl73-repo/openclaw/pull/45)

## Change

- Reuse the plugin manifest and existing owner registries.
- Validate one immutable registration snapshot before publication.
- Record IDs, versions, owners, provenance, and readiness criteria.
- Reject duplicate, missing, unsupported, or incompatible required entries.

## Non-Goals

- No universal invoke API or global activation transaction.
- The bundle does not contain secret values or detailed owner configuration.

## Proof And Exit

- A complete snapshot publishes all contributions atomically.
- An invalid snapshot publishes none.
- Owner config can resolve a compatible typed ID and rejects incompatible IDs.

## Completed Proof

- Added `host-integration-bundle/v1` under the existing hosting owner.
- The first contribution union is limited to the real B3/B4 model-adapter and
  credential-slot-resolver types.
- One process-wide snapshot is replaced only after the entire candidate
  validates; a rejected candidate leaves the previous snapshot published.
- Inventory records desired and resolved versions, required posture, readiness
  criteria, and plugin-discovery provenance without activating owners.
- IDs are namespaced and globally unique across owners and contribution kinds.
- Required missing/incompatible entries fail closed; optional failures remain
  visible as structured inventory.
- Exact typed owner lookup rejects missing and incompatible references.
- No config key, plugin-manifest field, secret value, carrier, or startup
  activation was added. D1a owns the first concrete host-package registration.
- 7 focused tests, formatting, focused lint, core TypeScript, and diff checks
  passed.
- Final Codex startup-wiring request was consciously rejected because B5 is the
  receiver contract and D1a supplies the first actual `lobster-host` package.
