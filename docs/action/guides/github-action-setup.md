---
covers: [atom:AC, atom:ACS]
---

# Setting up the claws-action

Wire claws into your PR CI in under 10 minutes.

## Minimal workflow

`.github/workflows/claws.yml`:

```yaml
name: claws
on: [pull_request]

jobs:
  claws:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: gim-home/claws-action@v0.1
        with:
          workspace: .
          severity-gate: warn
```

That's it. Every PR now runs `claws doctor + policy validate` against
the PR's workspace state. Findings emit as SARIF → GitHub's security
tab.

## Tightening the gate over time

Teams typically ramp severity as they clean up existing findings:

1. **Week 1** — `severity-gate: off`. See the baseline. Don't block
   merges.
2. **Week 2-4** — triage BLOCKs down to zero. Set
   `severity-gate: block`.
3. **Ongoing** — once WARNs are below ~20, set
   `severity-gate: warn`. Now every new finding blocks merge.

## Fleet integration

If your workspace uses a fleet binding:

```yaml
- uses: gim-home/claws-action@v0.1
  with:
    workspace: .
    fleet: acme
    severity-gate: warn
```

The fleet file `~/.claws/fleets/acme.json` must be accessible from
the runner. The standard pattern: provision the fleet file into CI
via a repo secret or a signed artifact fetched from the fleet
registry.

## Reading findings

The action emits SARIF to GitHub's security tab. Each finding's
`rule`, `severity`, `file`, and `message` appears as a code-level
annotation on the PR.

Comments on the PR diff line surface the finding inline. Click the
annotation to see the full message + fix hint.

## Cross-references

- [../specs/AC-action.md](../specs/AC-action.md) — full input/output surface
- [../specs/ACS-sarif-pipeline.md](../specs/ACS-sarif-pipeline.md) —
  SARIF shape + severity mapping
- [../pitfalls/severity.md](../pitfalls/severity.md) — gate surprises
