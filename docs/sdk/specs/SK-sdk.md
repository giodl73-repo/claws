# SK — @bic/claws-sdk (primary spec)

**Status**: Alpha · **Upstream target**: none · **Supersedes**: CL-08

## Package overview

The `claws-sdk` package is the enterprise SDK — all durable library
code behind the `claws` CLI binary. Everything that isn't a thin UI
adapter lives here.

Scope:

- **Fleet runtime** — multi-workspace policy inheritance + rollout
- **Compliance pack** — SOC2, HIPAA, EU AI Act evidence emitters
- **SIEM integration** — audit-chain → Splunk/Sentinel/Datadog
- **Press pipeline** — policy-IR → CI annotations, SARIF, JUnit
- **Relax engine** — time-bound policy relaxations
- **Context assembler** — AGENTS.md + TOOLS.md → runtime context
- **Snapshot runtime** — snap client library (not the daemon — that's `@bic/openclaw-snap`)
- **Compiler internals** — GovernanceIR, 29 G-rules, incremental cache

The compiler is INTERNAL to the SDK — no standalone `@bic/claws-compiler`
package exists. Sub-atoms like `atom:SKC` nest under SK.

## Exported subpaths

| Subpath | Exports | See |
|---------|---------|-----|
| `/api` | Stable public API facade | [SKA](./SKA-public-api.md) |
| `/compile` | `compileGovernanceIR`, 29 G-rule registry | [SKC](./SKC-compiler-internals.md) |
| `/fleet` | `FleetClient`, inheritance resolution | [SKF](./SKF-fleet-runtime.md) |
| `/relax` | `RelaxEngine`, time-bound waivers | [SKR](./SKR-relax-engine.md) |
| `/compliance` | `emitSOC2`, `emitHIPAA`, `emitEUAIAct` | internal |
| `/siem` | `SplunkSink`, `SentinelSink`, `DatadogSink` | internal |
| `/press` | `emitSarif`, `emitJunit`, `emitCIComments` | internal |

## Sub-spec index

| Code | File | Authority over |
|------|------|----------------|
| **SKA** | [SKA-public-api.md](./SKA-public-api.md) | Stable public-API surface, facade pattern, minor/major rules |
| **SKG** | [SKG-graduation.md](./SKG-graduation.md) | Promotion criteria for incubating → graduated features |
| **SKI** | [SKI-subpath-imports.md](./SKI-subpath-imports.md) | Allowed import forms; no-barrel rule |
| **SKC** | [SKC-compiler-internals.md](./SKC-compiler-internals.md) | GovernanceIR, 29 G-rules, incremental cache |
| **SKF** | [SKF-fleet-runtime.md](./SKF-fleet-runtime.md) | Fleet client + inheritance resolution |
| **SKR** | [SKR-relax-engine.md](./SKR-relax-engine.md) | Time-bound relaxations + approver-chain |

## Stability contract

Alpha. The `/api` facade is the ONLY stable surface consumers rely
on. Other subpaths (`/compile`, `/siem`, `/press`) are semver-minor
flexible — internal consumers are welcome, external consumers should
stay on `/api`.
