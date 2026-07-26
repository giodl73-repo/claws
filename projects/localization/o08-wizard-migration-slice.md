# O08: wizard post-install migration copy

## Frame

- Thesis: the wizard owner can localize one bounded post-install migration
  family through the shared catalog/runtime without changing migration behavior.
- Meaning owner: wizard onboarding and migration maintainers.
- Rendering owner: `src/wizard/i18n/`.
- Delete: four hardcoded English presentation wrappers in
  `src/wizard/setup.post-install-migration.ts`.
- Keep literal: provider labels, source paths, CLI commands, and raw error text.
- Non-goals: migration detection, ownership, prompting defaults, config patches,
  provider execution, developer diagnostics, or a new gate/workflow.
- Disproof: locale selection changes whether migration runs, its inputs or
  config result, or any protected literal.

## Audit

The bounded family owns the detected hint, confirmation prompt, cancelled-prompt
recovery line, and failed-migration recovery line. Detection failures remain a
developer-only debug diagnostic. The wizard English source is already registered
as `wizard-core`, and generated targets are already owned by Localization Catalog
Refresh, so this slice adds keys rather than another registry row.

The audit also found that generated locale adapters previously required every
wired namespace at module load. That conflicts with the documented fork flow:
the reviewed English source must be able to land before its generated follow-up
PR. O08 therefore requires the family in English but permits the generated
adapters to expose an empty family until refresh, exercising whole-message
English fallback instead of crashing.

## Compare

`src/wizard/setup.completion.ts` is the internal analogue: complete sentences
live in the wizard catalog while commands, shell names, and paths are ICU
arguments. FormatJS ICU named arguments provide the same boundary for this
family.

## Evaluate

- New hire: the hint and recovery copy remains actionable and commands remain
  copyable.
- Power user: interactive, declined, non-interactive, and failure behavior is
  unchanged.
- Platform engineer: locale affects prose only; no structured contract changes.
- Security reviewer: provider/source/error values are rendered verbatim and no
  authorization or mutation policy moves.

## Evidence slice

Prove exact English output, one generated non-English locale, unsupported-locale
fallback, protected literals, and invariant accept/decline/failure behavior.
Author English and code first; let the shared trusted workflow add the generated
translation batch to the same PR before strict parity turns green.
