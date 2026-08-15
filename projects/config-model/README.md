# OpenClaw Config Model Project

Use this area for a framework-neutral settings projection over OpenClaw
configuration, schema lookup, authority, validation, candidate preview, and
activation status.

## Active Notes

| Area | File |
| ---- | ---- |
| Current session | `SESSION.md` |
| Source audit | `source-audit.md` |
| First evidence slice | `slice-1-read-only-model.md` |

## Active Work

| Repo | Branch | Status | Purpose |
| ---- | ------ | ------ | ------- |
| `bic/LobsterClaw` local generation branch | `user/giodl/config-model-proof` at `a03889e2eb` | Fork-only proof | Add optional `@openclaw/gateway-client/model/config` read-only snapshots and schema lookup against the pinned 2026.6.33 runtime. |
| `openclaw/openclaw` | Managed Configuration stack | Separate prerequisite | Add source authority, provenance, candidate preview, conflicts, and transactional activation before governed native writes. |

## First Slice

The first proof is deliberately read-only:

- load the redacted `config.get` snapshot;
- expose immutable state and structured errors;
- choose the presentation-safe source configuration;
- lazily call read-scoped `config.schema.lookup`;
- reject malformed responses; and
- retire in-flight work on disposal.

Writes are excluded until Managed Configuration can expose an explicitly
writable source, provenance, conflicts, preview findings, generation, and
transactional activation.

## Related Areas

- `projects/config-admin/README.md`
- `projects/managed-config/README.md`
- `projects/control-ui/README.md`
- `projects/lobsterclaw/README.md`

