# CXJ — `claws.json` config

**Sub-spec of**: [CX-cli.md](./CX-cli.md)

## Schema

```ts
interface ClawsJson {
  readonly version: 1;
  readonly snapshotId: string;
  readonly policyArtifactSha256?: string;
  readonly fleet?: string;        // fleet name for inheritance
  readonly trust?: TrustConfig;
  readonly hosts?: ReadonlyArray<HostBinding>;
}
```

One `claws.json` per workspace, at the workspace root. The file is
checked into version control — it's the per-repo governance
configuration.

## Three-layer merge

Effective config is computed by merging three layers in order:

1. **Default** — compiled-in defaults (lowest precedence)
2. **Fleet** — if `fleet: foo` is set, pull from
   `~/.claws/fleets/foo.json` (read-only from fleet admin)
3. **Workspace** — `./claws.json` (highest precedence)

Later layers override earlier layers field-by-field (NOT deep merge
— shallow field-level override). Arrays are REPLACED wholesale, not
concatenated.

See [../pitfalls/config.md](../pitfalls/config.md) for the
override-order surprises this model catches.

## Stability contract

`version: 1` is the only supported value. Bumping requires an
explicit migration tool — silently loading a `version: 2` file
errors with `claws-json: unsupported version 2`.

Field additions follow semver-minor (new optional field added).
Field removals / renames follow semver-major.

## Fleet inheritance

The `fleet` field is a string token referring to a fleet name. The
fleet binding at `~/.claws/fleets/{name}.json` is resolved at load
time. If the fleet file is missing, `claws` errors with
`fleet-not-found` rather than silently falling back — the operator
intentionally set a fleet, we won't guess what they meant.

## Security

`claws.json` is not privileged — it's plaintext config. Secrets
NEVER go in `claws.json`. Trust-set keys live in a separate file
referenced by path (`trust.source`), which points at a restricted
filesystem location.
