# First Awesome Claws compatibility canary

Run: https://github.com/giodl73-repo/awesome-claws/actions/runs/32283355652

## Exact result

- Status: failed
- Coverage: 52 compatible, 2 incompatible, 0 not run
- Awesome Claws: `39f85d66fa1fcc67444059f2a60b8cc3c1bb3a48`
- Standalone Claws CLI: `ae541e00a9106075efb0912e3d16457b88878c87`
- OpenClaw: `e474d23e653c91fb3364976f6ecd8fb61b4cf0f5`
- Artifact upload: passed
- Persistent-drift issue step: correctly skipped because this was a manual
  dispatch; escalation applies only after consecutive scheduled failures

## Incompatibilities

### Website Evidence Collector

- Phase: `application-scenario`
- Classification: `openclaw-lifecycle-defect`
- Failure: the installed Firecrawl plugin imports
  `canResolveEnvSecretRefInReadOnlyPath` from
  `openclaw/plugin-sdk/extension-shared`, but the tested OpenClaw revision does
  not export that symbol. OpenClaw refuses to start after plugin load failure.

### Public Safety Monitor

- Phase: `update-apply`
- Classification: `openclaw-lifecycle-defect`
- Application runtime scenario passed before the lifecycle failure.
- Failure: update preview correctly classified exact Claw-owned skills as
  unchanged, but update apply rebuilt an add plan and treated those same
  installed skills as materialization conflicts.
- The gateway ownership warning was non-causal: eight scheduled Claws emitted
  it and seven passed.

## Interpretation

The canary preserved complete evidence and identified two concrete moving-main
drifts without changing reviewed Claw maintenance metadata. The known Data
Analyst runtime concern did not reproduce: its lifecycle and application
scenario both passed at the tested revisions.
