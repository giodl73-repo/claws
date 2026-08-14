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
| `bic/LobsterClaw` | #1 | `lobsterclaw/provenance-v1` | Open | Add the simple provenance manifest, verifier, and retain/rebuild/remove rule with zero patches imported. |
| `bic/LobsterClaw` | Follow-up | TBD | Prepared locally | Import Lobster #7055's exact 38-patch queue only after provenance v1 lands. |

## Related Areas

- `../enterpriseclaw/README.md`
- `../promoteclaw/README.md`
- `../lobster/README.md`
