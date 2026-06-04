# Context Budget Management Wave

This is the shortened execution plan for bringing context-budget management into
OpenClaw.

The original plan remains in:

- `../260427+hapi-the-bringer+openclaw-upstream/package-proposals/context-budget-wave-plan.md`
- `../260427+hapi-the-bringer+openclaw-upstream/package-proposals/context-budget.md`
- `../260427+hapi-the-bringer+openclaw-upstream/package-proposals/implementation-plan.md`

This wave compresses the original seven-PR story into four PRs:

1. **Static Audit Foundation**: measure static workspace and skill context.
2. **Runtime Evidence**: correlate existing runtime/context signals.
3. **Recommendations**: produce dry-run optimization guidance.
4. **Management Integrations**: add patch previews, policy evidence, and feeds
   owner/range evidence.

Story: measure -> correlate runtime -> recommend -> manage safely.

Current Stage 1 implementation:

- Branch: `user/giodl/context-budget-audit`
- Base: `origin/main`
- Commit: `d979c26b471 feat(context-budget): add static audit report`
- Size: 21 files, +1283 / -0
- Review: `codex review -c model="gpt-5.5" --commit d979c26b471 --title "Stage 1 context-budget direct-main final"`

The current commit is PR 1 of this shortened series.
