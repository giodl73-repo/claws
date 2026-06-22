# Claws Review Bot ClawPilot Issue-Classifier Rules

Last updated: 2026-06-22

These rules are for a separate ClawPilot issue-classifier lane. They do not
replace or redefine the package's primary Lobster PR reviewer function.

## Existing Bot Function

The existing project/package is:

- Package: `@bic/claws-review-bot`
- Local path: `packages/claws-review-bot`
- Azure job: `claws-review-bot-job`
- Primary function: Lobster PR review and reviewer-style verdict comments.

Keep the ClawPilot issue classifier separate from the main Lobster reviewer
lane in naming, prompts, scheduling, and rollout decisions.

## Existing Automation Observed

In a first pass over issues updated on 2026-06-22 in `gim-home/m`, existing
automation already handled:

- duplicate hints through `m-agent:triage`;
- validity uncertainty through `m-agent:validity-sweep`;
- vulnerability workflow notifications on the standing security issue.

Do not copy these lanes. They already exist and broad repetition will add noise.

## ClawPilot Issue-Classifier Lane

The ClawPilot issue classifier should provide structured maintainer-grade
assessment where a human would otherwise need to read the issue, related
issues, and current labels before deciding what to do next.

Primary lane:

- regression classification;
- severity/impact normalization;
- issue clustering and umbrella suggestions;
- owner-area routing;
- next-action recommendation;
- label recommendations or direct label updates when the lane is trusted.

Secondary lane:

- high-intensity issue review for open `p0`, `p1`, `security`, and
  `gateway`+`p1/p2` issues.

Out of scope for now:

- all open `needs-triage` issues;
- broad duplicate sweeps;
- stale/validity sweeps;
- enhancement/design-only issues;
- vulnerability workflow issue #2629 unless explicitly requested.

## First Batch Scope

Start with the 10 open likely regression candidates from the 2026-06-22 pass:

- #3749: Windows freezes after updating to latest version.
- #3747: locally-created sessions no longer sync across devices in `v0.23.176`.
- #3739: chat history not visible after reboot until a message is sent.
- #3616: taskbar pin lost after every auto-update on Windows.
- #3601: Teams relay reports desktop offline despite Scout running.
- #3518: chat history hidden after restart when MSAL broker restore fails.
- #3505: stale default model causes "Model is not available".
- #3068: `assistant_usage` telemetry removed in `v0.22.351`.
- #2974: session history not visible after updating to `v1.0.40`.
- #2939: automation run fails after queued same-session `sendAndCollect`.

## Comment Template

Use one concise comment per issue:

```markdown
<!-- claws-review:issue-assessment -->
**Claws Review Bot issue assessment**

- Classification:
- Severity signal:
- Regression signal:
- Affected version/platform:
- Related issues:
- Suggested labels:
- Next action:
```

Keep claims grounded in issue text and linked issue evidence. Use "suspected"
when not proven.

## Label Guidance

Prefer recommendation-only comments until the lane has a few successful passes.
When direct labeling is allowed:

- Add `needs-investigation` for plausible technical regressions without a
  confirmed owner.
- Add `needs-repro` or `needs-more-info` only when the missing information is
  specific and actionable.
- Do not remove `needs-triage` unless an owner, severity, and next action are
  clear.
- Do not add severity labels above the evidence. Recommend P1/P2 in the comment
  if uncertain.

## Quality Bar

A useful ClawPilot issue-classifier comment must answer at least three of:

- Is this a regression, suspected regression, or not a regression?
- What version/platform evidence exists?
- What is the user impact?
- Which related issues should be linked?
- Which owner area likely owns the next step?
- What exact action should happen next?

If the answer is only "could not validate", do not comment. That is the
existing `m-agent:validity-sweep` lane.
