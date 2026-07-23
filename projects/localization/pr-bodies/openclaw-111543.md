<!--
Optional linked context:
Add a visible `Closes #<issue-number>` or `Related: #<issue-number>` line
below this comment.

Required PR title:
type: user-facing description
Use a parenthesized scope only when it adds clarity:
fix(auth): login redirect loops when session cookie is expired

Types: feat, fix, improve, refactor, docs, chore.
-->

RFC: https://github.com/openclaw/rfcs/pull/42

Related: #28303, #90608, #105266, #88570

<details>
<summary>Additional instructions</summary>

**MUST:** Keep **Allow edits from maintainers** enabled for this PR so maintainers
can help update the branch when needed.

</details>

## What Problem This Solves

OpenClaw has separate localization workflows for the Control UI, updater CLI,
onboarding wizard, native apps, and documentation. Contributors need one guide
that directs a message change to its owning catalog, protects structured and
operational values, and names the correct validation without claiming that all
surfaces share one publication pipeline.

## Why This Change Was Made

This is a documentation and ownership slice from RFC 0024:

- add a task-oriented localization contributor guide;
- link it from `CONTRIBUTING.md` and the public reference navigation;
- document the current owner-specific source and validation paths;
- define message ownership, edge rendering, protected parameters, structured
  output invariance, and safety-copy review expectations;
- document complete locale registration, including the locale tuple, registry
  entry, canonical revision hash, count assertion, and focused test; and
- add the required `zh-CN` documentation glossary label.

This PR is stacked on #111542 head
`799fe933ca4b86944c51c5b8cbf8b1216e02b07a`. Its intended review delta is five
files and 201 additions. Until earlier slices land, GitHub displays the
cumulative kernel, updater, and documentation stack.

The earlier cumulative draft also introduced a mandatory coverage manifest,
coverage package APIs, generation declarations, repository checks, and native
script behavior changes. Those have been removed. Coverage governance remains
an independent owner-approved track rather than a prerequisite for this guide.

## User Impact

Contributors can identify the owning localization workflow before editing a
message and can run source-safe checks for the affected surface. The guide
explicitly prevents translating protocol data, commands, paths, versions,
upstream errors, structured payloads, and user-authored content.

No runtime message, locale selection, generated product catalog, protocol,
repository check, or application behavior changes in this PR.

## Evidence

Exact head: `0206f97b251450272256d0902ab8e4a9fd22a31d`

- `node scripts/generate-docs-map.mjs --check` passes.
- `node scripts/check-docs-i18n-glossary.mjs --base 799fe933ca4b...`
  passes for the exact intended delta.
- `docs/docs.json` and `docs/.i18n/glossary.zh-CN.json` parse as JSON.
- Every root-relative link introduced by the guide resolves to a checked-in
  documentation page.
- `git diff --check 799fe933ca4b...HEAD` passes.
- Final `codex review --base 799fe933ca4b...` reports no actionable
  regressions after correcting the repository test runner, native source-safe
  validation, locale union/count update, and registry revision instructions.

The full anchor audit was attempted, but its Mint dependency fetch timed out at
`registry.npmjs.org` before the audit could run. No passing anchor-audit result
is claimed.

## Real behavior proof

Behavior or issue addressed:
This is a documentation-only change. The inspectable outcome is that the new
page is addressable through public docs navigation, represented in the
generated docs map, and accepted by the source-pinned glossary check.

Real environment tested:
Ubuntu 24.04 under WSL, Node.js 24.15.0, exact OpenClaw source head
`0206f97b251450272256d0902ab8e4a9fd22a31d`. No application, Gateway, channel,
native build, or external service was involved.

Exact steps or command run after this patch:

```text
node scripts/generate-docs-map.mjs --check
node scripts/check-docs-i18n-glossary.mjs --base 799fe933ca4b86944c51c5b8cbf8b1216e02b07a
```

Evidence after fix:

```text
docs:map: docs/docs_map.md is up to date.
```

The glossary command exited successfully with no missing changed labels.

Observed result after fix:
`/reference/localization` is present in `docs/docs.json`, its complete heading
outline is present in generated `docs/docs_map.md`, and the title has an exact
`zh-CN` glossary entry.

What was not tested:
No runtime localization, translation generation, native artifact publication,
Gateway behavior, Control UI rendering, channel presentation, or coverage gate
is part of this slice. The network-blocked full anchor audit is described
above.
