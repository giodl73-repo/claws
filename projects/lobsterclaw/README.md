# LobsterClaw Project

Use this area for the private BIC OpenClaw distribution: exact upstream release
bases, Lobster patch provenance, deterministic reconstruction, validation, and
patch retention, rebuild, or removal across upgrades.

LobsterClaw is intentionally simpler than EnterpriseClaw. Git commits are
immutable generations, and one manifest is the ordered patch ledger.

## Active Notes

| Area | File |
| ---- | ---- |
| Current session and resume state | `SESSION.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| ---- | ---------- | ------ | ------ | ------- |
| `bic/LobsterClaw` | #1 | `lobsterclaw/provenance-v1` | Merged | Add the simple provenance manifest, verifier, and retain/rebuild/remove rule with zero patches imported. |
| `bic/LobsterClaw` | #2 | `lobsterclaw/2026.6.33-7055-v2` | Open | Import Lobster #7055's 39 exact source-backed patches. |
| `bic/lobster` | #7055 | `promoteclaw/openclaw-2026.6.33` | Open; runtime checks active | Own the authoritative 6.33 patch queue, including the final compile-contract repair patch. |

## Related Areas

- `../enterpriseclaw/README.md`
- `../promoteclaw/README.md`
- `../lobster/README.md`
