# Config Model Slice 1: Read-Only Projection

## Thesis

The current LobsterClaw runtime can support useful native read-only settings
without changing configuration authority or waiting for upstream publication.

## Implemented Scope

- optional `@openclaw/gateway-client/model/config` export;
- immutable idle/loading/ready/error/disposed snapshots;
- explicit `config.get` refresh;
- source-config-first presentation-safe projection;
- read-scoped `config.schema.lookup`;
- structured malformed-response and disposal errors; and
- no framework, DOM, route, or product imports.

## Proof

- accepted redacted config snapshot;
- source configuration preferred over resolved fallback;
- malformed snapshot rejected without success-shaped state;
- descriptor lookup trims and sends one exact path;
- disposal retires in-flight refresh;
- focused tests pass; and
- the Gateway Client ESM/declaration build emits the new subpath.

## Next Slice

Adopt the read-only model in one host settings page showing:

- effective value;
- descriptor label/help/type;
- reload impact;
- read-only state; and
- a clear reason that writes are unavailable.

The first write slice waits for Managed Configuration to provide source owner,
provenance, writability, lock reason, candidate preview, findings, generation,
and transactional apply status.

