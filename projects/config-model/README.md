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
| `gim-home/m` Lobster fork | [`user/giodl/config-model-lc1` PR #69](https://microsoft.ghe.com/giodl/lobster/pull/69) at `6d4513379e` | Fork-only adopter draft; review and real Electron proof clean | Carry the Config Model through Electron-owned Gateway transport and render one native read-only OpenClaw settings category. |
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
The real Electron Gateway fixture exercises the production adapter and captures
the populated native page with authored values, read-only copy, and restart
guidance in PR #69.

## Related Areas

- `projects/config-admin/README.md`
- `projects/managed-config/README.md`
- `projects/control-ui/README.md`
- `projects/lobsterclaw/README.md`
