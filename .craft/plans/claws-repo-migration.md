---
slug: claws-repo-migration
preset: "claws"
plan: "Lift claws from craftworks into bic/claws; scrub @craftworks→@bic and claws→claws; CLI boots green in the new repo"
area: claws
status: Active
phase: horus
atoms: [atom:claws-repo-boundary, atom:claws-publish]
replanned: 2026-04-20
---

# claws → claws Repo Migration

## What this is

Extract the claws-* tree from `bic/claws` into
`microsoft.ghe.com/bic/claws`. Scrub all `@craftworks/*` and `claws`
references to `@bic/*` and `claws` respectively. Restructure into
target: 11 packages + unified `docs/` (no `design/`).

## Headlines

1. **Lift runs cleanly.** `git filter-repo` pulls the 7 claws-*
   directories + 4 openclaw-* sub-packages + design-era docs + wave
   history (Ptah/Anubis/Thoth/Ra only) + plans + roles. All paths
   rename per manifest into the target layout. History is preserved
   where paths carry forward (`git log --follow` walks across renames).

2. **No `claws` or `@craftworks/` anywhere.** Scrub rules via
   `--replace-text` + `--replace-message` rewrite every occurrence —
   package imports, bare mentions in prose, comments, commit messages,
   filenames. Allowlist covers historical wave prose only.

3. **CLI boots green.** `npm ci && npm run build` in the migrated repo
   produces a working `claws --help` via the compiled CLI entrypoint.
   No `***REMOVED***` artifacts, no orphan `@craftworks/compiler-sdk`
   cross-deps, no missing dependencies.

## Execution

One checkpoint (CP-2), 5 pulses:

| Pulse | What it does |
|---|---|
| 01 lift-prep | Validate manifest + rules + .mailmap. Strip comment lines from .rules (filter-repo has no comment syntax — this is the root cause of the 2026-04-20 `***REMOVED***` regression). |
| 02 filter-repo-lift | Run the lift into a scratch dir. Verify target structure + zero `***REMOVED***` + zero bare `claws` in output. |
| 03 post-lift-cleanup | Wipe claws working tree (preserving `.git` + origin remote), import filtered branches + tags, author root `package.json` (npm workspaces, 11 entries), rename any remaining `claws-*` filenames, repair known broken intra-doc links. |
| 04 residue-grep-guard | Bash pre-commit hook + CI workflow at `.github/workflows/no-craftworks.yml` to prevent future `@craftworks/*` reintroduction. Allowlist YAML for historical prose. |
| 05 cli-boots | `npm ci`, `npm run build`, `claws --help` green. Fix any build blockers surfaced in this pulse — no punting. |

Full pulse specs live in
`.craft/waves/260416+horus-the-heir+claws-migration/pulses/0{1..5}+*.md`.
Checkpoint plan at
`.craft/waves/260416+horus-the-heir+claws-migration/checkpoints/cp-2.md`.

## Target structure in bic/claws

```
packages/
  claws/ claws-action/ claws-sdk/ claws-serve/ claws-skill-kit/
  claws-test/                                    (6 BIC-internal)
  openclaw-guardrails/ openclaw-lsp/ openclaw-policy/
  openclaw-snap/ openclaw-workspace/              (5 upstream-shape)
docs/
  specs/{CL-01..CL-14.md, ATOMS.md, contracts/}
  concepts/
  {architecture,tutorials,governance,how-to,ecosystem, ...}
scripts/                                          (pulse 04)
.github/workflows/no-craftworks.yml               (pulse 04)
.craft/{plans/claws-*.md, roles/claws/, waves/{ptah,anubis,thoth,ra}*}
.no-craftworks-allowlist.yaml                     (pulse 04)
.mailmap
package.json                                      (pulse 03)
```

Authoritative reference: `TARGET-STRUCTURE.md` in the wave dir.

## What's NOT in scope

- **No audit-trail ceremony.** Prior 9-pulse design produced
  HMAC-signed evidence JSON files, 3-pass regex TS validators, sweep
  tools with 481 tests, package-split validators, etc. All deleted
  2026-04-20 on user direction. Nobody asked for audit evidence on an
  internal migration.
- **No root toolchain provisioning beyond npm workspaces.** `tsup`,
  `vitest`, `typescript` come via per-package devDependencies.
- **CP-3 scope (deferred)**: `devtools/repo-ops/`.
- **CP-4 scope**: `.github/workflows/ci.yml`, CODEOWNERS,
  RELEASE.md/LTS.md, branch protection.
- **CP-5..7 scope**: `test/e2e/` sim harness + host presets.
- **CP-8 scope**: `docs/specs/CL-15*.md`, contracts registry, 97-atom
  contract surface, `scripts/scrub-doc.mjs`.

## Verification the plan is done

```bash
cd /c/src/claws
test $(ls packages/ | wc -l) -eq 11
test ! -d design
npm ci && npm run build
node packages/claws/dist/cli.js --help | grep -qi claws
bash scripts/residue-grep.sh --mode=ci  # 0 violations
```

When those 5 commands succeed, CP-2 is done.

## Replan history

**2026-04-20**: Collapsed from 9 pulses (with HMAC audit machinery) to
5 pulses (just the migration). Root cause of the collapse: the
`***REMOVED***` regression from a comment line in the scrub rules that
filter-repo parsed as a rule. That bug + the user realization that the
audit ceremony was weight not signal triggered a wholesale scope cut.
