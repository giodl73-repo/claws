# claws

This repo is the **proposal / governance / craft-artifacts workspace** for the broader claws + openclaw + lobster ecosystem.

It is not a code repo. Code lives elsewhere:

| Code | Where |
|------|-------|
| `lobster_web` (the web app) | [`bic/lobster`](https://microsoft.ghe.com/bic/lobster) |
| `openclaw-*` packages, runtime | [`bic/aether`](https://microsoft.ghe.com/bic/aether) (the upstream openclaw runtime) |
| Earlier in-claws prototypes (`packages/{claws-*, openclaw-*, v2-prototype, openclaw-lkg*}`) | Preserved in git history at `d0bcf7fb` (the hapi-the-bringer wave tip, immediately before this cleanup commit) |

## What's here

```
.craft/         ── plans, roles, waves, panels, out (PR drafts, architect reviews)
                   The primary workspace. Each wave under .craft/waves/ is a
                   strategic effort with PR drafts, scenarios, FINDINGS, and
                   an audit trail of decisions.

.claude/        ── Claude Code agent definitions, skills, settings.
                   Includes /claws-review, /claws-wave, /claws-plan, /claws-pulse
                   skills and the pr-architect-reviewer agent.

.claws/         ── Claws skill snapshots and on-disk state.

.audit/         ── Migration audit trails (e.g., .audit/migrations/horus/).

.ci/            ── CI-local artifacts written by repo-ops workflows.

.github/        ── ISSUE_TEMPLATE, policies, acl, compliance — repo-level
                   GitHub config. (Code-bound CI workflows removed in this
                   cleanup.)

docs/           ── Documentation. Some subtrees describe packages that have
                   moved out (cli/, sdk/, action/, policy/, snap/, lsp/,
                   guardrails/, skill-kit/, workspace/, test/) — these are
                   preserved as historical reference but are not the canonical
                   source for those projects anymore. Triage / move-upstream
                   in follow-up.

scripts/        ── ci/, hooks/, install-hooks.sh — repo-management scripts.
```

## Workflow

`bic/claws main` is **unprotected**. Push directly. PRs are optional and used only when a doc trail is wanted.

## Recent waves

- `260424+isis-the-weaver+lobster-foundation` — wave that produced the lobster web onboarding + write-proxy work (lobster PR [#256](https://microsoft.ghe.com/bic/lobster/pull/256))
- `260427+hapi-the-bringer+openclaw-upstream` — v2 carve work + LKG generalization, landed via PR [#3](https://microsoft.ghe.com/bic/claws/pull/3)
