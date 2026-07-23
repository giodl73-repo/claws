# PromoteClaw feed discovery

Date: 2026-07-21

## Confirmed feed/process references

We found concrete references for Galin's OpenClaw quarantine/LTS feed process.

## Azure Artifacts feeds

From `bic/lobster` `docs/feed/README.md`:

| Feed                    | URL                                                                                     | Purpose                                                              |
| ----------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `M365-Lobster-Upstream` | `https://pkgs.dev.azure.com/msazure/One/_packaging/M365-Lobster-Upstream/npm/registry/` | Quarantine/ingest feed for upstream OpenClaw packages.               |
| `M365-Lobster`          | `https://pkgs.dev.azure.com/msazure/One/_packaging/M365-Lobster/npm/registry/`          | Team consumption feed for CI/Docker builds and Lobster extensions.   |
| `Lobster`               | `https://pkgs.dev.azure.com/msazure/One/_packaging/Lobster/npm/registry/`               | Local dev feed; upstream source is `M365-Lobster-Upstream @Release`. |

## Pipelines

From GHE code search in `bic/lobster`:

| Pipeline                   | File                                              | Schedule                 | Purpose                                                                                                                                                                                                          |
| -------------------------- | ------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ingest upstream            | `.pipelines/lobster-feed/ingest-upstream.yml`     | Hourly                   | Downloads latest LTS from public npm and publishes to `M365-Lobster-Upstream` with `@quarantine` tag.                                                                                                            |
| Promote to release         | `.pipelines/lobster-feed/promote-lts.yml`         | Daily 06:00 UTC + manual | Promotes packages that are 7+ days old and CG-clean from `@quarantine` to `@Release`, then republishes tarballs to the `Lobster` feed.                                                                           |
| Open PromoteClaw candidate | `.pipelines/lobster-feed/promoteclaw-open-pr.yml` | Daily 07:00 UTC          | Detects the newest `openclaw` version in `@Release` and opens or updates a draft Lobster promotion PR. Registered as ADO definition `469977`; first dry runs remain blocked on protected-resource authorization. |

`promote-lts.yml` parameters include:

- `packageName` default `openclaw`
- `specificVersion`
- `day0Override`
- `day0WorkItemId`

The pipeline checks these packages together:

- `openclaw`
- `@openclaw/plugin-sdk`
- `@openclaw/plugin-package-contract`
- `@openclaw/memory-host-sdk`

## Quarantine and acceptance rules

WorkIQ found Galin references:

- 2026-06-17 Teams chat: OpenClaw package is consumed via a dCISO-blessed feed
  that quarantines it for 7 days before putting it in the product feed, to give
  security scans and day-0 vulnerabilities time to surface.
- 2026-04-22 email: process is pull from npmjs.org, push to internal Azure
  Artifacts feed, run 1ESPT SDL tools, enforce 7-day quarantine, lock down feed
  access, consume from internal feed during Docker builds/local development.
- Explicit rule: "Enforce a 7-day quarantine window (based on publish timestamp /
  vulnerability checks) before pushing to the internal feed."
- Access rule: remove default readers; allow only pipeline identity to prevent
  internal copy escaping to other feeds.
- 2026-04-20 email references "official release NPM - LTS feed quarantine,
  scanning and patch management" and a Day0 fast-track path into vCurrent LTS
  while vNext remains in quarantine.

## Current public package data

As of 2026-07-10:

- Lobster pin: `openclaw: 2026.5.28`,
  `@openclaw/diagnostics-otel: 2026.5.28`.
- Public npm latest for both packages: `2026.6.11`.
- Public npm publish time for `openclaw@2026.6.11`:
  `2026-06-30T16:04:00.916Z`.
- Public npm publish time for `@openclaw/diagnostics-otel@2026.6.11`:
  `2026-06-30T15:58:04.915Z`.

By age alone on 2026-07-10, `2026.6.11` is older than 7 days. Promotion still
requires checking the internal `M365-Lobster-Upstream @Release` / `Lobster` feed
state and CG-clean status, not just public npm age.

## Internal feed count

Queried Azure DevOps Packaging REST for `openclaw` in `M365-Lobster-Upstream`
on 2026-07-10.

- Package ID: `5f6133b0-adac-407f-b815-a7b8841de102`
- Total `openclaw` versions in `M365-Lobster-Upstream`: **27**
- Latest version in the feed: `2026.6.11`
- Lobster current pin: `2026.5.28`
- Stable versions newer than current Lobster pin: **7**
  - `2026.6.1`
  - `2026.6.5`
  - `2026.6.6`
  - `2026.6.8`
  - `2026.6.9`
  - `2026.6.10`
  - `2026.6.11`
- Latest feed entries inspected all showed views `Local,Release,quarantine`,
  meaning they have come through quarantine and are visible in the release view.

All versions returned by the internal feed query:

```text
2026.4.23, 2026.4.14, 2026.4.12, 2026.4.24, 2026.4.25,
2026.4.26, 2026.4.27, 2026.5.3-1, 2026.5.4, 2026.5.5,
2026.5.6, 2026.5.7, 2026.5.12, 2026.5.18, 2026.5.19,
2026.5.20, 2026.5.22, 2026.5.26, 2026.5.27, 2026.5.28,
2026.6.1, 2026.6.5, 2026.6.6, 2026.6.8, 2026.6.9,
2026.6.10, 2026.6.11
```

## 2026-07-21 refresh

- `openclaw@2026.7.1` is visible in `Local,Release,quarantine`.
- Publish date: `2026-07-13T18:13:06.8396262Z`.
- PromoteClaw selected `2026.7.1` over Lobster main's `2026.5.28` pin.
- `@openclaw/diagnostics-otel@2026.7.1` was not found in `@Release`, so the
  generated candidate retained the existing `2026.5.28` companion pin.
- Generated candidate: Lobster #5402,
  `https://microsoft.ghe.com/bic/lobster/pull/5402`.
- Superseded candidate #4528 (`2026.6.11`) remains useful only as a donor for
  patch re-derivation and CI repairs.

## GHE references found

- `bic/lobster` `.pipelines/lobster-feed/promote-lts.yml`
- `bic/lobster` `.pipelines/lobster-feed/ingest-upstream.yml`
- `bic/lobster` `docs/feed/README.md`
- `bic/lobster` `docs/feed/design.md`
- `bic/lobster` `docs/feed/implementation.md`
- PR #154 `Implement quarantine-to-Release promotion pipeline` by Galin
- PR #488 `fix: point feed .npmrc files at base feed, not read-only @quarantine view` by Galin
- PR #1432 `feat(lobster-feed): republish promoted packages into Lobster team feed` by Galin

## Open questions

- Does the `promote-lts` package list need `@openclaw/diagnostics-otel` added,
  since Lobster currently pins it next to `openclaw`?
- What is the authoritative "LTS" marker? Current docs say the pipeline uses
  public npm `dist-tags.latest` as a proxy because upstream has no `latest-lts`
  dist-tag.
- How should PromoteClaw verify internal feed promotion state from CLI: Azure
  Artifacts REST, `npm view` against the internal registry, or an ADO pipeline
  run artifact?
