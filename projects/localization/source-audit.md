# OpenClaw Localization Source Audit

Updated: 2026-07-16
Audited revision: `990fe2f3a8fdbf5adb6d93d5d0a56e66500ac8e9`

## Frame

### Falsifiable thesis

OpenClaw already localizes several presentation surfaces, but the npm
package/runtime has no shared locale and message contract for errors, approvals,
and other messages produced outside those surfaces.

This thesis is disproved if current source has a general runtime translator,
locale propagation through Gateway requests, and structured message identifiers
used by CLI, channel, and Gateway error renderers.

### Affected users

- non-English operators using the CLI;
- users receiving Gateway errors through the Control UI;
- channel users receiving approval, validation, and failure messages;
- plugin authors that need localized setup or command metadata.

### V1 boundary

- Keep machine-readable error codes, command tokens, config keys, paths, IDs,
  provider IDs, and model IDs literal.
- Localize product-owned text only at a user-facing rendering boundary.
- Always retain an English fallback.
- Start with one safety-critical structured message rather than extracting every
  string in the repository.

### Non-goals

- Translating logs and developer-only diagnostics.
- Translating model-generated assistant text.
- Replacing existing Control UI, native-app, or docs localization pipelines.
- Bulk extraction of all string literals before locale ownership is defined.

## Audit Findings

### Localization exists today

| Surface | Current support | Evidence |
| --- | --- | --- |
| Control UI | English plus 20 lazy-loaded locale bundles, browser locale resolution, persisted user selection, English fallback, interpolation | `ui/src/i18n/lib/registry.ts`, `ui/src/i18n/lib/translate.ts`, `src/i18n/registry.test.ts` |
| CLI onboarding wizard | `en`, `zh-CN`, and `zh-TW`; resolves `OPENCLAW_LOCALE`, `LC_ALL`, `LC_MESSAGES`, then `LANG`; English fallback | `src/wizard/i18n/index.ts`, `src/wizard/i18n/locales/`, `docs/cli/onboard.md` |
| Bundled plugin setup | Shared setup translator is used by channel setup surfaces | `src/wizard/i18n/index.ts`, `extensions/*/src/setup*.ts` |
| Native apps | Shared generated locale inventory and Android/iOS localization workflows | `apps/.i18n/`, `scripts/native-app-i18n.ts`, `.github/workflows/native-app-locale-refresh.yml` |
| Documentation | Dedicated translation workflow, glossaries, navigation catalogs, and translation tooling | `docs/.i18n/`, `scripts/docs-i18n/` |

The CLI wizard catalog was introduced in May 2026
(`d8ae3ec4c85 feat(wizard): add cli i18n catalog`). The broader UI localization
pipeline predates it and continues to receive locale refreshes.

### Existing translations are model-assisted

Control UI and native locale refresh workflows invoke OpenAI or Anthropic
models and commit generated catalogs with provider/model provenance, glossary
guidance, placeholder checks, and fallback tracking. Documentation translation
uses a Codex-based translator, source hashes, translation memory, glossary
mappings, and weekly reconciliation for model failures.

These are build-time authoring workflows. OpenClaw does not currently make a
runtime model call to translate deterministic UI, CLI, Gateway, or channel
messages for the user.

### The 22-locale product union is broad but not comprehensive

- East Asia is well represented: `zh-CN`, `zh-TW`, `ja-JP`, and `ko`.
- South Asia has `hi`, but not Bengali, Urdu, Tamil, Telugu, Marathi, Gujarati,
  Punjabi, Malayalam, Kannada, Nepali, or Sinhala.
- Southeast Asia has `id`, `th`, and `vi`, but not Malay, Filipino/Tagalog,
  Burmese, Khmer, or Lao.
- Right-to-left catalogs exist for `ar` and `fa`, but the Control UI document
  remains declared as `lang="en"` and no locale-driven document `dir` update
  was found. Arabic and Persian translation presence is therefore not proof of
  full RTL layout support.
- Native translation automation also includes `sv`, which is not in the
  Control UI's 21-locale registry. The product-wide union is therefore 22
  locales, with maturity tracked separately by surface.

### Localization is not package-wide

The wizard translator is deliberately scoped to fixed setup copy. Its public
types support dotted keys and primitive interpolation, but only three locales.
No general translator was found across Gateway, CLI, commands, agents, or
channel reply code.

A coarse source scan found thousands of `Error` constructions outside tests,
spread across more than one thousand runtime files. This is not a count of
translatable messages: many are internal invariants, logs, or wrapped upstream
errors. It does demonstrate that bulk string extraction is the wrong first
step; messages need classification by audience and transport.

PR 3 now migrates bounded final-boundary CLI copy into a process-scoped
catalog:

- `openclaw agent` validation, progress, attachment, retry, fallback, and
  recovery copy;
- ACP provenance validation and the product-owned bridge failure wrapper;
- unknown capability inspection guidance;
- shared status/health timeout, tasks audit limit, and sessions compact
  inherited-option and numeric validation.

Locale resolution occurs once per command action through the shared process
resolver. English and Simplified Chinese catalogs are present; other recognized
locales retain reviewed English fallback. Exact punctuation remains compatible
where callers or snapshots distinguish it. The `EMBEDDED FALLBACK:` marker,
flags, commands, `<key>`, agent/session/capability IDs, paths, URLs, provider
errors, option ordering, and JSON response shapes remain literal. The generated
coverage manifest records CLI English as source, `zh-CN` as partial, and other
locales as unsupported rather than overstating package-wide CLI coverage.

### Gateway errors are structured, but only partly

`packages/gateway-protocol/src/schema/error-codes.ts` defines stable codes such
as `INVALID_REQUEST`, `APPROVAL_NOT_FOUND`, and `UNAVAILABLE`. `errorShape`
returns:

```ts
{
  code,
  message,
  details?,
  retryable?,
  retryAfterMs?
}
```

The `message` remains an English string created by the server. Control UI code
frequently displays `error.message` directly, including chat, config, task,
plugin, terminal, and workspace surfaces. This gives a useful compatibility
seam: preserve `code` and `message`, then project optional localization metadata
inside the existing opaque `details` envelope for clients that can localize.

Current strict `ResponseFrameSchema` validators reject additive top-level error
fields. Runtime TypeScript frame guards accept additive fields, Swift `Codable`
ignores unknown keys, and Android Gateway JSON uses `ignoreUnknownKeys = true`.
All of these paths accept `details.localization` without changing the closed
top-level error schema.

Gateway connect parameters already include optional `locale`, and the Control
UI sends `navigator.language`. This is sufficient for connection-owned UI
behavior but does not define the locale of a separate channel recipient or
approval reviewer.

The channel audit found no common reviewer-locale field in the approval
registry or generic channel approval runtime. Microsoft Teams is a narrower
exception: its proactive conversation reference preserves
`activity.locale`. Telegram exposes `language_code` on inbound updates, but the
approval runtime does not retain it as reviewer preference. These
platform-specific hints do not establish a cross-channel locale owner and must
not be generalized to the requester, account, or eventual reviewer. V1 should
therefore keep server-rendered channel approvals in reviewed English unless a
channel adapter already has an explicit recipient locale and its owner approves
that use.

### Channel safety messages are hardcoded

Exec approval rendering is a strong first slice:

- `src/infra/exec-approval-reply.ts` directly emits `Approval required.`,
  `Run:`, `Pending command:`, `Other options:`, host/node/CWD labels, and expiry
  text.
- `src/infra/approval-native-route-notice.ts` directly emits delivery and
  fallback instructions.
- These messages are propagated through Telegram, Signal, iMessage, Slack, and
  other approval surfaces.

The data is already structured before rendering: approval ID, command,
decisions, host, node, CWD, and expiry are separate values. That makes this
safer and smaller than attempting to localize arbitrary exception text.

Upstream issue
[#81253](https://github.com/openclaw/openclaw/issues/81253) already requests
i18n/template support for these prompts and frames comprehension as a safety
issue. Do not file a duplicate.

### Approval and Gateway ownership evidence

Peter Steinberger (`@steipete`) authored and merged the four changes that define
the current approval and Gateway seams:

- [#103579](https://github.com/openclaw/openclaw/pull/103579): durable Gateway
  operator approvals;
- [#103679](https://github.com/openclaw/openclaw/pull/103679): typed
  cross-surface channel approval actions;
- [#108776](https://github.com/openclaw/openclaw/pull/108776): Control UI
  approval attention and history;
- [#106441](https://github.com/openclaw/openclaw/pull/106441): closed shared
  Gateway TypeBox objects.

This makes `@steipete` the evidence-backed primary decision owner for the
`details.localization` convention, its first approval-not-found emitter, and
the English-only cross-channel v1 default. Generic approval source files are
not assigned to SecOps in `CODEOWNERS`, but approval security documentation is:
`/docs/cli/approvals.md` requires `@openclaw/openclaw-secops`. The first
production non-English safety catalog should therefore require SecOps
attestation in addition to approval-owner review.

### Other open gaps already have issue coverage

- [#79458](https://github.com/openclaw/openclaw/issues/79458): localized slash
  command descriptions.
- [#89971](https://github.com/openclaw/openclaw/issues/89971): localized skill
  names and descriptions.
- [#55239](https://github.com/openclaw/openclaw/issues/55239): localized
  Telegram command menus.
- [#88570](https://github.com/openclaw/openclaw/issues/88570): incomplete
  Simplified Chinese coverage.

## Initial Architecture Direction

### Reuse

- Stable Gateway error codes.
- Existing English-fallback behavior.
- Dotted message keys and parameter interpolation from wizard/UI i18n.
- Lazy locale loading for client-owned UI bundles.
- Existing generated translation and glossary checks.

### Adapt

- Add an audience-aware runtime message descriptor rather than passing a
  translator through all core logic.
- Resolve locale at the final renderer: CLI process locale, Control UI user
  preference, or channel recipient/account preference.
- Keep server English `message` for old clients and diagnostics while adding
  optional recognized `details.localization` metadata.

### Avoid

- Translating at exception-construction sites deep in business logic.
- Inferring locale from arbitrary message content or model language.
- Per-channel copies of the same safety text.
- Configurable free-form templates as the only mechanism; they make safety copy,
  placeholders, and upgrade behavior difficult to validate.

## Cheapest Next Evidence Slice

Use exec approval messages as a fork-only prototype:

1. Define typed message keys and parameters for the existing approval sections.
2. Render English and one non-English locale from the same structured approval
   input.
3. Preserve literal `/approve` commands, decisions, IDs, paths, and code blocks.
4. Prove missing locale/key fallback to current English output.
5. Keep the existing reply payload shape and channel routing unchanged.

Success means one approval request can render deterministically in both locales
without changing command semantics or breaking existing English snapshots.
