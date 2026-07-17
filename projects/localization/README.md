# Localization Project

Use this area for OpenClaw localization architecture, source audits, issue
mapping, and bounded implementation slices across CLI, Gateway, channel, UI,
native-app, and documentation surfaces.

## Current Thesis

OpenClaw has mature localization for the Control UI, native apps, and docs, plus
a smaller onboarding-wizard catalog. It does not yet have a package-wide
contract for locale propagation or structured localization of runtime errors
and channel messages.

The first useful slice should preserve stable machine-readable codes and
commands while localizing the final user-facing rendering. Exec approval
messages are the leading candidate because they are safety-critical and already
have structured inputs.

## Active Notes

| Area | File |
| --- | --- |
| Current source audit and initial frame | `source-audit.md` |
| RFC 0024 pitch and owner asks | `rfc-0024-pitch.md` |
| Lobster target-scale comparator | `lobster-localization-comparator.md` |
| Live handoff | `SESSION.md` |

## Active Work

| Repo | PR / Issue | Branch | Status | Purpose |
| --- | --- | --- | --- | --- |
| `openclaw/openclaw` | [#81253](https://github.com/openclaw/openclaw/issues/81253) | detached audit worktree | Existing issue | Localized/template-aware exec approval prompts |
| `openclaw/openclaw` | [#79458](https://github.com/openclaw/openclaw/issues/79458) | none | Existing issue | Localized slash-command descriptions |
| `openclaw/rfcs` | [RFC PR #42](https://github.com/openclaw/rfcs/pull/42) | `user/giodl/rfc-0024-localization-runtime` | Draft | Localization runtime, metadata, and coverage contract |
| `openclaw/openclaw` | none | `user/giodl/localization-cli-runtime` | Local prototype | PR 3 CLI runtime localization, stacked from PR 2 |

## Related Areas

- `projects/openclaw/README.md`
- `projects/catalog/README.md`
- `projects/ux-state/README.md`
