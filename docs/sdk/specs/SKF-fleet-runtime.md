# SKF — Fleet runtime

**Sub-spec of**: [SK-sdk.md](./SK-sdk.md) · **Internal**

## Fleet concept

A "fleet" is a group of workspaces that share a common policy base.
The fleet binding lives in a central location
(`~/.claws/fleets/{name}.json`) and declares the policy elements
workspaces inherit.

Use case: a company-wide fleet `acme` sets the trust set, the
minimum severity gate, the set of approved hosts, and the base
policy IR. Individual workspaces add workspace-specific overrides
in their local `claws.json`.

## Fleet binding shape

```ts
interface FleetBinding {
  readonly version: 1;
  readonly fleetName: string;
  readonly policyIR: GovernanceIR;    // compiled fleet base
  readonly trustSet: TrustSet;
  readonly hosts: ReadonlyArray<HostBinding>;
  readonly severityGate: 'block' | 'warn' | 'off';
  readonly signedBy: string;          // fleet admin principal
  readonly signature: string;         // HMAC over canonical bytes
}
```

Fleet bindings are SIGNED — workspaces verify the signature before
inheriting. A tampered fleet binding is rejected at load time.

## Inheritance resolution

The SDK's `FleetResolver` handles inheritance:

```ts
class FleetResolver {
  resolve(ws: Workspace, fleetName: string): EffectiveConfig;
}
```

Resolution order:

1. Load the workspace's `claws.json`
2. If `fleet:` is set, fetch the fleet binding
3. Verify the binding's signature against the trust set
4. Merge fleet + workspace per the three-layer rule (see
   `cli/specs/CXJ-claws-json.md § Three-layer merge`)
5. Return the effective config

Failures at any step raise `FleetResolutionError`. The workspace
does NOT fall back to defaults — an explicit fleet reference must
resolve successfully.

## Rollout semantics

Fleet admins push updates by re-signing the binding and publishing.
Workspaces pick up the new binding on their next `claws` invocation
(no background polling).

To force a workspace to stay on a pinned fleet version: `fleet: 'acme@v5'`.
The version qualifier pins to a specific binding hash; updates need
an explicit version bump in the workspace's `claws.json`.
