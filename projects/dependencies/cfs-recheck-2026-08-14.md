# CFS Exact-Version Recheck - 2026-08-14

The Microsoft-protected npm feed was queried for all fourteen previously
recorded exact gaps.

- `@nolyfill/domexception@1.0.28` is now admitted with the integrity pinned by
  the `node-domexception` alias.
- Thirteen exact identities remain unavailable.
- Every remaining exact package is readable from the upstream CDN.
- Official CFS guidance applies a seven-day npm minimum-release hold.
- Upstream tag timestamps are used only as an age proxy, not as package
  approval or an authoritative npm publish timestamp.

| Package group | Exact version | CFS latest observed | Upstream tag time | State |
| --- | --- | --- | --- | --- |
| `@openclaw/fs-safe` | `0.5.5` | `0.5.2` | 2026-08-12 04:04Z | Inside hold |
| `@openclaw/uirouter` | `0.1.1` | `0.1.0` | 2026-08-10 18:08Z | Inside hold |
| `@trycua/cua-driver` plus six platform packages | `0.19.3` | `0.19.0` | 2026-08-10 13:05Z | Inside hold |
| `eventsource-parser` | `3.1.1` | `3.1.0` | 2026-08-10 15:52Z | Inside hold |
| `hono` | `4.13.2` | `4.13.0` | 2026-08-13 11:52Z | Inside hold |
| `nanoid` | `3.3.18` | `6.0.1` | 2026-08-07 16:35Z | Near hold boundary |
| `ws` | `8.21.3` | `8.21.2` | 2026-08-06 16:15Z | Just beyond hold boundary; allow ingestion lag |

Do not bypass CFS or request an urgent quarantine exception for this normal
dependency refresh. Recheck daily. If an exact version remains unavailable
after its hold and reasonable ingestion lag, use the official CFS ingestion
assistance route at `terrapineng@microsoft.com` or Global Helpdesk via
`https://aka.ms/techweb`, supplying the registry URL, package, exact version,
observed CFS state, upstream proof, lock integrity, and requested action.
