# Icelines Project

Use this area for active ICELINES forecasting, product-surface, validation, and
TRACKER snapshot work.

## Active Notes

| Area | File |
| ---- | ---- |
| Resume state | `SESSION.md` |
| Player-line matchup plan | `design/plans/2026-08-01-player-line-matchup-forecast.md` in ICELINES |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| ---- | ---------- | ------ | ------ | ------- |
| ICELINES | PR #38 | merged | Complete | Compose edge-owned probability movement into the Matchup card through an exact provenance join. |
| TRACKER | PR #43 | merged | Complete | Pin the merged ICELINES matchup-edge card commit. |
| ICELINES | PR #39 | merged | Complete | Carry lineup-owned headshot assets into sealed Matchup profiles and cards with deterministic initials fallbacks. |
| TRACKER | PR #44 | merged | Complete | Pin the merged ICELINES Matchup headshot commit. |
| ICELINES | PR #40 | merged | Complete | Add game-ID-scoped Matchup HTML/JSON discovery and the TUI `matchup-card` command over one sealed card document. |
| TRACKER | PR #45 | merged | Complete | Pin ICELINES Matchup Web/TUI discovery at `4f5b9997`. |
| ICELINES | PR #41 | merged | Complete | Harvest chronological Matchup observations by exactly joining sealed forecasts, sealed trainer ablations, and official outcomes. |
| TRACKER | PR #46 | merged | Complete | Pin ICELINES Matchup observation harvesting at `cda80a67`. |
| ICELINES | PR #42 | merged | Complete | Publish sealed Matchup documents through a content-addressed local catalog with strict integrity, rollback, and concurrent-writer protection. |
| TRACKER | PR #47 | merged | Complete | Pin ICELINES Matchup publication and dynamic Web/TUI discovery at `848b6bb3`. |

The next product candidate is automating the game-morning producer-to-publisher
handoff across eligible games, then deleting the bundled pilot fallback after
operational publication coverage is proven.

## Related Areas

- `projects/prs/README.md`
- `projects/disk-mgmt/README.md`
