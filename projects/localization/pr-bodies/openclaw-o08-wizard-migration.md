Related: #113105

RFC: https://github.com/openclaw/rfcs/blob/main/rfcs/0024-localization-runtime-and-coverage.md

Stack dependency: #112801. Until that prerequisite lands, review this slice from base commit `21ac6762497217eca75670207bfa324aa8f0b126`.

## What Problem This Solves

The wizard's optional post-install migration offer still renders its prompt,
hint, and recovery guidance from hardcoded English. It therefore cannot use the
shared RFC 0024 catalog gate and trusted translation flow, even though the
wizard owner is already registered.

This slice also closes an integration gap exposed by the real fork workflow: a
new generated-locale namespace previously threw during module load while its
reviewed English source was waiting for the generated follow-up PR.

## Why This Change Was Made

This adopts one bounded `wizard.postInstallMigration` family at the wizard
rendering edge. Complete sentences move to reviewed English while provider
labels, source paths, raw errors, and exact CLI commands remain ICU parameters.
English families stay required; generated adapters can temporarily expose an
empty family so the source PR safely uses whole-message English fallback until
the shared trusted workflow supplies translations.

No registry row, wizard-specific gate, translation service, config change, or
migration behavior is added. Generated catalog files are deliberately not
hand-edited. Because this is a fork PR, the trusted post-merge workflow will
open one generated translation follow-up PR; same-repository owner branches can
receive that batch in place.

## User Impact

English output and migration behavior remain unchanged. After the generated
follow-up lands, supported wizard locales can render the four adopted messages.
Until then, or for unsupported locales, users receive the reviewed English
fallback instead of a startup failure. Commands, paths, provider names, errors,
prompt defaults, migration execution, and returned config remain identical.

## Evidence

- `node scripts/run-vitest.mjs src/wizard/i18n/catalog-family.test.ts src/wizard/setup.post-install-migration.test.ts` — 14 tests passed across two shards.
- `node --import tsx scripts/localization-catalogs.ts detect` — exited 0 and reported exactly `zh-CN/wizard-core` and `zh-TW/wizard-core` stale, demonstrating the credential-free source-PR signal.
- `git diff --check` — passed.
- `codex review --base 21ac6762497217eca75670207bfa324aa8f0b126` — no actionable findings.
- Hosted changed-file proof could not start because the local Blacksmith identity cannot access the `openclaw` organization. Local fallback stopped on the pre-existing environment-name ratchet (`533` current versus budget `530`); O08 adds no production environment-variable name.

## Real behavior proof

Behavior or issue addressed:
The wizard renders post-install migration prompts and recovery guidance through
its catalog while preserving migration behavior and operational literals.

Real environment tested:
Linux (Ubuntu 24.04), Node 24.15.0, exact O08 head, source harness with mocked
migration-provider discovery and execution.

Exact steps or command run after this patch:

1. `node scripts/run-vitest.mjs src/wizard/i18n/catalog-family.test.ts src/wizard/setup.post-install-migration.test.ts`
2. `node --import tsx scripts/localization-catalogs.ts detect`

Evidence after fix:
Vitest reported 2/2 catalog-family tests and 12/12 migration-offer tests passing.
Detection reported the two expected stale wizard targets and exited successfully.

Observed result after fix:
English prompts and logs are byte-for-byte preserved; unsupported locales use
English fallback; accept, decline, non-interactive, prompt-cancellation, config
patch, and migration-failure paths retain their existing outcomes; protected
provider/path/error/command values remain exact.

What was not tested:
Generated non-English output is intentionally pending the trusted fork follow-up
workflow. No live provider migration was run because this slice does not alter
provider execution.
