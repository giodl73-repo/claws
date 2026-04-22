---
reviewer: claws:skill-author
round: 1
checkpoint: cp-1
wave: anubis-the-judge
date: 2026-04-12
verdict: conditional-pass
findings: 12
major: 3
warning: 5
note: 4
---

# R1 Review: CP-1 Foundation -- claws:skill-author Lens

## Lens Statement

Evaluating CP-1 from the perspective of a skill author who publishes OC skills and evaluates every tool by: "does this make my next skill faster to build, test, and publish?" The skill author cares about 5-minute adoption, clean generated code, useful error messages, and governance badges that translate to installs.

---

## Findings

### M-01: Reference workspace is infrastructure-facing, not skill-author-facing

**Pulse 01** creates a reference workspace with 9 OC files, 12 tools, 2 agents, and 3 skills. The deliverables list every file as a fixture artifact. But there is no documentation within the fixture explaining *why* each file exists, what governance pattern it demonstrates, or how a skill author would learn from it.

A new developer encountering `fixtures/oc-reference-workspace/` sees 15+ files with no README, no comments explaining the design choices (why R3 on summarize? why R5 on email-drafter?), and no mapping from "I want to build a governed skill" to "here's what each file teaches you." The fixture is built for machines (golden-master assertions), not humans (learning). This matters because Pulse 09 uses this workspace as the "day 1" experience foundation.

**Recommendation**: Add a `fixtures/oc-reference-workspace/README.md` with a skill-author-oriented walkthrough: what each file does, what governance pattern it demonstrates, and what violations are *intentionally* embedded (and why). This costs 30 minutes and turns the fixture into a teaching tool.

---

### M-02: Error contract (Pulse 04) has WHAT+HOW+WHERE but no concrete docsUrl strategy

Pulse 04 specifies that every DiagnosticError must have a `docsUrl` field. This is excellent -- it is the single most important field for a skill author who hits an error. But the pulse has no deliverable for the actual documentation those URLs point to. The error codes file (`codes.ts`) maps OC-POLICY-E001..E099 to descriptions, but there is no plan for creating the docs at those URLs.

If docsUrl points to a 404, it is worse than no URL at all. The skill author clicks, gets nothing, loses trust. The plan references `docs/claws/getting-started/init.md` in the init-uninstall plan but nothing in CP-1 itself.

**Recommendation**: Either (a) add a deliverable to Pulse 04 for a `docs/claws/errors/` directory with stub pages for each error code category (parse, compile, governance, emit, config), or (b) make docsUrl point to a generated error reference that ships with the CLI (`claws help E001`). Option (b) is more resilient -- no external dependency.

---

### M-03: E2E init loop (Pulse 09) does not test the "no OC workspace" path

Pulse 09 copies the reference workspace to a temp dir, removes claws.json and .claws/, then runs `claws init`. But this still means the workspace has SOUL.md, TOOLS.md, AGENTS.md, and all the other OC files already present. Every real skill author starts with *some* OC files, but many start with just SOUL.md and TOOLS.md -- or even nothing at all.

The init-uninstall plan (H1) specifies `claws init` with no flags defaults to `--template minimal` and explicitly lists a scenario `init/no-workspace-files -- init with no platform marker files prompts for platform selection`. But Pulse 09's e2e test only covers the happy path where all 9 OC files exist.

**Recommendation**: Add a second e2e variant in Pulse 09 that tests `claws init` on a directory with only a SOUL.md (the minimum viable OC workspace). This exercises the platform detection fallback and the minimal template path -- the actual "day 1" for most skill authors.

---

### W-01: Test gates test system correctness, not skill-author experience

Across all 9 pulses, the test gates verify structural correctness: "fixture files parseable," "SARIF validates against schema," "GatewaySim loads plugin," "exit code is 1." None of the tests verify the *quality* of what the skill author sees.

For example, Pulse 08 (e2e-check-loop) verifies that "every reported violation has non-empty WHAT, HOW, and WHERE fields." But it does not verify that those fields contain *useful* text. A WHAT field of "violation" and a HOW field of "fix it" would pass the test. The skill author would get nothing.

**Recommendation**: Add at least one assertion per e2e test that checks the *content quality* of user-facing output -- e.g., WHAT contains the tool name that violated, HOW contains an actionable verb ("add," "remove," "change"), WHERE contains a real file path that exists in the workspace.

---

### W-02: No "getting started" narrative threads through the pulses

CP-1 builds formatters, error contracts, config loaders, progress bars, and three e2e loops. But there is no pulse or deliverable that produces a "getting started" experience. The closest thing is Pulse 09 (init loop), but that is an e2e *test*, not a user-facing artifact.

After CP-1 ships, a skill author who runs `claws --help` will see... what? The pulses build the plumbing but never specify what the CLI says when you type `claws` with no arguments, what `claws --help` shows, or what the first-run banner communicates. Pulse 05 creates a banner with "version string and claws name" -- but the banner is the first thing a skill author sees. Is it welcoming? Does it tell them what to do next?

**Recommendation**: Add a deliverable to Pulse 05 (banner) or a new micro-pulse that specifies the `claws` bare invocation output: version, available commands, and a one-line "get started with `claws init`" prompt. The skill author's first 10 seconds with the tool should not be a blank screen or a wall of flags.

---

### W-03: Gateway simulator (Pulse 02) has no skill-author-facing API surface

The GatewaySim is described as a test harness for e2e tests. But skill authors also need to test their skills against governance. The role definition says: "Does `claws test` catch real bugs or just create ceremony?" If GatewaySim is only usable inside the test suite, skill authors cannot use it to test their own skills during development.

Pulse 02 places GatewaySim in `claws-sdk/src/testing/` with barrel exports. This is the right location for programmatic access. But there is no mention of a CLI surface (`claws test` or `claws sim`) that would let a skill author run `claws sim fire send-email --user sarah` from the terminal.

**Recommendation**: This is likely out of scope for CP-1 (it belongs in CP-2 or later). But add a note in Pulse 02 that GatewaySim's public API should be designed with future CLI exposure in mind -- method signatures, return types, and error reporting should be suitable for direct terminal rendering, not just test assertions.

---

### W-04: Color system assumes visual familiarity with R1-R5 risk tiers

Pulse 04 maps R1=green through R5=bright-red. This is intuitive for the claws team but not for a new skill author who does not know what "R3" means. The terminal formatter (Pulse 03) shows "colored severity indicators" but does not specify whether the output says "R3" or "MEDIUM" or "medium risk -- file modification."

A skill author running `claws check` for the first time should see language they understand ("HIGH: send-email requires approval"), not internal tier labels ("R5: send-email"). The risk tier number is a governance implementation detail.

**Recommendation**: Ensure the default terminal formatter (Pulse 03) renders human-readable severity names (CRITICAL, HIGH, MEDIUM, LOW) as the primary label, with risk tier (R1-R5) available only in verbose/debug output or SARIF. Add a test assertion for this in the default formatter unit test.

---

### W-05: Pulse 01 fixture skills lack governance annotation examples at all 3 tiers

The reference workspace has 3 skills: summarize (R3), email-drafter (R5), web-lookup (R1). These cover tiers 1, 3, and 5. But the role definition emphasizes the three-tier adoption model: Tier 1 (3 YAML lines, 2 minutes), Tier 2 (decorators), Tier 3 (full governance config). All three fixture skills should demonstrate different adoption tiers, not just different risk levels.

A skill author looking at the reference workspace should see: "this is what Tier 1 looks like (3 lines of YAML), this is Tier 2 (decorators), this is Tier 3 (full config)." Currently the pulse says the skills have "decorators" and "R5 requiring elicitation" but does not explicitly map them to adoption tiers.

**Recommendation**: Annotate the Pulse 01 deliverables to specify which adoption tier each fixture skill demonstrates. Ensure web-lookup is Tier 1 (minimal YAML), summarize is Tier 2 (decorators), email-drafter is Tier 3 (full governance config with elicitation rules).

---

### N-01: CSV formatter (Pulse 03) is fleet-facing, not skill-author-facing

The CSV formatter is designed for "fleet-scale reporting" per the pulse description. No individual skill author will ever use `--format csv`. This is fine -- it serves platform engineers. But listing it alongside the other formatters without noting the audience split may lead implementers to test it from the wrong perspective.

**Recommendation**: No action needed in the plan, but note in the implementation that CSV formatter tests should use fleet-scale fixture data (100+ violations), not the 3-violation skill-author test cases.

---

### N-02: Config loader defaults (Pulse 06) should be skill-author-friendly

Pulse 06 specifies that missing fields in claws.json receive defaults: "trust tier T2, no suppressions, default format terminal." T2 is a reasonable default. But the pulse does not specify what happens when claws.json is completely absent (not just missing fields). A skill author who has not run `claws init` and just tries `claws check` in their OC workspace should get a helpful message, not a crash.

**Recommendation**: Add an acceptance criterion to Pulse 06: "When claws.json is absent, produce a DiagnosticError with WHAT='No claws.json found', HOW='Run claws init to set up governance', WHERE=workspace root, docsUrl=getting-started."

---

### N-03: L3 acceptance test in Pulse 09 is the only one in CP-1

Pulse 09 has 1 L3 acceptance test. The rest of CP-1 has zero L3 tests. This means the formal acceptance contract for the entire checkpoint rests on a single test that covers the init-to-enforcement pipeline. If this test passes but the individual components have UX problems (bad error messages, confusing output), the checkpoint gate will still pass.

**Recommendation**: Consider adding 1-2 more L3 acceptance tests -- one for the check-loop (Pulse 08) that asserts human-readable output quality, and one for the error contract (Pulse 04) that asserts docsUrl resolution. These provide a skill-author-facing acceptance gate alongside the system-facing one.

---

### N-04: No mention of `--verbose` or `--quiet` flags in any pulse

Nine pulses build CLI infrastructure (formatters, errors, progress, config, e2e loops) but none specifies verbosity control. A skill author running `claws check` in CI wants `--quiet` (exit code only). A skill author debugging a governance failure wants `--verbose` (show all parsed rules, matched constraints, resolution chain). These flags affect every formatter and UI component.

**Recommendation**: Not critical for CP-1, but add a note in the checkpoint exit criteria that verbosity flags will be addressed in CP-2. Without this note, CP-2 may have to retrofit verbosity into every formatter and UI component built in CP-1.

---

## Summary

CP-1 builds solid infrastructure: the reference workspace, gateway simulator, formatters, error contract, and three e2e loops provide the foundation for everything that follows. The technical design is sound and the dependency ordering is correct.

The gap is that CP-1 is built almost entirely from the system's perspective. The skill author -- the person who will actually type `claws init` and stare at the output -- is represented in the governing roles (Pulses 04, 08, 09) but not in the deliverables or test assertions. The three Major findings (reference workspace has no teaching narrative, docsUrl points nowhere, init loop skips the minimal-workspace path) each represent a moment where a real skill author would hit a wall.

**Verdict**: Conditional pass. Address M-01, M-02, and M-03 before implementation begins. The warnings (W-01 through W-05) can be addressed during implementation without plan changes.
