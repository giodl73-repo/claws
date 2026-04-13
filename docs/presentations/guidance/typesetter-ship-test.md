# R1 — Typesetter Ship Test: why-craftworks.md

**Reviewer**: craft/typesetter (all 9 subroles)
**Date**: 2026-04-10
**Deck**: `docs/presentations/why-craftworks.md`
**Verdict**: CONDITIONAL SHIP — 3 Majors must fix, 12 Warnings should fix

---

## Scoring Legend

| Grade | Meaning |
|-------|---------|
| 9-10 | Ship as-is |
| 7-8 | Ship with minor polish |
| 5-6 | Fix before shipping |
| 1-4 | Blocks shipping |

| Severity | Meaning |
|----------|---------|
| **M** (Major) | Blocks shipping — factual error, jargon leak, broken visual, misleading claim |
| **W** (Warning) | Should fix — density issue, pacing problem, unclear hierarchy |
| **N** (Note) | Nice to have — minor styling, optional improvement |

---

## Slide-by-Slide Review

### Slide 1: Title — "Why CraftWorks"

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Clean title slide. Tagline-subline-subline structure works. |
| information-architecture | 9 | Strong opening. Sets the stakes immediately. |
| narrative-pacing | 9 | Perfect opener — urgency + scope declaration. |
| domain-accuracy | 9 | "AI skills landscape" is audience-appropriate framing. |

**N1**: "Two problems. Same compilation pipeline." is slightly cryptic for someone entering cold. Consider "Two unsolved problems. One compilation pipeline." to signal novelty.

---

### Slide 2: "The Skills Landscape Today" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 7 | Split layout correct for concept slide. Left text is clean. |
| show-dont-explain | 6 | Left side is still explaining rather than showing. The image reference `babel-of-formats.png` carries the visual burden — but the three paragraphs on the left are narration. |
| visualization-artist | ? | Cannot evaluate — depends on the PNG. If the image is strong, this slide works. If it is a generic diagram, it does not. |
| domain-accuracy | 9 | Language is external-appropriate. |

**W1**: Left panel has three paragraphs of explanation text. The Patrick Winston test fails — the audience has to READ the left side. Reduce to the tagline + the italic question. Let the image do the rest.

---

### Slide 3: "Problem 1" (title)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Clean section divider. |
| narrative-pacing | 9 | Good tempo — concept breather before the proof slides. |
| domain-accuracy | 9 | "Skills Toolchain and Budgeting Problem" is clear business language. |

No findings.

---

### Slide 4: "From Loose Files to a Managed Portfolio" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | Before/After structure. Structured density. Star slide. |
| show-dont-explain | 9 | Actual file paths and directory trees. Real scenario. |
| pipeline-artist | 8 | Not a pipeline per se, but the tree diagram renders well. |
| value-cartographer | 8 | Primary flow (chaos to organized) clear in 5s. Secondary stories (namespaces, trust tiers, parameter sets) discoverable. |
| domain-accuracy | 8 | Clean. |

**N2**: The `sources/skill: 6 [definition] [body] [params] [roles] [policies] [tools]` line is slightly inside-baseball. External audience may not know what "sources/skill" means as a concept. Consider a label like "Each skill = 6 facets:" instead.

---

### Slide 5: "From Per-Tool Config to Workspace Templates" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | This is one of the best slides in the deck. Massive before/after with real filenames. |
| show-dont-explain | 10 | The 25 config filenames in the BEFORE box are the argument. No explanation needed. Screenshot-worthy. |
| pipeline-artist | 9 | ON-RAMPS -> ProgramIR -> BUILD PIPELINE -> TARGETS pipeline is excellent. |
| value-cartographer | 9 | Primary flow (left to right) in 5s. 29 targets as secondary discovery. |
| visualization-artist | 9 | The dense BEFORE box is viscerally effective. |
| domain-accuracy | 7 | See M1 below. |

**M1 (MAJOR)**: "CREST (13 prose)" — "CREST" is internal terminology. An external audience will not know what CREST is. It appears without definition or context. Same issue: "ProgramIR" — while "IR" is common in compiler circles, this audience (ops leads, FinOps, CISOs) may not parse it. At minimum, add "(intermediate representation)" on first use, or replace with "unified model." "DSPy" in the build pipeline also assumes audience familiarity. Consider "prompt optimization" or add "(prompt optimizer)".

**W2**: "craft.json controls everything" in the summary line — this is implementation detail. External audiences care about "one config file" not the filename. Consider "One config. Full control."

---

### Slide 6: "Skills as Packages" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Split layout works. Dependency tree is clean. |
| show-dont-explain | 8 | CLI commands + dependency tree. Shows, not explains. |
| workflow-artist | 8 | Dependency tree is finger-traceable. |
| domain-accuracy | 9 | "npm for AI skills" is a brilliant one-liner for this audience. |

**N3**: The `$ craft install / compile / test / optimize / deploy` block could use a slight visual separator from the dependency tree above it — they serve different purposes (ownership vs lifecycle).

---

### Slide 7: "Skills as Packages: The Full Lifecycle" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Structured density. Three-column layout (deps, lifecycle, targets). |
| show-dont-explain | 8 | Real package names, real commands, real target directories. |
| value-cartographer | 7 | Three columns but the eye has to work to connect them. |
| narrative-pacing | 6 | See W3 below. |
| domain-accuracy | 7 | See W4 below. |

**W3**: This is the third consecutive proof slide (slides 4, 5, 6/7 form a 4-slide proof stack). The concept-proof rhythm is breaking. Slides 6 and 7 cover the same topic — "Skills as Packages." Consider merging into one slide or inserting a concept breather between them.

**W4**: "OLET roles" appears in the dependencies (`@platform/shared-roles@^1.0 — 8 OLET roles`). OLET is internal jargon. External audience will not know what this acronym means. Replace with "structured roles" or "typed roles." Similarly "openclaw/ (12-file, 78%)" as a target — OpenClaw may need a one-word gloss on first mention (it appeared in the targets list on slide 5 without introduction).

---

### Slide 8: "The Maker Experience" (title)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Clean section divider. |
| narrative-pacing | 8 | Good breather after the proof stack. |
| domain-accuracy | 8 | "ops lead describes what they need" — correct persona. |

**N4**: "Maker Experience" may be slightly jargon-adjacent. Consider "The User Experience" or "From Intent to Deployment" for full clarity.

---

### Slide 9: "One Sentence to a Workspace" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | Three-column SCOUT/FORGE/COMPILE pipeline. Excellent structured density. |
| show-dont-explain | 9 | Real CLI command. Real entity counts. Real file outputs. |
| pipeline-artist | 9 | Three-stage pipeline is clear and well-rendered. |
| domain-accuracy | 7 | See W5 below. |

**W5**: "lobster.yaml ... triage pipeline" — Lobster is internal terminology for the workflow DSL. External audience will not know what "lobster.yaml" means. Replace with "workflow.yaml" or "pipeline.yaml" or add "(workflow definition)" as a gloss. Also "OpenClaw workspace generated" — this is the first time OpenClaw is explained in context, which is good, but it appeared unnamed in slides 5 and 7 first. Consider introducing OpenClaw earlier or adding "(open standard)" here.

---

### Slide 10: "Your Skills Get Better Automatically" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Split layout correct. Optimization loop diagram is clean. |
| show-dont-explain | 8 | Numbers at each round. Shows improvement concretely. |
| visualization-artist | 7 | The optimization loop is functional but not striking. It is a linear descent — consider adding quality bars alongside each round. |
| domain-accuracy | 7 | "DSPy teleprompter" is technical jargon. See W6. |

**W6**: "DSPy teleprompter curates demonstrations" — this is a term of art from the DSPy framework. External stakeholders will not know what a "teleprompter" means in this context. Replace with "prompt optimizer" or "automatic prompt tuning." Similarly "Self-refine tightens assertions" uses compiler-internal language. Consider "Self-improvement tightens quality checks."

---

### Slide 11: "PRESS: Line Justification for Token Budgets" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | The bar chart visualization is simple and viscerally effective. |
| show-dont-explain | 9 | Bars shrinking + quality percentages + budget cap line. Pure data. |
| visualization-artist | 9 | "Line justification for token budgets" is a memorable metaphor. The visual delivers. Screenshot-worthy. |
| domain-accuracy | 9 | Accessible language. "Word processor for token budgets" is excellent. |

No findings. Ship as-is.

---

### Slide 12: "PRESS: The Solver in Action" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | Before/After with solver breakdown. Dense but structured. |
| show-dont-explain | 9 | Real token counts, real quality percentages, real dollar figure. |
| value-cartographer | 9 | Primary flow (7,500 to 5,000) clear in 5s. Quality matrix and solver details for 30s exploration. |
| pipeline-artist | 8 | The solver progression is left-to-right, clear. |

**N5**: The AFTER box alignment is slightly ragged — `score-lead` and `enrich-data` cells are narrower than the BEFORE box while `verify-id` retains its width. This is intentional (showing compression) but may look like a rendering glitch in PPTX. Add a comment or ensure the visual intent is clear.

---

### Slide 13: "Competitive Compilation" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Tournament bracket. Clean concept slide. |
| show-dont-explain | 9 | Tournament bracket IS the argument. |
| visualization-artist | 9 | Tournament bracket is memorable and shareable. "THE TWIST" callout box is effective. |
| domain-accuracy | 9 | "Don't debate. Measure." is a strong closer. |

No findings. Ship as-is.

---

### Slide 14: "Case Study: From One Skill to the Whole Portfolio" (title)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Section divider with concrete numbers. |
| narrative-pacing | 9 | Excellent transition — now we zoom into a single case study. |
| domain-accuracy | 9 | Dollar figures are concrete and verifiable. |

No findings.

---

### Slides 15-19: Case Study Sequence (score-lead through portfolio zoom-out)

This is a 5-slide proof sequence. Reviewing as a group first, then individually.

| Subrole | Score | Notes |
|---------|-------|-------|
| narrative-pacing | 7 | Five consecutive proof slides. This is the longest proof stack in the deck. It works because each slide builds on the prior (progressive disclosure), but a concept breather after slide 17 (Deduplicate) would help. |
| information-architecture | 8 | Progressive pipeline: raw -> NATIVE -> CRUSH/FENCE -> PRESS -> portfolio. Excellent progressive disclosure. |

#### Slide 15: "Meet score-lead: Massively Over Budget"

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Problem statement with numbers. |
| show-dont-explain | 8 | Real token counts, real cost math. |
| domain-accuracy | 9 | Dollar figures, skill names — all external-appropriate. |

No findings.

#### Slide 16: "The LLM Stops Doing Arithmetic"

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | Before/After bar + step-by-step classification. |
| show-dont-explain | 9 | 7 operations classified as mechanical vs reasoning. Concrete. |
| visualization-artist | 8 | Two bars (10,000 vs 5,600) with the delta. |
| domain-accuracy | 8 | "Why is your most expensive model reading a database record?" — killer line. |

No findings. Strong slide.

#### Slide 17: "Deduplicate, Rewrite, Protect"

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Two-section breakdown (CRUSH + FENCE) with itemized savings. |
| show-dont-explain | 8 | Itemized token reductions. |
| domain-accuracy | 8 | CRUSH and FENCE are product names, acceptable since they are being introduced in context. |

**N6**: The footer line `+ security-scan CLEAN + budget-check 60% + quality-gate 0.85 + version v1.2.3` is compressed into one line. It is easy to miss. If these are important for the governance story, give them a small section. If not, cut.

#### Slide 18: "PRESS: Fit the Budget"

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | Solver visualization with bars at each density level. |
| show-dont-explain | 9 | Six bars, exact tokens, quality percentages. Pure data. |
| visualization-artist | 9 | Bars shrinking with quality labels. |

No findings. Ship as-is. This and slide 11 are companion pieces — the repetition is earned because this applies the concept to the case study.

#### Slide 19: "Zoom Out: Now Do This for All 50 Skills"

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | Dual column — one skill vs fifty skills. Bars shrinking in parallel. Budget cap line. |
| show-dont-explain | 9 | Dollar figures at every stage. The budget cap line IS the argument. |
| visualization-artist | 9 | This is the payoff slide. The shrinking bars with the cap line is memorable. |
| domain-accuracy | 8 | Dollar figures are internally consistent ($10,800 -> $5,400). |

**W7**: "RELAX (-$528)" appears in the cost breakdown. RELAX was not introduced until slide 23 (6 slides later). This is a forward reference that will confuse the audience. Either introduce RELAX before this slide or label it "NATIVE compilation (-$528)" here.

---

### Slide 20: "The CFO Dashboard" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Split layout. Dashboard mockup on the right. |
| show-dont-explain | 8 | Real dollar figures in a dashboard layout. |
| visualization-artist | 7 | Dashboard is functional but could be more polished. The percentage bar `▓▓▓▓▓▓▓▓▓▓░░░░ 68%` is a nice touch. |
| domain-accuracy | 9 | CFO language — spend, cap, top spender, most saved. |

**N7**: The dashboard right panel could include a "$ craft budget" command reference to show this is one CLI command away, reinforcing the "one command" promise in the tagline.

---

### Slide 21: "Problem 2" (title)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Section divider. |
| narrative-pacing | 9 | Critical breather. Resets the audience. |
| domain-accuracy | 9 | "Enterprise Harness for AI Skills" — clear, no jargon. |

**N8**: "Frameworks orchestrate code. Platforms host agents. Nobody harnesses skills." — strong trio. Ship as-is.

---

### Slide 22: "You Need an Enterprise Harness" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Four Pillars visual. |
| show-dont-explain | 8 | Competitor comparison at the bottom uses filled blocks to show coverage. |
| visualization-artist | 8 | Four pillars + sparse competitor bars is effective. |
| domain-accuracy | 7 | See W8. |

**W8**: The competitor comparison uses filled blocks (`██`) but the alignment is ambiguous. "Copilot Studio ██ ██ ██" — which columns do the blocks map to? Without column alignment enforced in monospace, the audience has to count characters to map blocks to headers. In PPTX rendering, this may misalign entirely. Consider using explicit Y/~/- markers like slide 29 does, or add vertical separator lines.

---

### Slide 23: "The Deal Review Pipeline" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Pipeline DAG with five composition patterns. |
| workflow-artist | 9 | Finger-traceable. Sequential, fan-out, fan-in, conditional, loop — all visible. |
| pipeline-artist | 9 | The pipeline IS the slide. |
| show-dont-explain | 9 | Real process (deal review), real steps, real patterns. |
| domain-accuracy | 9 | Sales pipeline language. Consistent persona. |

No findings. This is a benchmark slide per the role definition. Ship as-is.

---

### Slide 24: "One DAG. Three Models. No Agent-to-Agent Chat." (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | Three-column: Compiled DAG / Dispatch Engine / Runtime State. |
| workflow-artist | 9 | DAG is finger-traceable. Stage 1 fan-out with agent spawn is clear. |
| show-dont-explain | 9 | "Claude, GPT-4.1, Gemini" — concrete models. Budget percentages. |
| value-cartographer | 9 | Primary flow (left to right through DAG). Secondary stories in Runtime State column. |
| domain-accuracy | 9 | No jargon. |

No findings. Another benchmark slide. Ship as-is.

---

### Slide 25: "Compiled Context" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | DAG tree with delta notation. |
| show-dont-explain | 8 | Token counts: 480,000 full vs 144,000 deltas. 67% savings. |
| workflow-artist | 8 | Tree is traceable. |
| domain-accuracy | 8 | Clean. |

No findings.

---

### Slide 26: "Compiled Context: The Full DAG" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Expanded DAG with layer kinds and structural sharing. |
| show-dont-explain | 8 | CLI command (`craft cache ctx diff`) makes it tangible. |
| value-cartographer | 8 | Primary flow (DAG tree), secondary stories (7 layer kinds, monotonic enforcement, structural sharing). |
| narrative-pacing | 6 | See W9. |

**W9**: Slides 25 and 26 cover the same topic (Compiled Context) with the same numbers (480,000 -> 144,000, 67%). This is the split-to-proof pattern, which is valid, but the proof slide adds relatively little new information — mainly the 7 layer kinds and monotonic enforcement. Consider merging the layer-kinds box into slide 25's right panel, or adding the governance angle ("governance layers are immutable — cannot loosen at runtime") as the differentiator to justify two slides.

---

### Slide 27: "Roles" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Before/After + OLET structure diagram. Dense but structured. |
| show-dont-explain | 8 | Real YAML-like role fields. Puzzle-designer score comparison. |
| visualization-artist | 7 | The OLET 2x2 (Inward/Outward x 4 axes) is informative but busy. |
| domain-accuracy | 5 | See M2. |

**M2 (MAJOR)**: Multiple jargon issues:
- "OLET role" — OLET is internal terminology. External audience will not know this acronym. It appears 3 times on this slide. Replace with "structured role" or "typed role" and define what the 4 axes are in plain language.
- "puzzle-designer score: 25.4 / 45" — "puzzle-designer" is an internal benchmark name. External audience has no frame for what this means. Replace with "role quality benchmark" or "structured-prompting score."
- "222 roles. 9 areas. 7 tension clusters." — "tension clusters" is internal methodology language. Replace with "trade-off profiles" or "decision styles."
- ".craft/roles/architect/ROLE.md" — file path is implementation detail that does not serve external audience.
- "AB-17, 294 trials" — internal experiment ID. Replace with "294-trial A/B test."

---

### Slide 28: "RELAX: Zero-Token Data Transforms" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Split with pipeline on the right. |
| show-dont-explain | 8 | Section-by-section token counts: 0 vs LLM. |
| pipeline-artist | 8 | Data flow is clear: REPORT -> compile -> sources -> sections -> renderers. |
| domain-accuracy | 7 | See W10. |

**W10**: "ADM assembly" in the pipeline — ADM is not defined. External audience will not know what this acronym means. Replace with "report assembly" or define it.

---

### Slide 29: "RELAX: Account Health Report" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | Side-by-side WITHOUT/WITH comparison. Six sections. |
| show-dont-explain | 9 | Real section names, real token counts, real RELAX expressions. The expressions (`.select()`, `.groupBy()`, `.where()`) make it concrete. |
| value-cartographer | 9 | Primary flow: 52,000 to 8,000. Each section tells a story. |
| domain-accuracy | 8 | Account health language is consistent with the customer-facing persona. |

**N9**: The RELAX expression syntax (`.select()`, `.groupBy()`, `.where()`) resembles pandas/SQL hybrid. This is good — it signals familiarity to technical evaluators. No change needed.

---

### Slide 30: "From Stale Skills to Autonomous Maintenance" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Quality-over-time chart + detect/fix/gate summary. |
| show-dont-explain | 8 | Quality line chart with drift and recovery. |
| visualization-artist | 8 | The quality dip-and-recovery arc is effective. |
| domain-accuracy | 8 | "Dreaming agents" — this is product naming, acceptable in context since it is explained inline. |

No findings.

---

### Slide 31: "Dreaming: The Evidence" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Before/After with three concrete regressions. |
| show-dont-explain | 8 | Three specific drift examples. |
| domain-accuracy | 7 | See M3 and W11. |

**M3 (MAJOR)**: "Roadmap: planned for v5.2." — This is the only slide in the entire deck with an explicit roadmap disclaimer. This is correct and important. However, the presentation of the dreaming capability on slide 30 uses present tense throughout ("Dreaming agents watch quality and propose fixes", "The eval gate decides"). An external stakeholder could reasonably believe this is shipped. The present-tense framing on slide 30 must be changed to future tense or the roadmap disclaimer must be moved up to slide 30 itself.

**W11**: "MDC v2" and "sonnet-4.6" in the maker agent actions are implementation details. "MDC" is Cursor's rule format — most external audiences will not know this. Consider "format migration" instead of "migrate to MDC v2."

---

### Slide 32: "Enterprise Scale" (title)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Section divider. |
| narrative-pacing | 8 | Good breather. |

No findings.

---

### Slide 33: "Seal It. Deploy It. Roll It Back." (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Three-stage pipeline (seal -> deploy -> rollback) with state machine. |
| show-dont-explain | 8 | Real CLI commands. State machine. |
| pipeline-artist | 8 | Seal state machine is traceable. |
| domain-accuracy | 7 | See W12. |

**W12**: "SealableIR" and "ProgramIR" appear again. For external audiences, "IR" should have been defined by now. If slide 5's M1 is fixed (defining IR on first use), this is fine. Otherwise, these terms will be opaque.

---

### Slide 34: "20 Workspaces. One Change. Automatic Cascade." (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Forest DAG with cascade explanation. |
| workflow-artist | 8 | Tree is finger-traceable. Cascade path is clear. |
| show-dont-explain | 8 | Concrete: change shared-skills -> 3 workspace chains recompile. |
| domain-accuracy | 8 | "Kahn's topological sort" is fine for technical evaluators. |

**N10**: "CompilationForest" is a product concept name — acceptable since it is self-explanatory.

---

### Slide 35: "Quality Gates / Scope Graduation" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | Staircase visualization. Simple, memorable. |
| show-dont-explain | 9 | The staircase IS the argument. pass^N notation is intuitive. |
| visualization-artist | 9 | Staircase + "Any FAIL -> back to step 1" is viscerally clear. |
| domain-accuracy | 9 | "No declarations. No exceptions. Math." is a perfect closer. |

No findings. Ship as-is.

---

### Slide 36: "Fleet: Approve, Throttle, Kill" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | TUI mockup with real workspace data. This is a star slide. |
| show-dont-explain | 9 | Real dashboard with status, agents, budget, spend, progress bars. |
| visualization-artist | 9 | Progress bars, budget percentages, intervention ladder. Screenshot-worthy. |
| domain-accuracy | 9 | Ops language throughout. |

No findings. Ship as-is.

---

### Slide 37: "Same Data, Any Surface" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Fan-out from ProjectionModel to 6 surfaces. |
| show-dont-explain | 8 | Six concrete renderers with use cases. |
| domain-accuracy | 8 | Clean. |

No findings.

---

### Slide 38: "Enterprise Hosting: Compile, Sandbox, Execute" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Three-layer stack. |
| pipeline-artist | 8 | Vertical pipeline: CraftWorks -> WorkIQ Sandbox -> Any LLM. |
| domain-accuracy | 7 | "WorkIQ Sandbox" — is this an external product name or internal? If internal, needs context. "Landlock filesystem isolation" is a Linux kernel feature name — most stakeholders will not know this. "gRPC signal routing (34+ signal types)" is implementation detail. |

**W13**: "Landlock filesystem isolation" and "gRPC signal routing (34+ signal types)" are too technical for an ops lead or CISO audience. Replace with "per-agent file isolation" and "event routing (34+ event types)." "1:1 mapping: CraftWorks WorkAgent = WorkIQ SessionSlot" is internal architecture. Remove or replace with "one container per agent."

---

### Slide 39: "Case Study: Governance" (title)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Section divider. |
| narrative-pacing | 9 | Good reset before a 6-slide governance walkthrough. |

No findings.

---

### Slides 40-45: Governance Case Study Sequence

| Subrole | Score | Notes |
|---------|-------|-------|
| narrative-pacing | 7 | Six consecutive proof slides. This is the longest sequence in the deck. Each builds on the prior (progressive disclosure — Step 1 through Step 6), so the stacking is justified by the narrative, but the audience will be deep in detail by slide 44. Consider a one-line concept breather between Step 3 and Step 4, or between Step 4 and Step 5. |
| information-architecture | 9 | The 6-step journey (Guard -> CGR -> Runtime -> Gate Fail -> Review Panel -> Graduation) is excellent progressive disclosure. Every step naturally follows the prior. |

#### Slide 40: "Step 1: Guard — Compile-Time Policy"

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | CLI output mockup. |
| show-dont-explain | 9 | Real policy checks, real trust boundary violations. |
| domain-accuracy | 8 | "eu-ai-act 12/12" is concrete and meaningful to compliance audience. |

No findings.

#### Slide 41: "Step 2: The Governance Record"

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | CGR fields + deploy-time verification. |
| show-dont-explain | 8 | "Can you prove what was running last Tuesday?" — excellent opening. |
| domain-accuracy | 8 | CGR is introduced in context (Compile Governance Record). |

No findings.

#### Slide 42: "Step 3: The Workspace in Action"

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Fleet dashboard mockup for a specific workspace. |
| show-dont-explain | 9 | Real run counts, pass/fail, budget spend. |
| domain-accuracy | 9 | Consistent persona (prod-cs workspace, support domain). |

No findings.

#### Slide 43: "Step 4: A Gate Fails — Runtime Catches It"

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Two leads, two outcomes. |
| show-dont-explain | 8 | Lead #1247 passes, #1248 fails. Concrete. |
| domain-accuracy | 9 | BANT criteria, real lead descriptions. Consistent sales/support domain. |

No findings.

#### Slide 44: "Step 5: Role-Driven Review Panel"

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Three roles, three clusters, zero overlap. |
| show-dont-explain | 7 | The 6Q quotes are explanatory rather than showing. |
| domain-accuracy | 6 | See findings below. |

**W14**: "DRAGON (cluster A — Safety)" — "DRAGON" is an internal role codename. The domain-accuracy subrole explicitly flags this: "dragon -> compliance reviewer." Replace with "SAFETY REVIEWER (cluster A)" or "COMPLIANCE (cluster A — Safety)." Similarly, "6Q" is internal methodology terminology. Replace with the actual orientation quote or remove the prefix.

#### Slide 45: "Step 6: Scope Graduation"

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Gate history + journey timeline. |
| show-dont-explain | 8 | 8 runs, 8 scores, graduation milestones. |
| domain-accuracy | 8 | Clean. |

No findings.

---

### Slide 46: "The Progression: One Pipeline, Built in Two Steps" (split)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Two pipelines merging into one platform. |
| pipeline-artist | 8 | P1 and P2 pipelines side by side, merging. |
| information-architecture | 9 | Ties the two halves of the deck together. |
| narrative-pacing | 8 | Good summary before the competitive slides. |

No findings.

---

### Slide 47: "The Competitive Landscape" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Comparison matrix with Y/~/- markers. |
| show-dont-explain | 8 | The matrix IS the argument. CraftWorks fills every column. |
| domain-accuracy | 8 | Competitor names are real and current. |

**N11**: Consider adding a row for "Anthropic Managed Agents" since it is addressed in the next slide. Its absence here may prompt the audience to ask about it before you get to slide 48.

---

### Slide 48: "The Agent Runtimes: Head to Head" (small/proof)

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 8 | Three-column comparison table. |
| show-dont-explain | 8 | Feature-by-feature comparison. |
| domain-accuracy | 8 | "OLET roles -> compiled to both" — OLET jargon again (see M2). If M2 is fixed, this is fine. |
| narrative-pacing | 7 | Two consecutive comparison/proof slides (47, 48). Slightly heavy for the close of the deck. |

**N12**: "Lobster DSL (YAML)" — Lobster was flagged in W5. If W5 is fixed (glossing Lobster earlier), this mention is fine. Otherwise it remains unexplained jargon.

---

### Slide 49: Closing — "The AI skills landscape is chaos..."

| Subrole | Score | Notes |
|---------|-------|-------|
| slide-design | 9 | Echoes the opening. |
| information-architecture | 10 | Perfect closing echo. Opening: "The AI skills landscape is chaos. It's accelerating. Nobody is solving the foundational problems." Closing: "The AI skills landscape is chaos. It's accelerating. Now you have the platform that absorbs the change." |
| narrative-pacing | 9 | Clean, confident close. |
| domain-accuracy | 9 | "Compile, optimize, govern." is the three-word takeaway. |

No findings. Ship as-is.

---

## Summary of Findings

### Majors (3) — Must Fix Before Shipping

| ID | Slide | Issue |
|----|-------|-------|
| **M1** | 5 | "CREST," "ProgramIR," "DSPy" used without definition. External audience will not parse these terms. |
| **M2** | 27 | "OLET," "puzzle-designer," "tension clusters," "AB-17" — heavy internal jargon leak on the Roles slide. |
| **M3** | 30-31 | Dreaming capability uses present tense but is roadmap (v5.2). External stakeholders will believe it is shipped. |

### Warnings (14) — Should Fix

| ID | Slide | Issue |
|----|-------|-------|
| **W1** | 2 | Left panel explains instead of showing. Trim to tagline + question. |
| **W2** | 5 | "craft.json controls everything" is implementation detail. |
| **W3** | 4-7 | Four consecutive proof slides. Insert concept breather or merge 6+7. |
| **W4** | 7 | "OLET roles" and "openclaw/" used without introduction. |
| **W5** | 9 | "lobster.yaml" is internal DSL name. Replace with "workflow.yaml." |
| **W6** | 10 | "DSPy teleprompter" and "Self-refine tightens assertions" are jargon. |
| **W7** | 19 | "RELAX (-$528)" forward-references a concept not introduced until slide 28. |
| **W8** | 22 | Competitor comparison block alignment will break in PPTX rendering. |
| **W9** | 25-26 | Two Compiled Context slides with same numbers. Consider merging. |
| **W10** | 28 | "ADM assembly" undefined. |
| **W11** | 31 | "MDC v2" and "sonnet-4.6" are implementation details. |
| **W12** | 33 | "SealableIR" and "ProgramIR" — IR still not defined if M1 unfixed. |
| **W13** | 38 | "Landlock," "gRPC," "WorkAgent = SessionSlot" too technical for target audience. |
| **W14** | 44 | "DRAGON" is internal codename. "6Q" is internal methodology. |

### Notes (12) — Nice to Have

| ID | Slide | Issue |
|----|-------|-------|
| N1 | 1 | "Two problems" slightly cryptic cold. |
| N2 | 4 | "sources/skill: 6" line is inside-baseball. |
| N3 | 6 | CLI block and dependency tree need visual separator. |
| N4 | 8 | "Maker Experience" slightly jargon-adjacent. |
| N5 | 12 | AFTER box alignment may look like rendering glitch. |
| N6 | 17 | Footer line with security-scan/budget-check is easy to miss. |
| N7 | 20 | Dashboard could include the CLI command. |
| N8 | 21 | "Frameworks orchestrate. Platforms host. Nobody harnesses." — ship as-is. |
| N9 | 29 | RELAX expression syntax is good. No change. |
| N10 | 34 | "CompilationForest" is self-explanatory. Acceptable. |
| N11 | 47 | Consider adding Managed Agents row to competitive matrix. |
| N12 | 48 | "Lobster DSL" — dependent on W5 fix. |

---

## Deck-Level Assessments

### Narrative Pacing (overall: 8/10)

The concept-proof rhythm is strong. Three places where proof slides stack too deep:
1. Slides 4-7 (4 proof slides in Problem 1 intro)
2. Slides 15-19 (5 proof slides in case study — justified by progressive disclosure)
3. Slides 40-45 (6 proof slides in governance case study — justified by the step-by-step journey)

The title slides provide effective breathers. The closing echoes the opening perfectly.

### Information Architecture (overall: 9/10)

Excellent progressive disclosure. The deck builds:
- Chaos -> Organization -> Packages -> Maker Experience -> Optimization -> Case Study -> Harness -> Governance -> Scale -> Competitive -> Close.

Momentum never drops. Each section raises the stakes.

### Domain Accuracy (overall: 6/10 — the weakest dimension)

This is the primary risk. The deck has approximately 15 instances of internal jargon that will confuse external stakeholders. The three Majors (CREST/ProgramIR/DSPy, OLET/puzzle-designer/tension-clusters, Dreaming present-tense) must be fixed. The Warnings (Lobster, ADM, DRAGON, 6Q, MDC, Landlock, gRPC) should be fixed.

The test: "Could someone from the target audience (ops lead, FinOps, CISO) read this slide without asking 'what does that mean?'" Currently fails on 6-8 slides.

### Visual Quality (overall: 8/10)

The ASCII art is consistently well-crafted. Star slides: Fleet TUI (slide 36), PRESS bars (slide 11), Deal Review Pipeline (slide 23), One DAG Three Models (slide 24), Scope Graduation staircase (slide 35), Tournament bracket (slide 13). Multiple slides pass the "would someone screenshot this?" test.

### Capability Accuracy (overall: 8/10)

Only one shipped-vs-planned issue: Dreaming (M3). All other capabilities are presented with appropriate confidence. Dollar figures are internally consistent. The PRESS case study math checks out (10,000 -> 1,200 single skill; $10,800 -> $5,400 portfolio).

---

## Verdict

**CONDITIONAL SHIP.** Fix the 3 Majors. The jargon leak (M1, M2) is the fastest fix — find-and-replace internal terms with external equivalents. The Dreaming tense issue (M3) requires rewording 2 paragraphs on slide 30. After those fixes, this deck is strong enough for external stakeholders.

The 14 Warnings improve the deck but do not block it. Prioritize W7 (RELAX forward reference), W8 (competitor block alignment), and W14 (DRAGON codename) as the highest-value Warning fixes.
