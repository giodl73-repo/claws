---
round: 1
type: pulse-review
checkpoint: 5
pulses: [36, 37, 38, 39, 40, 41, 42, 43]
panel:
  [claws:ciso, claws:founder, claws:skill-author, claws:gateway-eng, craft:architect, craft:testing]
---

# CP-5 Pulse Review — R1 All Roles

## claws:ciso

**Finding 1 (M): Pulse 38 — verifier drop-to-zero lacks audit trail entry.**
The source verifier (pulse 38) sets confidence to 0 and drops unverified intents, but there is no deliverable for logging dropped intents to the audit trail. A CISO needs to know _what was dropped and why_ for incident reconstruction. Without this, a compromised LLM that emits bad sourceLine references silently disappears from the record. The verifier should emit a `dropped-intent` audit event (including original sourceText, claimed sourceLine, and reason) alongside its filtering. This could be a line in the verifier.ts deliverable description rather than a new file, but it must be explicit.

**Finding 2 (W): Pulse 37 — adversarial-guard.ts is a single shared module but has no dedicated tests.**
The adversarial resistance instructions (`adversarial-guard.ts`) are shared across all 4 extraction prompts, yet the 12 L0 tests only cover "adversarial input rejected" per-prompt. There is no test that validates the guard instructions themselves survive prompt composition (e.g., that appending them doesn't truncate or get reordered). Consider adding 1-2 L0 tests specifically for the guard module's composition behavior.

## claws:founder

**Finding 1 (M): Pulse 39 — cache deliverable places CLI command in claws-cli but plan says claws-sdk owns logic.**
Pulse 39 lists `claws-cli/src/commands/cache.ts` with `claws cache status/export/import/clear` commands. The cache _logic_ (LLMCache class) correctly lives in claws-sdk, but the export/import/clear operations involve file I/O and state mutation that arguably belong in the SDK as methods, with the CLI as a thin adapter. Currently the pulse mixes SDK and CLI deliverables without clarifying the boundary. The SDK-owns-logic rule from CLAUDE.md should be reflected: cache.ts (SDK) exposes `export()`, `import()`, `clear()`, `status()` — and the CLI command just calls them.

**Finding 2 (W): Pulse 40 — no mention of what happens without @anthropic-ai/sdk installed.**
The plan says Anthropic SDK is an "optional peer dependency." Pulse 40 wires `--llm` into compile/check/build commands, but there is no deliverable or test for the case where `@anthropic-ai/sdk` is not installed and the user passes `--llm`. The error message specification ("WHAT+HOW+WHERE" for missing API key) should also cover missing SDK package. A 3.2M-user community will hit this.

## claws:skill-author

**Finding 1 (M): Pulse 37 — SKILL.md prompt handles "YAML frontmatter + free-form markdown body" but no test exercises a real SKILL.md with governance annotations.**
The SKILL.md extraction prompt (pulse 37) is described as handling YAML frontmatter + free-form body, but the 3 L0 tests per prompt are generic (valid extraction, adversarial rejected, empty file). None specifically exercise the SKILL.md frontmatter-to-intent extraction path (e.g., a skill with `risk: R3` in frontmatter AND prose like "this skill accesses customer data"). The 1 L1 test per prompt is against a "reference workspace file," but the pulse doesn't specify that the reference workspace includes a SKILL.md with governance-bearing frontmatter. Skill authors need confidence this actually works for their format.

**Finding 2 (N): Pulse 40 — `claws extract --preview` is exactly what skill authors need.**
Good design. Preview without merging means skill authors can see what the LLM finds in their SKILL.md without any side effects. The `--json` flag for programmatic output is a nice touch for CI integration. No issue here.

## claws:gateway-eng

**Finding 1 (M): Pulse 41 — watch debounce has no latency budget or cancellation strategy.**
Pulse 41 describes "queue LLM extraction as a background job" during watch mode, but specifies no deliverable for: (a) cancelling an in-flight LLM request when the file changes again before the result returns (debounce cancellation), (b) what happens if the LLM call takes >10s and the user has edited 5 more times. The 4 L0 tests include "debounce timing" but with only 1 L1, there is no test for the rapid-edit-cancellation scenario. Without cancellation, the watch loop could queue unbounded LLM requests that pile up, consuming API quota and memory.

**Finding 2 (W): Pulse 43 — benchmark test has no latency assertions.**
The quality benchmark (pulse 43) measures intent coverage delta (tools classified, deny constraints, etc.) but includes no performance measurement. From a gateway-eng perspective, the benchmark should also record wall-clock time for regex-only vs LLM-enhanced compilation on the reference workspace. This becomes the baseline latency budget. Without it, the LLM stage could add 30s to compile and still "pass."

## craft:architect

**Finding 1 (M): Pulse 39 — SDK/CLI boundary split within a single pulse creates ambiguity.**
Pulse 39 delivers both `claws-sdk/src/compile/llm/cache.ts` (SDK) and `claws-cli/src/commands/cache.ts` (CLI) in one pulse. The test_scope only runs `cd claws-sdk && vitest run tests/compile/llm/` — there are no CLI-level tests for the cache commands. Either: (a) split the CLI cache command into pulse 40 where other CLI work happens, or (b) add CLI-level tests to pulse 39's test scope (`cd claws-cli && vitest run tests/commands/cache.unit.test.ts`). Currently the pulse claims 8 L0 + 2 L1 but all run in claws-sdk — the CLI command is untested.

**Finding 2 (W): Pulse 42 — depends_on [37] seems incorrect; should be [6] or no dependency.**
Pulse 42 (OC format tolerance) is parser fixes for intent extractors. It depends on pulse 37 (extraction prompts), but the parser fixes are to `tools-intent.ts` and `soul-intent.ts` — the regex intent extractors, not the LLM prompts. The CP-5 dispatch plan correctly puts pulse 42 in batch 3 parallel with pulse 38, but the pulse's own `depends_on: [37]` contradicts this. Pulse 42 should depend on pulse 6 (the original intent extractor pulse from Ptah) or have no LLM dependency at all, since it is fixing regex parsers.

## craft:testing

**Finding 1 (M): Pulse 41 — 4 L0 + 1 L1 is thin for a concurrency feature.**
Watch mode debounce involves async timing, cancellation, and merge-on-next-cycle semantics. 4 L0 tests for "debounce timing, regex-first display, LLM merge on next cycle, no-llm watch unchanged" and 1 L1 are insufficient for a feature with race conditions. Missing tests: (a) rapid successive file changes (does the second change cancel the first LLM request?), (b) LLM error during background extraction (does the watch loop survive?), (c) LLM result arrives after file was deleted. At minimum, 2-3 additional L0 tests for error and edge cases.

**Finding 2 (W): Pulse 43 — the L3 acceptance test assertion is weak.**
Pulse 43's L3 acceptance test (`llm-enhanced.accept.test.ts`) asserts "LLM-enhanced compile + GatewaySim produces strictly more enforcement than regex-only (never less)." This is a superset assertion — it only checks that LLM doesn't reduce coverage. It does not validate that LLM adds _meaningful_ coverage (e.g., at least +1 on 3 of 5 metrics from the plan's quality table). Without a minimum-delta assertion, the test passes even if the LLM stage adds zero value. The benchmark deliverable tracks the delta but the acceptance test should enforce a minimum.
