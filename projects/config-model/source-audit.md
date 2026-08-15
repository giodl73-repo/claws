# Config Model Source Audit

## Frame

OpenClaw already owns config parsing, redaction, schema lookup, hash conflicts,
validation, writes, reload planning, and runtime activation. The missing
capability is a framework-neutral settings projection that Lobster can render
without copying Control UI controller state or interpreting raw config.

## Source-Backed Facts

| Surface | Current behavior | Decision |
| ------- | ---------------- | -------- |
| `config.get` | Read-scoped, returns a redacted snapshot with hash, validity, issues, and source/resolved/config objects. | Use for the read-only model. |
| `config.schema.lookup` | Read-scoped and returns one path, schema, reload kind, hints, and children. | Use for lazy native descriptors. |
| `config.schema` | Admin-scoped full schema. | Do not require for the first read-only host. |
| `config.set`, `config.patch`, `config.apply` | Admin-scoped writes guarded by a base hash and runtime read-only policy. | Exclude until governed source authority and preview exist. |
| `ui/src/ui/controllers/config.ts` | Mixes useful refresh/hash/form semantics with Lit state, raw form editing, presets, update UI, and product errors. | Extract only owner-neutral read/lookup semantics. |
| Managed Configuration | Defines ordered sources, authority, effective snapshots, provenance, and transactional activation. | Required basis for native governed writes. |

## Current Gap

The 2026.6.33 wire response for `config.get` is typed only inside Control UI.
The first proof defines a bounded model response without changing server
behavior. Later work should promote a validated presentation-safe result type
into the protocol or shared normalization owner.

## Disproof

Reject the model if it:

- parses unredacted files in Lobster;
- treats coarse `operator.admin` as per-field authority;
- silently accepts malformed snapshots;
- writes without a base generation/hash and explicit target source;
- reports activation success after a failed reload; or
- requires Control UI Lit state to render native settings.

