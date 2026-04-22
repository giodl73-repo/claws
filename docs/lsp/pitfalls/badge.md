---
covers: [atom:LSB/demotion]
---

# Pitfalls: governance badge

## P-01 · Surprise demotion after coverage drop

**Scenario**: Skill at Ring 3 GREEN. Author adds a new branch to a
tool without a new scenario covering it. Coverage drops from 96% to
93%. Badge demotes to Ring 2 BLUE.

**Consequence**: author is confused ("my skill was green yesterday!").

**Fix**: the editor notification includes the reason: "coverage
dropped below threshold". Author sees it immediately, writes a
scenario for the new branch, badge returns to GREEN.

## P-02 · Stale badge after policy change

**Scenario**: Fleet admin bumps the threshold from 90/85/90/90 to
95/90/95/95. Skills at 92% coverage were GREEN under old policy,
become BLUE under new.

**Consequence**: overnight, a fleet's skills "regress" even though
the code didn't change.

**Fix**: fleet policy changes emit a `workspace/didChangeConfiguration`
notification. The LSP re-evaluates badge state and surfaces the
change with reason "fleet threshold bumped". Mass-demotion is
expected and visible.

## P-03 · Off-by-one demotion

**Scenario**: Author intentionally drops a trivially-covered
scenario. Badge demotes to Ring 2.

**Consequence**: author didn't realise the skill was at Ring 3
largely because of that ONE scenario. Now they need to either
write a real one or accept Ring 2.

**Fix**: this is working as designed. The demotion is LOUD so
authors can't accidentally ship at a lower guarantee level.

## P-04 · Badge race with unsaved changes

**Scenario**: Author edits TOOLS.md, introduces a parse error, but
hasn't saved. Badge hasn't re-evaluated (LSP doesn't re-evaluate
on unsaved changes by default).

**Consequence**: badge shows GREEN while the code would compile to
RED on save.

**Fix**: there's a brief window of staleness. The "Run Doctor"
code action re-evaluates on demand; editors can also configure the
LSP to re-evaluate on every keystroke (slower but more responsive).

## P-05 · Badge hidden by editor

**Scenario**: User's editor has a minimal status bar that doesn't
show LSP custom badges.

**Consequence**: user misses the badge state entirely.

**Fix**: the LSP also surfaces badge state as a diagnostic at the
workspace level (not tied to a specific line). Editors that don't
render custom badges still show "Skill 'x' is at Ring 2 — consider
upgrading to Ring 3" as a workspace-scope diagnostic.

## P-06 · Fleet policy mid-session

**Scenario**: User opens workspace. Fleet policy is "min ring 2".
Halfway through the session, fleet admin tightens to "min ring 3".
User's current skill is Ring 2.

**Consequence**: the LSP receives the fleet reload notification,
re-evaluates, the skill's badge becomes RED with "fleet policy
requires Ring 3".

**Fix**: intentional. The user sees immediately that their skill is
no longer fleet-acceptable. If they need it to work right now, they
can pin to the prior fleet binding version (see
`sdk/specs/SKF-fleet-runtime.md § Rollout semantics`).
