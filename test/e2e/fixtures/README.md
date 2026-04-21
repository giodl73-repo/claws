# test/e2e/fixtures — index

Fixtures are minimal workspace trees (`SOUL.md` + `TOOLS.md` + `AGENTS.md`,
sometimes plus supplementary JSON) that scenarios copy into per-scenario tmp
dirs via `copyFixture` (see `test/e2e/harness/fixture-copier.ts`). Every
fixture is "clean" — no `.openclaw/policy/` tree checked in — so
`fixture-copier` accepts it.

## Core verb × tier/sensitivity fixtures (SC-01 .. SC-04)

| Directory | Expected verb | Tier pair | Scenario | Exercises |
|-----------|--------------|-----------|----------|-----------|
| `allow-r1-public/` | allow | R1 / PUBLIC | SC-01 | Canonical allow path; `declaredTier` === `effectiveTier` === `R1` |
| `deny-soul-rule/` | deny | R3 / INTERNAL | SC-02 | Explicit SOUL deny rule (`prohibit-secrets-exfil`) firing; SC-02 F-01..F-05 |
| `review-r5-restricted/` | review | R5 / RESTRICTED | SC-03 | R5 tool on RESTRICTED source escalates to companion approval |
| `modify-arg-redaction/` | modify | R2 / INTERNAL | SC-04 | `redact-email-addresses` transform; `modifiedArgsHash` assertion; SC-04 F-01..F-07 |

## Pitfall-driven fixtures (SC-05 .. SC-07)

| Directory | Pitfall | Scenario | What it proves |
|-----------|---------|----------|----------------|
| `p01-decision-start-capture/` | P-01 | SC-05 | `policyArtifactSha256` captured at decision start — surviving a mid-decision `policyPromote` |
| `p02-canonical-invocation-hash-conjunctive/` | P-02 | SC-06 | Two conjunctive providers bind both approvalHandles to the same `ctx.canonicalInvocationHash` |
| `p04-trust-set-reload/` | P-04 | SC-07 | `fs.watch` reload inside 30s staleness budget; atomic rename via `write-atomic.ts`; CL-11 §3a |

## Canonicalizer fixtures (SC-08)

| Directory | Scenario | What it proves |
|-----------|----------|----------------|
| `canonicalizer/` | SC-08 | JCS edge-cases (unicode, deep nesting, key ordering) + 1 MB payload shape |
| `canonicalizer-multi-consumer/` | SC-08 | Full-shape policy-IR canonicalized byte-identically by producer, host-mock, and companion-mock |

## Authoring rules

1. **Minimal only.** The fixture includes only the fields the scenario
   asserts on. Every extra field is a future-compatibility risk.
2. **No generated artifacts.** Never commit `.openclaw/policy/` under a
   fixture — `fixture-copier` refuses dirty sources
   (`UncleanSourceError`). The generator runs against the *tmp copy*.
3. **Byte-preservation.** CRLF line endings and UTF-8 BOM survive the
   copy (`copyFileByteExact`). Do not normalize line endings when you
   commit; the substrate tests check this contract.
4. **Same-drive atomic writes.** The `p04-trust-set-reload` fixture ships
   `write-atomic.ts`, which uses same-drive `fs.rename`. Cross-drive
   renames degrade to copy+unlink and are non-atomic — SC-07 F-03
   guardrails against that.
5. **Scenario codes pin the mapping.** Each core fixture maps 1:1 to
   exactly one scenario (SC-0X). Pulses 45 + 46 materialize those
   scenarios against these fixtures. Renaming a fixture requires
   updating the scenario map below *and* the Scenario Codes section in
   pulse 44.

## Helpers

- `p04-trust-set-reload/write-atomic.ts` — atomic trust-set rotation.
  Exports `writeTrustSetAtomic(tmpFixtureDir, 'trust-set.v1.json' | 'trust-set.v2.json')`.
  Performed via same-drive `fs.rename` + fsync; rejects cross-drive
  targets.

## Smoke gate

`test/e2e/harness/__tests__/fixtures-smoke.integration.test.ts` runs one
`copyFixture` + stub `policy generate` per core fixture. That gate runs in
the `integration` vitest project; run it with:

```bash
cd C:/src/claws
./node_modules/.bin/vitest run --config test/e2e/vitest.config.ts \
  --project integration fixtures-smoke
```
