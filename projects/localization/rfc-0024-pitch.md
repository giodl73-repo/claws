# RFC 0024 Pitch: Localization Runtime And Product Coverage

## Ask

Open RFC 0024 to define how OpenClaw becomes fully localizable across runtime,
CLI, Gateway errors, channels, command/skill metadata, UI, native apps, docs,
and generated-content features without replacing the localization systems that
already work.

## Why An RFC

The remaining gaps cross public contracts:

- Gateway protocol error payloads;
- recipient and operator locale ownership;
- CLI output compatibility;
- channel safety messages;
- command catalog metadata;
- skill/plugin manifest metadata; and
- release completeness claims.

These should not be solved by unrelated string-extraction PRs or per-channel
templates.

## Core Decision

Adopt shared semantics, not one shared file format:

```text
locale context
+ stable message key
+ typed literal parameters
+ surface-owned catalog
-> localized edge rendering
-> English fallback
-> coverage report
```

Control UI, Apple, Android, docs, and onboarding keep their current pipelines.
Core adds locale identity, runtime message descriptors, compatibility-safe
Gateway metadata, metadata localization, and product-level coverage.

## Leading Slice

Exec approval messages are first:

- safety-critical;
- already represented as structured values;
- shared across several channels;
- tracked by openclaw/openclaw#81253; and
- testable without changing command or authorization semantics.

## RFC Artifacts

Worktree: `C:\src\openclaw-rfcs-localization`
Draft PR: https://github.com/openclaw/rfcs/pull/42

- `rfcs/0024-localization-runtime-and-coverage.md`
- `rfcs/0024/localization-runtime-v1-spec.md`
- `rfcs/0024/localization-coverage-v1-spec.md`
- `rfcs/0024/localized-metadata-v1-spec.md`
- `rfcs/0024/issue-catalog.md`
- `rfcs/0024/implementation-plan.md`

## Owner Decisions Requested

- Approval/Gateway owner (`@steipete`, based on merged PRs #103579, #103679,
  #108776, and #106441): approve the optional `details.localization`
  convention and approval-not-found as its first production emitter?
- Channel/product owner (`@steipete`): confirm reviewed English for
  server-rendered channel approvals in v1 unless an adapter already owns an
  explicit recipient locale? `ConnectParams.locale` belongs only to the
  connected client. Microsoft Teams stores a conversation locale, but the
  generic approval runtime has no common reviewer-locale field.
- Security-copy reviewer (`@openclaw/openclaw-secops`, whose CODEOWNERS scope
  includes `docs/cli/approvals.md`): define the attestation required before the
  first production non-English approval catalog ships.
- Command catalog owner: localized description shape and projections.
- Plugin/package owner: localized skill metadata fields.
- Release owner: locale completeness states and blocking gates.
