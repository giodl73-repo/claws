# OpenClaw Dependency Governance Project

Use this area to inventory every dependency that can enter an OpenClaw build or
shipped artifact, rate its technical and supply-chain risk, and determine what
evidence is required for Microsoft internal use.

The project keeps two decisions separate:

- Is this dependency healthy and appropriate for how OpenClaw uses it?
- Is this dependency approved, conditionally acceptable, or still unreviewed
  for the intended Microsoft use?

WorkIQ can locate internal precedent, owners, and policy material. Internal use
alone is not approval; an authoritative governance record must support an
`approved` disposition.

## Active Notes

| Area | File |
| --- | --- |
| Falsifiable thesis, scope, and evidence plan | `frame.md` |
| Dependency rating and Microsoft disposition model | `rating-model.md` |
| First exact inventory and triage report | `baseline-2026-08-13.md` |
| Stakeholder review and revised operating process | `role-review-2026-08-13.md` |
| Microsoft CFS and Work IQ evidence | `microsoft-evidence-2026-08-13.md` |
| Latest exact CFS recheck and quarantine evidence | `cfs-recheck-2026-08-14.md` |
| Microsoft expectations and check-off ledger | `microsoft-controls.json`; workbook `Microsoft Controls` sheet |
| Current upstream remediation sequence | `remediation-plan-2026-08-13.md` |
| Long-term upstream governance direction | `dependency-governance-rfc-outline.md` |
| Lobster product-exact attestation issue #8220 | `lobster-dependency-attestation-issue.md` |
| Living Microsoft-facing tracker #8223 | `lobster-dependency-governance-tracker.md` |
| Versioned detailed analysis publication | `https://microsoft.ghe.com/bic/lobster/tree/openclaw-dependency-governance-analysis/docs/openclaw-dependency-governance` |
| Focused OpenClaw issue and PR bodies | `issues/`; `prs/` |
| Moderate queue cohorts and review order | `moderate-review-plan-2026-08-13.md` |
| Review workbook and machine-readable inventory | `artifacts/` |
| Current session and resume state | `SESSION.md` |

## Active Work

| Repo | Branch / Baseline | Status | Purpose |
| --- | --- | --- | --- |
| `openclaw/openclaw` | `459891c035201a70863f66098dd6e2c03b2559e6` | Exact review complete | 2,624 reviewed records; 33 High, 1,707 Moderate, 878 Low, six explicit Unknown gaps, and zero automated rows |
| `openclaw/openclaw` | `enterpriseclaw/dependency-governance-remediation` at `39b18ffbe4f` | Analysis artifact; PR #123513 closed | Demonstrates possible ClawHub/Undici, `js-yaml`, AWS core, `werift`, `rx.mini`, and Ubuntu-base remediations; not an active implementation deliverable |
| `openclaw/openclaw` | `giodl/deps-linux-cargo` | PR #123694 open | Adds automated update coverage for the shipped Linux Cargo graph |
| `openclaw/openclaw` | `giodl/deps-pin-ci` | PR #123695 open | Runs the existing dependency pin guard in required CI |
| Microsoft internal evidence | Work IQ, CFS, CG, and governed pipeline evidence | Analysis complete | 2 of 13 controls satisfied; ten gaps and the blocked final release attestation are documented for future owners |

The dependency analysis is complete. Lobster PR #8174 and OpenClaw PR #123513
were closed because implementation and pipeline registration exceeded the
analysis-only scope. Official run `176596891` is retained only as evidence that
CG can parse the staged lock; it is not product control evidence because the
lock described OpenClaw `2026.8.1` while Lobster installed `2026.5.28`.

## Intended Outputs

1. A reproducible inventory tied to an exact OpenClaw commit and lockfiles.
2. One evidence record per package, version, ecosystem, and usage context.
3. Separate technical-risk and Microsoft-governance dispositions.
4. A prioritized retain, update, isolate, replace, or remove queue.
5. A repeatable delta scan for dependency changes after the baseline.

## Related Areas

- `projects/agent-security/README.md`
- `projects/policy/README.md`
- `projects/promoteclaw/README.md`
