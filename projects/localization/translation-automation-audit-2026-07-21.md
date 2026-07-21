# Translation Automation Audit

Date: 2026-07-21
Audited OpenClaw main: `3a1351a3035b71a09c8bbd481a959a462616ab4b`

## Finding

Vincent's translation pipeline is live and already handles new English source
strings for Control UI, native apps, and docs. RFC 0024 should extend this
operating model to CLI, TUI, runtime, Gateway, channel, and metadata catalogs
rather than introduce a parallel publisher.

```text
reviewed English/source inventory lands on main
  -> owner refresh workflow detects changed or stale targets
  -> per-locale workers generate candidate artifacts
  -> aggregate validation runs once
  -> shared publisher opens or updates an automation PR
  -> CI enforces generated parity and protected literals
  -> maturity remains blocked until required human review exists
```

## Current Pipelines

### Control UI

- Trigger: changes to `ui/src/i18n/locales/en.ts`, locale tooling, glossary,
  registry, or workflow inputs; also daily schedule, release, and manual runs.
- Worker: 20 non-English locale jobs, Anthropic first with OpenAI fallback.
- Output: `automation/control-ui-locale-refresh`.
- Publisher: `.github/actions/publish-generated-pr`.
- Policy: generated PR auto-merge is requested; source-only drift is advisory
  because the post-merge bot owns repair, while generated-locale changes are
  strict.
- Live example: source PR
  [#112181](https://github.com/openclaw/openclaw/pull/112181) changed English
  settings and logs keys; generated PR
  [#112213](https://github.com/openclaw/openclaw/pull/112213) refreshed the
  locale artifacts.

### Native Apps

- Trigger: Android, Wear, iOS, macOS, shared-kit, native source inventory, or
  generator changes.
- Worker: 21 target locales, including Swedish.
- Output: `automation/native-app-locale-refresh`.
- Publisher: the same generated-PR action and App-token boundary.
- Policy: source PRs own native source and `apps/.i18n/native-source.json`;
  translated JSON and Android/Apple projections are workflow-owned. CI rejects
  source changes mixed with hard-generated native artifacts.
- Today's Vincent commits added Wear source extraction and publication support;
  generated PR
  [#112306](https://github.com/openclaw/openclaw/pull/112306) is the active
  reconciliation.

### Documentation

- `openclaw/openclaw` mirrors English docs and source metadata into
  `openclaw/docs` after every relevant main push.
- `openclaw/docs` runs `Translate Incremental`, debounces hot main, compares
  stored source hashes, translates only stale or missing pages, shards by
  locale and page, validates and repairs MDX, and applies successful artifacts
  in one aggregate commit.
- Published releases dispatch an additional translation reconciliation.
- Translation memory, generated locale trees, and source hashes remain in the
  publish repo rather than the product repo.

## Shared Native Seams To Reuse

1. Exact source-SHA resolution from protected `main`.
2. Per-locale artifact fan-out with bounded provider credentials.
3. Shared `create-generated-pr-tokens` and `publish-generated-pr` actions.
4. Deterministic automation branches with force-with-lease.
5. Separate generated paths and invalidation paths.
6. Stale-input and owned-path overlap detection that defers to a newer run.
7. Aggregate validation before publication.
8. Source-only advisory drift where a post-merge bot owns repair; strict checks
   for generated artifact changes.
9. No provider credentials in pull-request CI.

## RFC 0024 Integration

Completion PR A should add the missing product-catalog refresh lane for CLI,
TUI, and other routine operator catalogs. It should reuse the existing
generated-PR publisher and changed-scope model, not create another mutation
service.

The workflow should preserve owner boundaries:

- source PRs own reviewed English catalogs, descriptors, and deterministic
  source inventories;
- automation PRs own generated translations and provenance;
- checked coverage/readiness manifests derive from those artifacts;
- generated output never self-promotes a locale to `complete`.

Safety catalogs need a stricter publication policy. Approval, authentication,
authorization, destructive-action, privacy, and recovery translations may be
generated as candidates, but named owner/SecOps and language review remains a
promotion gate. Auto-merge should be disabled or separated for a generated PR
that changes safety-sensitive catalogs.

## Stack Correction

The foundation contributor guide said to commit source changes and generated
artifacts together. That conflicts with current Control UI/native ownership.
The guide now describes the owner-specific source/generated split, the shared
generated-PR publisher, and CLI/TUI catalogs as manually reviewed until their
generated refresh lane lands. The correction is published at #111543
`794b49a1104`, #111544 `11ac9bcaf7e`, and #111545 `28ef07b3792`.

## Cheapest Next Slice

After the foundation stack is rebased onto current main:

1. add one routine CLI/TUI English key fixture;
2. run one locale worker and produce a patch artifact;
3. aggregate and validate the candidate catalog;
4. publish through `publish-generated-pr` with auto-merge disabled initially;
5. prove stale-input deferral and strict generated-artifact CI;
6. leave the affected coverage row `partial` until named review is recorded.
