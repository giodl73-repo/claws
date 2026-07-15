# Fleet Cell Boundary

## Thesis

OpenClaw Fleet strengthens the continuity ownership model:

```text
one tenant trust domain
  = one isolated Gateway cell
  = one continuity owner lineage
  = one publication and restore authority domain
```

Continuity does not make one shared Gateway safe for mutually untrusted
tenants. A session ID, continuity owner ID, artifact prefix, or restore
generation is not a tenant authorization boundary. Each tenant must retain the
separate process, container, state tree, credentials, workspace, channel
accounts, token, and network boundary defined by the Fleet model.

Primary reference:

- <https://docs.openclaw.ai/gateway/multi-tenant-hosting>

## Ownership

### Cell identity

Lobster must bind every handoff, publication, restore, and lifecycle record to
one exact cell identity and continuity owner lineage. The cell identity is
infrastructure authority; OpenClaw receives only the frozen owner and operation
identities needed for the managed continuity operation.

Changing the cell, tenant, owner, or adapter incarnation cannot be treated as
same-request replay.

### Captured state

OpenClaw captures only the current cell's authoritative state, config, and
workspace roots. Capture must not traverse:

- the Fleet host registry;
- sibling cell directories;
- host runtime configuration;
- container-engine state; or
- another tenant's credential or publication roots.

Path containment remains a filesystem safety check. It does not replace the
cell/container isolation boundary.

### External credentials

Fleet mounts auth-profile encryption material separately from the ordinary
Gateway state mount:

```text
/home/node/.openclaw
/home/node/.config/openclaw
```

Continuity preserves the existing rule that credential bytes and host-managed
keys are not checkpointed. A replacement cell must receive its tenant-specific
Gateway token, auth-profile encryption key, provider credentials, channel
accounts, and workload identity from the host or approved secret manager.

The artifact records these as external reconstruction obligations. Missing or
cross-tenant credential capability blocks restored readiness; it is never
success-shaped as an empty credential set.

### Publication

The E5b publication binding is cell-scoped:

- storage identity and destination are host-derived;
- object namespace includes trusted owner and handoff identity;
- workload identity cannot retrieve another cell's artifacts;
- same-key/different-digest remains quarantine; and
- no shared host credential is passed through the managed request.

Fleet's lack of a shared application data path is preserved. Continuity does
not add a shared tenant artifact bus or reuse session routing as authorization.

### Restore

Lobster reconstructs the replacement cell's infrastructure profile:

- container image and runtime policy;
- state, config, key, and workspace mounts;
- Gateway token;
- network and egress policy;
- resource limits; and
- tenant-scoped publication binding.

That profile is durable host state, not continuity archive payload. OpenClaw
restores the cell-owned persisted content only after Lobster has attested the
replacement allocation and exact target roots.

## Destruction Scope

`safeToDestroy` authorizes one generation-fenced provider or cell-compute
action after accepted publication and strict source finalization.

It does not authorize:

- `openclaw fleet rm --purge-data`;
- deletion of persistent tenant state;
- deletion of external auth-profile keys or secrets;
- deletion of the Fleet registry row;
- retention-policy changes; or
- removal of another cell generation.

Tenant-data purge is a separate irreversible administrative operation with its
own explicit authority and containment checks. It must never be inferred from
continuity success, idle readiness, shutdown readiness, or provider deletion.

## Trust Model

The Fleet operator and host remain trusted by every colocated tenant.
Continuity provides recovery correctness, tenant-scoped authority, and
cross-cell fail-closed behavior. It does not protect a tenant from a malicious
host administrator that can inspect mounts, replace images, or enter
containers.

Higher-risk tenants still require stronger OCI isolation, microVMs, separate
VMs, or separate hosts. Those choices do not change the one-cell/one-lineage
continuity contract.

## Integration Consequences

- CAPE desired/effective state is evaluated per cell, not for a shared
  multi-tenant Gateway.
- E5a capture runs inside one closed cell while its outer adapter remains
  alive.
- E5b publication and `safeToDestroy` remain bound to that cell's exact source
  generation.
- E6 restore readiness requires both artifact reconstruction and external
  tenant credential capability.
- Fleet is an experimental local-host supervisor, not the Lobster
  multi-machine control plane. Lobster may apply the same cell model without
  depending on Fleet command stability.
