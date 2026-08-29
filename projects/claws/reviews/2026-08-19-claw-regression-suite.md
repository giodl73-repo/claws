# Claw regression suite

## Outcome

Awesome Claws PR [#28](https://github.com/giodl73-repo/awesome-claws/pull/28)
merged as `11cb8019798a27e5fa095983e34078c3116c4b1b`.

Every current and future Claw now owns one deterministic package-contract
regression entry. A shared evaluator executes:

- the exact accepted catalog request with complete declared evidence;
- one structured missing-evidence block;
- one unapproved-authority refusal, including undeclared requested actions;
- the complete Experience output, fallback, asset, and widget surface;
- a canonical digest of packages, MCP servers, cron, bootstrap, and OpenClaw
  profile authority.

The runner also binds materialized instructions to the exact request, evidence,
and boundaries. X3 session fixtures must use the authoritative catalog request.
`create:claw` creates the contract automatically, and
`npm run test:regression -- --update` regenerates reviewed snapshots.

## Boundaries

This is deterministic package-contract proof. It does not execute or grade an
LLM and does not replace installed lifecycle, Experience, visual, capability,
or live-provider proof.

## Review

Independent runtime/catalog, contributor/operator, and policy/simplicity
reviews found and drove fixes for:

- initially synthetic blocked/refused outcomes;
- count-only evidence and boundary snapshots;
- omitted visual assets, widgets, and authority-bearing configuration;
- fail-open undeclared authority;
- unsafe output-path validation;
- fixed 54-Claw assertions that broke the next contribution;
- opaque drift, stale-build, and duplicate-vector diagnostics;
- accepted session fixtures drifting from catalog requests.

The final code rereview reported no significant issue. Codex autoreview was
unavailable because its usage limit was exhausted; Claude, Pi, and OpenCode
fallbacks were also unavailable, so the clean final specialist review is the
closeout result.

## Proof

- `npm run build`
- `npm run check`: 136 tests, 54 packages, 54 contribution-policy entries, and
  54 regression contracts
- exact-head Validate: Ubuntu, macOS, Windows, and visual proof passed
- exact-head Control UI Proof:
  [run 32264534962](https://github.com/giodl73-repo/awesome-claws/actions/runs/32264534962)
- merged-main Validate:
  [run 32267942137](https://github.com/giodl73-repo/awesome-claws/actions/runs/32267942137)

The original required lane exposed an independent OpenClaw `main` drift:
Data Analyst no longer created `outputs/analysis-state.json` at two moving
OpenClaw revisions, despite the PR not touching that Claw or proof path. The PR
gate now pins the last known-good OpenClaw revision
`14d43ad93cfefed3a76e15d2b8172ff446ec2ab2`; scheduled and explicit dispatch
proof retain `main` or caller-selected revision coverage.
