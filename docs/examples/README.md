# OpenClaw Workspace Examples

Real-world OC workspace examples for testing claws parser tolerance and
governance extraction quality. Sourced from the OC ecosystem.

## Sources

| Source | URL | What |
|--------|-----|------|
| **awesome-openclaw-agents** | [github.com/mergisi/awesome-openclaw-agents](https://github.com/mergisi/awesome-openclaw-agents) | 199 production-ready SOUL.md templates across 24 categories |
| **souls-directory** | [github.com/thedaviddias/souls-directory](https://github.com/thedaviddias/souls-directory) | Curated SOUL.md personality files |
| **workspace-template** | [github.com/kindomLee/openclaw-workspace-template](https://github.com/kindomLee/openclaw-workspace-template) | Production-tested workspace with memory architecture, cron system |
| **openclaw-workspace skill** | [github.com/win4r/openclaw-workspace](https://github.com/win4r/openclaw-workspace) | Skill for maintaining workspace files |
| **soul.md builder** | [github.com/aaronjmars/soul.md](https://github.com/aaronjmars/soul.md) | Data ingestion → SOUL.md generator |
| **official templates** | [github.com/openclaw/openclaw/docs/reference/templates](https://github.com/openclaw/openclaw/tree/main/docs/reference/templates) | Official OC workspace file templates |

## Directory Structure

```
examples/
  official/          ← Official OC templates (from openclaw/openclaw repo)
  community/         ← Real community workspaces (diverse formats)
  adversarial/       ← Edge cases for parser tolerance testing
```

## Usage

These examples serve two purposes:

1. **Parser testing** — Verify claws parsers handle real-world format diversity
2. **Governance extraction quality** — Measure what intent claws extracts vs what a human would identify

Run against the reference workspace:
```bash
cd claws-sdk && vitest run tests/accept/gateway/
```
