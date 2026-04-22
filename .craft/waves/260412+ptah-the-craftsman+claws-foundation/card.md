```
  ____  _        _     _       _   _
 |  _ \| |_ __ _| |__ | |_ ___| | | |
 | |_) | __/ _` | '_ \| __/ _ \ |_| |
 |  __/| || (_| | | | | ||  __/  _  |
 |_|    \__\__,_|_| |_|\__\___|_| |_|

       XC  --  PTAH THE CRAFTSMAN
       2026-04-12 .. 2026-04-13
       claws foundation wave
```

## Metrics

| Metric | Value |
|--------|-------|
| Commits | 115 |
| Plans | 11 (10 closed + 1 naming) |
| Checkpoints | 5 |
| Pulses | 31 |
| Tests | 453 (362 pass + 82 skill-kit + 9 expected-fail) |
| Acceptance | 65/74 scenarios (87.8%) |
| Review findings | 37 Majors fixed across 3 checkpoint reviews |
| Copilot threads | 53 resolved |
| Packages | 4 new (claws-sdk, claws-cli, claws-skill-kit, claws-test) |

## Wave Breakdown

| CP | Name | Pulses | Key Deliverable |
|----|------|--------|-----------------|
| CP-1 | Foundation | P01-P05 | Packages, GovernanceIR, FailMode<R>, HMAC signing |
| CP-2 | Detect + Parse + Skill-Kit | P06-P12, P23-P25 | 7-platform detection, 9-file parser, intent extraction, @bic/claws-skill-kit |
| CP-3 | Rules + Emit | P13-P19 | 32 governance rules, gateway plugin emitter, workflow inversion, loss-aware routing |
| CP-4 | CLI + Test Framework | P20-P22, P26-P28 | claws compile/check/build commands, GovernanceValidator, SecurityScanner |
| CP-5 | Acceptance Harness | P29-P31 | 5 scenario runners, 74 workspace fixtures, manifest-driven acceptance suite |

## Mythological Parallel

Ptah, the Egyptian god of craftsmen, shaped the world by speaking it into
existence — conceiving form in his heart and bringing it forth through his
tongue. This wave mirrors his method: from pure design (7 specs, 331
scenarios, 249 pitfalls) to material reality (4 packages, 32 governance
rules, 7-platform emission). Like Ptah's workshop at Memphis where raw
stone became sacred architecture, claws transforms raw OC workspace files
into type-safe governance artifacts. The craftsman's discipline shows in
the numbers: 87.8% of design scenarios pass on first contact with the
compiler, proving the specs were built to be built.

## Key Technical Achievements

The claws governance compiler reads 9 OC workspace files, extracts governance
intents with confidence scoring, applies 32 rules across 10 families (G-CLASS
through G-SUPPLY), detects 7 categories of cross-file conflicts, and emits
executable TypeScript gateway plugins with R5 fail-closed as a type-level
invariant (`FailMode<5>` cannot represent fail-open). The loss-aware routing
engine evaluates 7 platforms against a fidelity matrix and blocks R5 advisory
downgrade by default. The @bic/claws-skill-kit ships as a zero-dependency package
with 6 governance decorators and a MockGateway for testing. The acceptance
harness proves all of this works by running 74 design scenarios through the
actual compiler and reporting per-scenario pass/fail with spec traceability.
