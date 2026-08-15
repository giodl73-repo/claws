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
| `gim-home/m` local Lobster branch | `user/giodl/config-model-lc1` at `cb71803d68` | Fork-only adopter; review clean | Carry the Config Model through Electron-owned Gateway transport and render one native read-only OpenClaw settings category. |
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

## First Native Adopter

LC1 proves that Lobster can render OpenClaw-owned settings without browser
hosting or raw Gateway access in React:

- Electron reads `config.get` and `config.schema.lookup`;
- IPC returns only three presentation-safe configured values;
- the native page shows schema help and restart impact;
- unavailable and error states remain structured; and
- the UI states explicitly that OpenClaw owns governed changes.

The renderer cache is scoped to the signed-in Gateway principal and discarded
when that scope is no longer observed. The page labels absent authored values
as inherited or unconfigured rather than claiming to show resolved defaults.

## Related Areas

- `projects/config-admin/README.md`
- `projects/managed-config/README.md`
- `projects/control-ui/README.md`
- `projects/lobsterclaw/README.md`
