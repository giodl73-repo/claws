# Lobster Localization Comparator

Updated: 2026-07-16

## Merged PRs

- `bic/lobster#4357` onboarded Lobster to OneLocBuild for web TypeScript and
  Rust runtime catalogs.
- `bic/lobster#4455` fixed the dedicated localization pipeline and proved a
  successful handoff in ADO build `171881799`.

## Target Scale

The successful Lobster handoff reported:

```text
0% localized for 47 languages
```

The related Cowork localization report records:

```text
48 real runtime locales + 2 pseudo-locales
```

The counts are consistent with 47 translated languages plus the `en-US` source
locale, for 48 real locales, with `qps-ploc` and `qps-plocm` as two additional
pseudo-locales. The exact 47-locale `M365_Chat` membership is controlled by the
CEINTL language set and is not enumerated in the checked-in Lobster or Cowork
manifests available to this audit.

## Current Product Coverage

Lobster does not yet have full localization coverage. The merged proof of
concept contains:

- two web source strings;
- two Rust runtime source strings;
- one web component using the translator;
- an English runtime catalog embedded at compile time; and
- a dedicated translation handoff pipeline.

The current web `CATALOGS` map registers only `en-US`. Runtime loading of
translated catalogs, browser locale detection, broad string migration, and
translated-catalog PR-back into GitHub Enterprise remain follow-up work.

## Implication For RFC 0024

Use Lobster as a pipeline comparator, not as a locale target or completeness
baseline:

- OpenClaw v1 should explicitly register its existing 22-locale product union.
- OpenClaw should deepen coverage across its own user journey rather than
  inherit the `M365_Chat` language set.
- Pseudo-localization should be part of coverage testing.
- A handoff pipeline is not equivalent to localized product coverage.
- Coverage claims must count migrated strings and active runtime catalogs, not
  only translation targets configured in a service.
