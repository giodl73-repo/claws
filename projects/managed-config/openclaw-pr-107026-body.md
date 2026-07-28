Related RFC: [RFC 0019: Managed Configuration](https://github.com/openclaw/rfcs/pull/34)

## Problem

Hosts such as Lobster need to combine deployment-wide defaults, tenant
connectivity, and operator-local choices before starting OpenClaw. Flattening
those inputs externally erases source authority and forces launchers to
approximate OpenClaw's JSON5, include, environment, schema, plugin, and
tool-policy semantics.

This PR adds an official opt-in startup seam: repeated ordered ordinary
OpenClaw config documents.

## Ownership boundary

OpenClaw continues to own field semantics, validation, bounded tool-policy
comparison, authority admission, and the active runtime snapshot. The invoker
owns source contents, secure materialization, declared order, rollout, and
process replacement.

The earliest declaring layer controls a path only for the evaluated candidate
and accepted process activation. Layer ids are labels, not identities or roles.
A full process restart recomputes authority from current sources; an in-process
Gateway restart reuses the accepted snapshot. Gateway, plugins, channels,
tools, and agents consume one ordinary config and do not implement layering.

## User impact

Nothing changes unless `--config-layer` is supplied. Ordinary config users do
not need to know the feature exists.

Layered Gateways use one immutable startup snapshot. Config and agent mutation
paths reject before persistence or workspace side effects, hot reload is
disabled, and canonical config writes are blocked for that Gateway. New source
values require full process restart or replacement.

## Example

```bash
openclaw gateway run \
  --config-layer global=./scout-global.json5 \
  --config-layer tenant=./tenant-network.json5 \
  --config-layer operator=./operator-local.json5
```

Only declaration order matters. A later exact-path replacement rejects; the
two V1 bounded tool-policy paths accept only proven tightening.

## V1 scope

- Repeatable ordered `--config-layer <id=path>`
- Native JSON5, include, environment, schema, and plugin processing
- Recursive sparse-object composition
- First-declaration exact authority
- Conservative `tools.allow` ceiling and `tools.deny` floor
- One startup-only, read-only Gateway snapshot
- Path-scoped canonical persistence blocking
- No layer roles, reload, write routing, provenance API, or rollback generations

## Evidence

- Current implementation review head: `409fab999c4095c5b24a8d7ac23d495659738666`
- Exact-head local validation: `pnpm tsgo`, both dead-export scans, 101 focused
  tests, and targeted Oxlint with zero warnings or errors
- Exact-head GitHub validation: required type, lint, docs, build-artifact,
  config/Gateway boundary, security, QA smoke, dependency, and real-behavior
  checks pass; CodeQL concluded neutral
- Historical foreground proof: successful three-layer startup, composed
  `config.get`, rejected mutation, rejected conflicting startup, and no
  canonical config creation
- Fresh/existing-state proofs preserved canonical state byte-for-byte
- Broad prototype: [giodl73-repo/openclaw#33](https://github.com/giodl73-repo/openclaw/pull/33)
- Lobster adapter: [giodl/lobster#12](https://microsoft.ghe.com/giodl/lobster/pull/12)

Landing remains contingent on maintainer agreement with the bounded core
contract and a coordinated rebase onto current main.
