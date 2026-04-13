# Why don't I see all 40 commands?

<!-- atom:progressive-disclosure (C34) -->

claws has 40 commands. You don't need to know that yet.
The CLI shows you what you need based on how you ask.

## Tier 1: Bare `claws` -- 4 commands

```
$ claws

  claws -- governance for every agent

  Quick start:
    claws init                   Set up governance for your workspace
    claws build                  Compile and emit your agent
    claws check                  Check against your org's policies
    claws build cursor           Cross-compile to another platform

  Run 'claws --help' for all commands.
```

Four commands. That's your first day.

## Tier 2: `claws --help` -- 18 commands

```
$ claws --help

  Build:
    init          Set up governance              build         Compile + emit
    compile       Compile to IR                  optimize      Boost passes
    test          Scenario validation            diff          Semantic diff
    import        Reverse-compile                inspect       Show IR
    watch         Auto-recompile                 amend         Modify workspace
    doctor        Diagnostics

  Govern:
    check         Policy enforcement             comply        Compliance evidence
    assess        Risk classification            audit         Audit trail

  Run 'claws --help-all' for fleet and advanced commands.
```

Eighteen commands. Build tools and governance. This is the daily driver.

## Tier 3: `claws --help-all` -- 40 commands

```
$ claws --help-all

  Build:        init build compile optimize test diff import inspect
                watch amend doctor session
  Govern:       check comply assess audit [verify|export|history]
  Snapshot:     snap [save|restore|diff|promote]
  Fleet:        scan broadcast drift report push kill
  Protect:      budget secrets [init|set] identity
  Maker:        new skill, publish, annotate, import
  Meta:         uninstall
```

Forty commands. Fleet management, snapshots, secrets, compliance signing.
You'll reach for these when you're managing governance across teams.

## Who sees what

| Tier | How | Commands | Who it's for |
|------|-----|----------|-------------|
| Bare `claws` | Just type `claws` | 4 | First-time user |
| `--help` | `claws --help` | 18 | Developer, daily use |
| `--help-all` | `claws --help-all` | 40 | Platform engineer, fleet operator |

## Workspace-aware bare invocation

Bare `claws` adapts to your workspace state:

```
$ claws                              # no claws.json found
  No governance config found. Get started:
    claws init                   Set up governance (creates claws.json)

$ claws                              # configured, never built
  Workspace: my-agent/ (OpenClaw detected, T2)
  Status: configured but never built
  Next steps:
    claws build                  Compile and emit your agent
    claws check                  Check against your org's policies

$ claws                              # built, 2 violations
  Workspace: my-agent/ (OpenClaw, T2)
  Last build: 2026-04-11 09:15 (847 tokens)
  Last check: 2 violations (1 high, 1 medium)
  Next steps:
    claws check --fix            Auto-fix 1 of 2 violations
```

It always tells you what to do next. No guessing.
