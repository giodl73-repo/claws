<!--
Required PR title:
type: user-facing description
-->

RFC: https://github.com/openclaw/rfcs/pull/42

Related: #28303, #90608, #105266, #88570

## What Problem This Solves

Gateway clients currently receive canonical English error text with structured
error codes, but there is no bounded contract for a client to render an
owner-reviewed translation. Translating arbitrary server messages would be
unsafe because messages can contain operational data or unreviewed details.

## Why This Change Was Made

This is one narrow Gateway vertical slice from RFC 0024:

- define a bounded localization descriptor inside the existing opaque error
  `details` object;
- approve only the stable `(INVALID_REQUEST, APPROVAL_NOT_FOUND)` tuple and the
  `gateway.approval.notFound` key;
- make both Gateway approval paths emit that same descriptor while retaining
  their canonical English messages and remediation data;
- reject malformed, oversized, unknown, or discriminator-mismatched metadata;
- let the Control UI render the reviewed descriptor at the approval page edge;
- preserve canonical server English when the active locale lacks the key; and
- retain the existing generic safety message for unreviewed descriptors.

The shared descriptor is owned by `@openclaw/gateway-protocol`, so the browser
does not import Gateway server source. The source English key is included here.
Generated non-English bundles are deliberately excluded: the repository's
isolated `control-ui-locale-refresh` workflow owns those follow-up changes.

This PR is stacked on #111544 head
`1807d009c506b7aaac528b59bd314f0f4b4fe965`. Its intended review delta is 14
files, 543 additions, and 18 deletions. Until earlier slices land, GitHub shows
the cumulative localization stack.

The previous draft's 66-file readiness/convergence delta, generated readiness
snapshots, cross-owner coverage policy, and publication gates have been removed.
Those remain independent owner-governance work rather than a prerequisite for
this runtime slice.

## User Impact

Once a locale-refresh PR publishes `gateway.approval.notFound` for a selected
locale, the Control UI approval page renders it for the reviewed Gateway error.
Older clients and untranslated locales keep the server's canonical English.
Unknown metadata cannot select arbitrary catalog content or expose an
unreviewed server message in this approval-page state.

## Evidence

Exact head: `0dc79d98ab50f05525a55affd380e1993cb7592f`

- 110 focused tests pass across Gateway protocol, Gateway approval methods,
  Control UI translation, descriptor resolution, and the approval page.
- The existing 72 approval-method tests pass in addition to the new focused
  descriptor tests.
- `@openclaw/gateway-protocol` builds successfully, including declarations.
- `scripts/control-ui-i18n-verify.ts verify` passes.
- `oxfmt` and `git diff --check` pass for the 14-file delta.
- Repository typechecking reports only the two unrelated baseline errors in
  `diagnostics-otel` and the missing `libphonenumber-js/min` declaration; it
  reports no Gateway, protocol, Control UI, or localization error.
- The first `codex review --base 1807d009...` identified the generated
  `zh-CN.ts` edit; that finding was accepted and the edit removed.
- The final review reports the bounded metadata, discriminator checks, fallback
  behavior, and Gateway/UI integration as coherent with no actionable finding.
  Its sandbox could not rerun tests because the shared mirror lock path was
  read-only; the direct repository test runs above passed.

## Real behavior proof

Behavior or issue addressed:
The Gateway emits canonical English plus one reviewed descriptor. A simulated
owner-published Chinese catalog renders Chinese, while a locale without that key
receives canonical English from the same payload.

Real environment tested:
Ubuntu 24.04 under WSL, Node.js 24.15.0, exact OpenClaw source head
`0dc79d98ab50f05525a55affd380e1993cb7592f`. This was a source-level Gateway and
Control UI adapter proof; no live external channel was involved.

Exact steps or command run after this patch:

```text
node scripts/run-vitest.mjs packages/gateway-protocol/src/error-localization.test.ts src/gateway/server-methods/approval-error.test.ts src/gateway/server-methods/approval-shared.test.ts src/gateway/server-methods/approval.test.ts ui/src/lib/gateway-error-localization.test.ts ui/src/i18n/test/translate.test.ts ui/src/pages/approval/approval-page.test.ts
npm --prefix packages/gateway-protocol run build
node --import tsx scripts/control-ui-i18n-verify.ts verify
node --import tsx --input-type=module -e '<source proof harness>'
```

Evidence after fix:

```text
{"code":"INVALID_REQUEST","message":"approval not found","details":{"reason":"APPROVAL_NOT_FOUND","localization":{"messageKey":"gateway.approval.notFound"}}}
审批请求不存在或已过期。
approval not found
```

Observed result after fix:
The same validated payload selects Chinese only when that active catalog owns
the reviewed key. Switching to a locale without the key produces the untouched
canonical English message. All 110 focused tests pass.

What was not tested:
No generated non-English catalog is changed in this PR, and no locale-refresh
workflow, live Gateway socket, external channel, native app, or other Gateway
error family was exercised. Those remain separate owner-owned work.
