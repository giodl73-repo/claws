## Decision requested

Should OpenClaw provide an opt-in, startup-only way to compose independently
authored configuration sources while preserving field authority?

## Why

Hosts often combine deployment defaults, tenant connectivity, and
operator-local settings. Lobster currently demonstrates the cost of flattening
those sources outside OpenClaw: source boundaries disappear, launchers must
approximate OpenClaw config behavior, and a later overlay can silently replace
an earlier security boundary.

RFC 0019 keeps the values in the ordinary OpenClaw schema and adds one generic
composition seam around them. It does not create a hosted-config schema,
control plane, policy language, or set of built-in host/tenant/operator roles.

## Ownership model

- Existing OpenClaw subsystems continue to own field meaning, defaults,
  validation, runtime behavior, and the two schema-specific bounded rules.
- The invoker or host owns source contents, secure materialization, permissions,
  order, rollout, and process replacement.
- OpenClaw config bootstrap owns source preparation, recursive composition,
  authority admission, and fail-closed startup.
- The existing Gateway config lifecycle owns the one accepted runtime snapshot.
- Runtime consumers use that ordinary snapshot and never interpret layer ids.

The first declaring layer has authority over a path only within the evaluated
candidate and accepted process activation. Layer ids are diagnostic labels,
not principals or durable owner identities. A full process restart recomputes
authority from current sources; an in-process Gateway restart reuses the
accepted snapshot.

This gives OCC, Fleet, Lobster, or another host a clean caller boundary: they
may compile desired state and select sources without taking ownership of
OpenClaw config semantics.

## Normative contract

The [Managed Configuration V1 sidecar](https://github.com/giodl73-repo/rfcs/blob/user/giodl/rfc-managed-config-rfc-only/rfcs/0019/managed-configuration-v1-spec.md)
is normative. The RFC supplies motivation, examples, evidence, and migration
guidance.

V1 is deliberately narrow:

- repeated ordered `--config-layer <id=path>` startup inputs;
- native JSON5, include, environment, schema, and plugin processing;
- recursive first-declaration exact authority;
- conservative `tools.allow` narrowing and `tools.deny` broadening;
- one startup-only, read-only Gateway snapshot;
- path-scoped mutation exclusion;
- no reload, write routing, provenance API, generations, or rollback.

No flag preserves ordinary OpenClaw config behavior.

## Example

```bash
openclaw gateway run \
  --config-layer scout=./scout-global.json5 \
  --config-layer tenant=./tenant-network.json5 \
  --config-layer operator=./operator-local.json5
```

```text
ordered sources
  -> independent native preparation
  -> recursive authority fold
  -> final schema and plugin validation
  -> one immutable runtime snapshot
```

A later exact-path replacement rejects with `ControlledByEarlierLayer`. A
later bounded tool-policy declaration is accepted only when OpenClaw can prove
that it tightens the earlier value.

## Implementation and evidence

- Simplified implementation: [openclaw/openclaw#107026](https://github.com/openclaw/openclaw/pull/107026)
- Broad exploratory prototype: [giodl73-repo/openclaw#33](https://github.com/giodl73-repo/openclaw/pull/33)
- Lobster adoption evidence: [giodl/lobster#12](https://microsoft.ghe.com/giodl/lobster/pull/12)
- 101 exact-head focused tests plus type, lint, documentation, build, security,
  and QA checks on the current implementation review head
- Foreground proofs cover successful composition, conflict rejection, mutation
  rejection, and no canonical config creation or modification

## Delivery

1. Land the OpenClaw core after maintainer agreement and a coordinated rebase
   onto current main.
2. Adopt a released conformant OpenClaw version behind a host rollout switch.
3. Prove representative source sets through real process startup.
4. Delete Lobster's legacy overlay writer and stale-value cleanup only after
   rollout and rollback evidence.

The RFC remains draft while maintainers review the ownership boundary and
bounded V1 contract.
