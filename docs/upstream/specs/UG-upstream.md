# UG — Upstream governance (primary spec)

**Extends**: CL-11

## Contribution roadmap

The `@bic/openclaw-*` packages are **incubated internally**, then
contributed to `@openclaw/*` once the contract is stable. The
roadmap:

| Package                    | Incubation status  | Target upstream        | Target milestone |
| -------------------------- | ------------------ | ---------------------- | ---------------- |
| `@bic/openclaw-workspace`  | Alpha (Horus wave) | `@openclaw/workspace`  | v0.2 stable      |
| `@bic/openclaw-guardrails` | Alpha (Horus wave) | `@openclaw/guardrails` | v0.2 stable      |
| `@bic/openclaw-policy`     | Alpha (Horus wave) | `@openclaw/policy`     | v0.2 stable      |
| `@bic/openclaw-snap`       | Alpha (Horus wave) | `@openclaw/snap`       | v0.2 stable      |
| `@bic/openclaw-lsp`        | Alpha (Horus wave) | `@openclaw/lsp`        | v0.2 stable      |

Each package graduates independently when: (a) its public surface has
been stable for one wave, (b) the reference adapter suite (4 host
adapters) covers its contract, (c) a Microsoft Research acknowledges
the contribution.

## Decide / track / enforce+review

Three-phase workflow for any contribution:

### Decide

Internal-only decision about what to contribute. Happens in the
`.craft/waves/` directory as a plan. No cross-repo PR yet.

### Track

Once the plan is approved, it's TRACKED against the upstream roadmap.
A draft PR opens in `gim-home/openclaw` (if the plan has external
scope) or stays internal (if the plan is bic-internal).

### Enforce + review

Each tracked PR is enforced by the R5 pre-merge guard (see below),
reviewed by the upstream core reviewers (always Johan + 1 area
architect), and merged when the policy + code + tests + docs are
green.

## R5 pre-merge guard

Any PR that touches `packages/openclaw-*/src/governance/` or
`packages/openclaw-*/src/decision/` runs an automated R5 pre-merge
guard before it can be merged:

1. **Policy diff**: the guard computes the diff between the old and
   new compiled policy-IR. Any new R5 tool, any new `failMode: 'open'`
   on an R4 tool, any new `args_from` chain that uplifts to R5 MUST
   be called out in the PR description with explicit operator
   sign-off.
2. **Scenario diff**: every new R5 rule MUST have an accompanying
   scenario. The guard grep's the PR for test coverage of new R5
   paths.
3. **Trust-set impact**: if the PR rotates keys or changes key
   policies, a signed approval from the trust-set owner is required.

Guard failures BLOCK the merge. Operator override is impossible — the
guard is a CI check with no opt-out.

## PR sequencing

Cross-package changes land in this order:

1. `workspace` changes first (everything imports workspace types)
2. `security` spec updates (no package imports security; it's a
   reference domain, but governance reviewers read it first)
3. `guardrails` changes (policy + snap import guardrails types)
4. `policy` or `snap` changes
5. `claws-sdk` (imports all of the above)
6. `claws`, `claws-test`, `claws-serve` (consumer CLIs + tests)

A PR that touches multiple packages MUST stage its commits in this
order. Out-of-order commits fail the sequencing lint.

## Scope-flip at publish

When a `@bic/*` package flips to `@openclaw/*`:

1. Package.json `name` field flips from `@bic/openclaw-X` to
   `@openclaw/X`
2. All internal imports across the monorepo update in one PR (the
   scope-flip PR)
3. Stability tier bumps from Alpha to Beta (`@openclaw/*` is
   customer-facing)
4. CHANGELOG.md gets a "Scope-flip to @openclaw" entry

The scope-flip PR is a special case of the R5 pre-merge guard — it
touches every package's imports but changes zero behaviour. The
guard verifies behaviour-diff is empty before allowing the flip.

See [../guides/contribution-workflow.md](../guides/contribution-workflow.md)
for the author-side walkthrough.
