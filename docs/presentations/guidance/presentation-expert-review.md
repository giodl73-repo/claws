# Presentation Expert Review

Deck: `docs/presentations/why-craftworks.md`
Benchmark: `docs/presentations/craftworks-overview.md`
Slide count: 26 slides (20 core + 3 appendix + 3 section breaks)
Estimated speaking time at 2 min/slide: ~52 min (too long for 20-min slot, tight for 40)

---

## Slide-by-Slide Assessment

### Slide 1 — Title (lines 7-14)
**Density**: Good. Three elements: title, provocation, tagline.
**Hierarchy**: The bold italic sentence is the hook. Eye goes there first. Correct.
**Squint test**: PASS. Big title, one bold line, one smaller line.
**Takeaway**: "The AI skills landscape is broken and nobody is fixing it."
**Rendering**: Clean. Will render well in PPTX.
**Notes**: Strong opener. The provocation line ("It's accelerating. Nobody is solving the foundational problems.") is better than the overview deck's opener because it creates tension rather than stating a value prop. Keep this.

### Slide 2 — The Skills Landscape Today (lines 17-28)
**Density**: Slightly heavy. The code block showing 10 tool formats is the right visual. The paragraph below it adds context but the bold question at the end is doing real work.
**Hierarchy**: Eye goes to the code block first (good — it IS the point). Then to the bold question.
**Squint test**: PASS. Code block dominates, text below.
**Takeaway**: "Every tool has its own format. You're going to keep rewriting."
**Rendering**: The code block is 4 lines wide. In PPTX at default monospace sizing this should fit, but it's dense — the alignment of the 10 tool names matters and could break if font sizing shifts. Test this slide in actual PPTX output.
**Fix**: The paragraph between the code block and the bold question ("Your team uses 3 tools today...") is good but could be tighter. Consider: "Your team uses 3 tools today. Next quarter, 4. Each needs its own copy of the same skills — maintained separately, drifting silently."

### Slide 3 — Problem 1 Section Break (lines 34-37)
**Density**: Perfect for a section break.
**Hierarchy**: Title class. Works.
**Squint test**: PASS.
**Takeaway**: "We're entering the toolchain problem."
**Rendering**: Fine.
**Notes**: Clean section break. The subtitle "Nobody Is Solving the Skills Toolchain Problem" is a strong claim. Good.

### Slide 4 — Today: Every Step Is Ad Hoc (lines 41-52)
**Density**: The 4-row table is the right density for this content. The framing paragraph above is necessary. The bold closer below earns its weight.
**Hierarchy**: Eye goes to bold column headers in the table. "What's missing" column is the payload — good that it's last (the punchline position in left-to-right reading).
**Squint test**: PASS. Table shape is visible. Two text blocks bookending it.
**Takeaway**: "Everyone does these 4 steps manually. No toolchain connects them."
**Rendering**: 3-column table will render cleanly. Widths are balanced.
**Notes**: This is one of the best slides in the deck. Tight, clear, actionable. Don't touch.

### Slide 5 — Same Skill, Five Formats (lines 56-77)
**Density**: TOO DENSE. Two tables stacked. The first table (3 rows x 6 columns) is already a lot. The second table (4 rows x 6 columns) pushes this past what a single slide can carry. The audience will glaze.
**Hierarchy**: Fails. Eye doesn't know which table to read first. Both compete for attention.
**Squint test**: FAIL. Two similar-shaped blocks. No visual differentiation.
**Takeaway**: Trying to do two things — "formats differ" AND "tool names differ." Pick one per slide or merge them.
**Rendering**: Two wide tables in Marp PPTX will be cramped. The `_class: small` helps but doesn't solve the fundamental problem of two competing data displays.
**Fix (high priority)**: Split into two slides. Slide 5a: "Same Skill, Five Formats" with the file/frontmatter/sections table. Slide 5b: "Every Platform Names Things Differently" with the tool name translation table. OR — cut the tool name table entirely and move it to the appendix. The file format table alone makes the point.

### Slide 6 — 29 Targets and Growing (lines 81-98)
**Density**: Good. The ASCII layout of 29 targets grouped into 4 categories works as a visual. The closing line is tight.
**Hierarchy**: Eye goes to the code block categories (bolded headers in the block would help but Marp won't render bold in code). The "EMERGING" row at the bottom is the kicker.
**Squint test**: PASS. One big code block, one sentence below.
**Takeaway**: "We compile to 29 targets, and adding new ones is just a YAML file."
**Rendering**: The code block is 6 lines. Should render fine. The "..." at the end of the EMERGING line is a nice touch — suggests acceleration.
**Notes**: Solid slide. The "day one of tool #30" closer is excellent copywriting.

### Slide 7 — Two Control Surfaces: program.yaml + craft.json (lines 102-124)
**Density**: TOO DENSE. Two 5-row tables with substantial text in each cell. This is a reference card, not a presentation slide. The audience cannot absorb 10 rows of capability descriptions in 2 minutes.
**Hierarchy**: Fails. Two identically-shaped tables with bold labels in the left column. Eye bounces between them.
**Squint test**: FAIL. Two identical blocks.
**Takeaway**: Trying to say "you control the workspace model AND the build pipeline." Two messages.
**Rendering**: In PPTX, two 5-row tables with multi-word cells will be very small text. This will be unreadable from the back of a room.
**Fix (high priority)**: This needs to become two slides, or radically simplify. Option A: One slide for program.yaml (workspace model) and one for craft.json (build pipeline). Option B: Collapse each to 3 rows max and use shorter descriptions. Option C: Replace with a single visual — left column "Workspace Model" with 3 bullet keywords, right column "Build Pipeline" with 3 bullet keywords, connected by an arrow. The "Makefile for your AI skills" line at the bottom is the real closer and it's getting buried.

### Slide 8 — How a Skill Gets Packaged (lines 128-149)
**Density**: Heavy but manageable. 6-row table + ASCII diagram + bold closer. The table rows are short enough to scan.
**Hierarchy**: Table first, then diagram. The diagram is the visual proof. Good ordering.
**Squint test**: Borderline PASS. Two distinct shapes (table + code block).
**Takeaway**: "Six sources converge into one compiled skill across 29 targets."
**Rendering**: The ASCII diagram is 5 lines. Should render. But the table + diagram + closer is pushing the vertical space limit.
**Fix**: Consider cutting 1-2 table rows. "Body file" and "Skill definition" could merge. "Parameter set" is the least intuitive row — either explain it better or cut it.

### Slide 9 — Problem 2 Section Break (lines 153-158)
**Density**: Good section break.
**Hierarchy**: Title, subtitle, context line.
**Squint test**: PASS.
**Takeaway**: "Skills are centralized. Now optimize them."
**Rendering**: Fine.
**Notes**: The subtitle "Nobody Is Solving the Skills Optimization Problem" parallels Problem 1's structure. Good consistency. The third line ("Skills are centralized. Now — can we make them cheaper and better?") is unnecessary. The subtitle already says it. Cut the third line or make it a provocative question that adds something new.

### Slide 10 — Because We Have a Compiler, We Can Optimize (lines 163-181)
**Density**: TOO DENSE. This is the worst offender in the deck. A 10-row table with technical jargon in every cell. "crush, guard, meter, probe, drift, fence" — these mean nothing to an audience hearing them for the first time. "P/U/I effect lattice" — meaningless without context. "MCKP solver" — acronym without expansion.
**Hierarchy**: Fails completely. The table is a wall. The bold closer at the bottom ("50% reduction, $108/month saved") is the only thing that matters — and it's buried.
**Squint test**: FAIL. One massive table block.
**Takeaway**: "The compiler has 10 optimization subsystems that achieve 50% token reduction."
**Rendering**: 10-row, 2-column table in PPTX will be a wall of small text. Nobody in a room will read this.
**Fix (critical)**: This slide needs radical surgery. The audience cares about the RESULT (50% reduction, $108/month), not the 10 subsystems. Option A: Lead with the result ("2,400 to 1,200 tokens. 50% reduction. $108/month saved per skill.") and show 3-4 of the most impressive subsystems as supporting evidence. Option B: Replace the table with a before/after visual. The detail can go in the appendix. As-is, this slide will lose the room.

### Slide 11 — PRESS: Line Justification for Token Budgets (lines 185-202)
**Density**: Heavy but structured. The analogy (word processor justification) is doing heavy lifting and earns its space. The 6-row table is dense but each row is short.
**Hierarchy**: The analogy paragraph is the hook. Table is the detail. Bold closer anchors.
**Squint test**: Borderline PASS. Paragraph + table + paragraph.
**Takeaway**: "PRESS allocates token density per-stage, per-task-type — like text justification for budgets."
**Rendering**: The L0-L5 table will render OK. Quality percentages are scannable.
**Notes**: The analogy is excellent. "A word processor justifies text to fit a column width. PRESS justifies skills to fit a token budget." This is the kind of one-liner that an audience remembers. The paragraph after the table about L2 retaining different quality for code_gen vs review is the real insight — consider making that the visual instead of the L0-L5 table. Show two bars: code_gen at L2 = 85%, review at L2 = 75%. That's more memorable than 6 rows.

### Slide 12 — Competitive Compilation (lines 208-220)
**Density**: Good. One concept, one table, one result.
**Hierarchy**: The table tells the story. Bold "Winner" row draws the eye. The "0.82" score is the anchor number.
**Squint test**: PASS. Table with one highlighted row.
**Takeaway**: "Don't debate style. Compile three profiles. Let the data pick the winner."
**Rendering**: 3-row, 5-column table. Clean in PPTX.
**Notes**: Strong slide. The counterintuitive result (concise scored highest, detailed scored lowest) is sticky. The closing line "Not opinion. Measurement." is excellent. Keep this slide.

### Slide 13 — RELAX: Split the LLM Path from the Data Path (lines 224-240)
**Density**: Good. One table, one before/after comparison.
**Hierarchy**: The table is the payload. The 0-token rows are the visual proof — all those zeros are striking. The bold comparison at the bottom delivers the punchline.
**Squint test**: PASS. Table shape, then two comparison lines.
**Takeaway**: "89% token reduction by routing data work away from the LLM."
**Rendering**: 6-row, 4-column table. The "0" entries and "2ms" timings are short enough to render cleanly.
**Notes**: Good slide. The 89% number is the anchor. But "RELAX" as a name is never explained here — what does it stand for? If it's an acronym, expand it once. If it's a brand name, fine, but the audience will wonder.

### Slide 14 — Problem 3 Section Break (lines 244-249)
**Density**: Good.
**Hierarchy**: Title, subtitle, context line.
**Squint test**: PASS.
**Takeaway**: "Optimized skills still need to run business processes."
**Notes**: "Only a Few Are Onto the Workflows Challenge" — weaker than "Nobody Is Solving" from P1/P2. The hedge ("only a few") undercuts the pattern. Consider: "Nobody Is Solving the Workflow Orchestration Problem" for consistency. Or if the hedge is intentional (because LangChain/CrewAI exist), make the distinction sharper: "Frameworks Orchestrate Code. Nobody Orchestrates Skills."

### Slide 15 — The Pipeline Extends: FORMA + Workflows + Governance (lines 253-273)
**Density**: Right amount. 3-row table + code block + bold closer.
**Hierarchy**: Table establishes the three extensions. Code block shows it in action. The import/build output numbers are concrete proof.
**Squint test**: PASS. Table, code block, closer — three distinct shapes.
**Takeaway**: "The pipeline now covers import, orchestration, and governance."
**Rendering**: The code block is 6 lines. The fidelity percentages (35% to 100%) are a nice touch.
**Notes**: Solid slide. The "12 rules to 8 skills, 3 roles, 1 policy" is a great concrete transformation. Keep.

### Slide 16 — A Real Workflow: Prose In, Governed Pipeline Out (lines 277-296)
**Density**: The markdown code block is 15 lines. That's a lot of code on one slide. But it's readable prose, not actual code, so the cognitive load is lower.
**Hierarchy**: The code block IS the slide. Eye enters at "Customer Intake Pipeline" and reads down.
**Squint test**: Borderline PASS. One big code block.
**Takeaway**: "Write business processes in prose. The compiler validates them."
**Rendering**: 15-line markdown block in monospace will be small in PPTX. The indentation and bold markers help scanability, but this is pushing the readability limit for a projected slide.
**Fix**: Consider trimming to 2 stages instead of 3. Stages 2 and 3 both have gates — showing one gate is enough for the concept. This also saves 5 lines of vertical space.

### Slide 17 — The Pipeline Dispatches It (lines 300-312)
**Density**: Good. One table, one summary line.
**Hierarchy**: Table tells the execution story. The "Pipeline complete" line with totals is the closer.
**Squint test**: PASS. Table + summary.
**Takeaway**: "3 stages, 2 gates, 3 models — compiled from prose, executed with budget enforcement."
**Rendering**: 3-row, 6-column table. The column count is high but each cell is short (numbers). Should render.
**Notes**: Good companion to slide 16. The pair works well — prose in (slide 16), execution out (slide 17). The "sha256:f7e2a1..." hash is a nice governance touch. The bold closer "Roles. Gates. Multi-model. Budget per stage. Audit trail. From prose." is punchy. Keep.

### Slide 18 — Fleet: One Human, Fifty Agents (lines 316-333)
**Density**: Good. CLI output as visual proof. The code block is 12 lines but readable.
**Hierarchy**: The status table inside the code block draws the eye. The approve/reject commands below show the interaction model.
**Squint test**: PASS. One big code block.
**Takeaway**: "Fleet gives one human supervisory control over many agents."
**Rendering**: 12-line code block. Should fit. The "Six graduated intervention levels" line below is dense but short.
**Notes**: Nearly identical to the overview deck's Fleet slide (lines 297-315 there). The overview version has slightly more detail. This version is tighter. Good.

### Slide 19 — Guard: Governance at Compile Time (lines 337-362)
**Density**: Heavy. Three CLI blocks (check, budget, comply). Each is meaningful but together they're a lot.
**Hierarchy**: The three blocks create natural sections. The `guard check` error messages are the most vivid.
**Squint test**: Borderline PASS. Three stacked code blocks are distinguishable from a wall of text, but just barely.
**Takeaway**: "Guard catches policy violations, tracks budgets, and generates compliance records — before deployment."
**Rendering**: Total code lines: ~18. This is too many lines of monospace for one PPTX slide. The `guard comply eu-ai-act` block will be very small text.
**Fix**: Cut one of the three blocks. The `guard check` block is the strongest (concrete violations). The `guard budget` block has the progress bar visual. The `guard comply` block is the weakest — "12/12 passed" is less vivid. Move `comply` to the appendix or to a one-line mention below the code blocks.

### Slide 20 — The Progression: One Pipeline, Built in Three Steps (lines 366-378)
**Density**: Right amount. 3-row table mapping problems to pipeline stages.
**Hierarchy**: Table is the visual. The pipeline strings in the right column show progressive growth.
**Squint test**: PASS. One table.
**Takeaway**: "Each problem adds to the same pipeline. Can't govern what you can't compile."
**Rendering**: The pipeline strings (`skill.md -> compile -> eval -> deploy...`) are long in the P3 row. May wrap in PPTX at smaller font sizes. Test this.
**Notes**: Excellent recap slide. The logical chain ("Can't optimize what you can't compile. Can't orchestrate what you can't optimize.") is the kind of structure executives remember. Keep.

### Slide 21 — Nobody Covers All Three Columns (lines 382-397)
**Density**: Moderate. 7-column comparison matrix.
**Hierarchy**: The CRAFTWORKS row at the bottom with all bold Y's is the visual anchor. Eye scans down the column to see the contrast.
**Squint test**: PASS. Table with one highlighted row at the bottom.
**Takeaway**: "Nobody else occupies the intersection of compile + optimize + govern."
**Rendering**: 7 columns is wide for PPTX. The single-character entries (Y, ~, -) keep cells small, which helps. But 7 column headers need to be readable.
**Fix**: Consider reducing to 5 columns by merging related capabilities. "Compile + Cross-platform" could be one column ("Multi-target Compile"). "Budget + Boost" could be one column ("Optimization"). This would make the matrix more scannable and less like a feature checklist.
**Notes**: The italic disclaimer at the bottom ("Maturity varies -- see roadmap") is honest and important. Keep it.

### Slide 22 — Closing Title (lines 401-410)
**Density**: Perfect for a closer.
**Hierarchy**: Two large lines, then a bold tagline.
**Squint test**: PASS.
**Takeaway**: "Build on a platform that absorbs change, or rewrite every time."
**Rendering**: Title class. Clean.
**Notes**: Strong closer. Mirrors the tension from slide 1. "Compile, optimize, govern" is a tight three-word summary of the entire deck. The only weakness: "The landscape is accelerating" is a weaker opening line than the title slide's "The AI skills landscape is chaos." Consider tightening to match the opening's energy: "The landscape is chaos. It's accelerating." or similar.

### Slide 23 — Which Business First? (lines 413-424)
**Density**: Good. 4-row table with three columns of judgment.
**Hierarchy**: Table is clear. The "Go-to-market risk" column is the most interesting (it's honest about weaknesses).
**Squint test**: PASS.
**Takeaway**: "The platform is the moat, but the entry point matters for go-to-market."
**Rendering**: 4-column table with longer text cells. "Feature, not product -- hard to monetize alone" is the longest cell. Should fit with small class.
**Notes**: This is a facilitation slide, not a presentation slide. The HTML comment at the bottom confirms this. Excellent for a strategy meeting. The "pause here" facilitation note is smart. In the PPTX output, the HTML comment won't render, so the presenter needs speaker notes. Consider adding a visible facilitation prompt: "Discussion: which row describes your current pain?"

### Slide 24 — Next Steps (lines 428-436)
**Density**: Light. 5-row navigation table.
**Hierarchy**: Simple. Each row is a path.
**Squint test**: PASS.
**Takeaway**: "Here's where to go next depending on your interest."
**Rendering**: Clean.
**Notes**: Standard wayfinding slide. Nothing wrong. The deck names (Craftworks Overview, Guard Pitch, etc.) should be hyperlinked if the PPTX format supports it.

### Slide 25 — Appendix Title (lines 442-443)
**Density**: Fine.
**Notes**: Standard appendix break.

### Slide 26 — FORMA: Any Format In, Any Format Out (lines 447-458)
**Density**: Light. Code block + one-liner.
**Hierarchy**: Code block dominates.
**Squint test**: PASS.
**Takeaway**: "Import from any harness, export to all."
**Notes**: Good appendix slide. Expands on the FORMA mention in slide 15.

### Slide 27 — Dreaming: Skills That Maintain Themselves (lines 462-473)
**Density**: Good. 4-row table with clear agent type / action / example.
**Hierarchy**: Table is the payload. The eval gate description below is the policy statement.
**Squint test**: PASS.
**Takeaway**: "Autonomous agents detect drift and propose fixes, gated by eval scores."
**Notes**: Good appendix material. The "Roadmap: planned for v5.2" disclaimer is important.

---

## Strongest Slides (don't touch)

1. **Slide 1 (Title)** — The provocation hook is better than the overview deck's opener. "It's accelerating. Nobody is solving the foundational problems." creates tension.
2. **Slide 4 (Today: Every Step Is Ad Hoc)** — Perfect density. The 4-row table with "What's missing" as the punchline column is textbook.
3. **Slide 12 (Competitive Compilation)** — Counterintuitive result (concise beats detailed). Clean table. "Not opinion. Measurement." is a memorable closer.
4. **Slide 20 (The Progression)** — The logical chain recap is the structural backbone of the deck. Executives will remember "can't optimize what you can't compile."
5. **Slide 17 (Pipeline Dispatches It)** — Prose-in/execution-out pair completes the workflow story with concrete numbers.
6. **Slide 22 (Closing Title)** — Mirrors the opening tension. "Compile, optimize, govern" is a tight tagline.

---

## Slides Needing Work (specific fixes)

### Critical (will lose the room as-is)

1. **Slide 10 (Because We Have a Compiler, We Can Optimize)** — 10-row table of jargon. The $108/month and 50% reduction are buried at the bottom. Lead with the result. Show 3 subsystems max. Move the rest to appendix. This is the single highest-priority fix.

2. **Slide 5 (Same Skill, Five Formats)** — Two competing tables. Split into two slides or cut the tool-name translation table to appendix. One visual per slide.

3. **Slide 7 (Two Control Surfaces)** — Two 5-row tables. Unreadable from back of room. Either split into two slides or collapse to a visual with 3 keywords per column.

### High Priority (hurts flow or readability)

4. **Slide 19 (Guard)** — Three CLI blocks are too much. Cut `guard comply` to a one-liner or move to appendix. Keep `guard check` and `guard budget`.

5. **Slide 14 (Problem 3 Section Break)** — "Only a Few Are Onto the Workflows Challenge" breaks the "Nobody Is Solving" pattern from P1/P2. Either commit to the pattern ("Nobody Is Solving the Workflow Orchestration Problem") or sharpen the distinction.

### Minor

6. **Slide 11 (PRESS)** — The analogy is great but the L0-L5 table is 6 rows. Consider replacing with a 2-bar visual showing per-task-type quality differences at the same density level. That's the actual insight.

7. **Slide 16 (Real Workflow)** — 15-line code block. Trim to 2 stages instead of 3. One gate is enough to make the point.

8. **Slide 21 (Comparison Matrix)** — 7 columns is wide. Merge related capabilities into 5 columns for readability.

---

## Pacing Assessment

**At 2 min/slide (20 core slides)**: 40 minutes. This is a full meeting slot.

**Where it drags**:
- Slides 5-8 (the P1 deep dive: formats, targets, control surfaces, packaging) are four consecutive heavy slides with tables. The audience gets table fatigue. After the strong setup in slides 2-4, the deck over-explains P1. Consider cutting slides 7 or 8 — the "Two Control Surfaces" slide is reference material, not presentation material.

**Where it breathes well**:
- The three section breaks (slides 3, 9, 14) provide natural pause points.
- The closing sequence (slides 20-22: progression, comparison, closer) builds momentum well.

**Where the pacing is best**:
- P2 (slides 10-13) is the tightest section — 4 slides covering optimization, PRESS, competitive compilation, and RELAX. If slide 10 is fixed, this section will be the strongest.
- P3 (slides 15-19) tells a complete story: pipeline extends, workflow example, execution, fleet, guard. Good narrative arc.

**Structural suggestion**: The deck spends 7 slides on P1 (toolchain), 4 on P2 (optimization), and 5 on P3 (workflows). P1 is over-weighted. Cut 1-2 P1 slides (likely slide 7 or 8) to balance the three problems more evenly at 5-5-5.

---

## Comparison to Overview Deck

**The why-craftworks deck is the better opener.** Here's why:

| Dimension | Why-CraftWorks | Overview |
|-----------|----------------|----------|
| **Hook** | Provocation ("chaos, accelerating, nobody solving") | Value prop ("write prose, compiler validates") |
| **Structure** | Problem-first (3 problems, then solutions) | Feature-first (here's what we built) |
| **Audience** | Exec-friendly at top, architect underneath | Architect-friendly throughout |
| **Pacing** | Builds tension, then resolves | Linear feature walkthrough |
| **Depth** | Selective — shows enough to prove, not everything | Comprehensive — every subsystem gets a slide |

**Where the overview is still better**:
- **CREST model** (overview slide 8): The 12-file workspace model is explained more clearly. The why-craftworks deck references "program.yaml" and "craft.json" but never explains the CREST model by name. If the audience asks "what does the workspace look like?", the overview answers that better.
- **Roles** (overview slides 19-20): The OLE role model and its compilation to agents is better developed in the overview. The why-craftworks deck never touches roles.
- **SDK architecture** (overview slide 22): Not in the why-craftworks deck at all. Correctly omitted for the exec audience, but worth noting.

**Where why-craftworks surpasses the overview**:
- **Opening**: The overview opens with a value prop. Why-craftworks opens with a problem. Problem-first is always stronger for a cold audience.
- **Competitive framing** (slide 21): The comparison matrix doesn't exist in the overview. This is critical for exec conversations.
- **Go-to-market discussion** (slide 23): The "Which Business First?" facilitation slide is unique to this deck and exactly right for a strategy meeting.

**Verdict**: Use why-craftworks as the opener for all first meetings. Hand off to the overview for deep dives and technical audiences. The "Next Steps" slide (24) already creates this handoff.

---

## Top 3 Highest-Impact Changes

### 1. Fix Slide 10 (Optimization Wall of Jargon)

This is the single change that will most improve how the deck lands. The audience cares about "50% token reduction, $108/month saved per skill." They do not care about "P/U/I effect lattice" or "MCKP solver." Lead with the result in large text. Support with 3 examples of HOW (e.g., "dead code elimination," "density-level allocation," "delta compression"). Move the 10-row subsystem catalog to the appendix. This is a 2-minute fix that transforms the weakest slide into a strong one.

### 2. Split Slide 5 (Two Competing Tables) and Cut Slide 7 (Reference Material)

Slide 5 needs splitting (one table per slide). Slide 7 (Two Control Surfaces) is reference material — it tells the audience everything program.yaml and craft.json can do, but nobody in a room absorbs 10 rows of configuration options. Replace with a single visual: "Workspace Model (program.yaml) -> Build Pipeline (craft.json) -> 29 Targets" and move the detail to a slide in the appendix. Net effect: the P1 section loses its table fatigue problem and the deck tightens by one slide.

### 3. Strengthen the Closing (Slide 22) to Mirror the Opening (Slide 1)

The opening is the deck's best line: "The AI skills landscape is chaos. It's accelerating. Nobody is solving the foundational problems." The closing (slide 22) should complete that arc with the same energy. Currently it says "The landscape is accelerating" — which is weaker than the opener. Rewrite to: "The AI skills landscape is chaos. It's accelerating. Now you have the platform that absorbs the change." Then the tagline: "CraftWorks: compile, optimize, govern." This creates a bookend structure where the closer resolves the tension the opener created.

---

## Verdict

This is a **strong deck with 3-4 slides that need surgery.** The structural choice (three problems, progressive pipeline, competitive framing) is correct. The opening hook is excellent. The pacing works once the table-heavy slides in P1 are fixed. The facilitation slide (23) and the handoff slide (24) show that the author understands how this deck lives in a meeting flow, not just as a standalone artifact.

The overview deck is a better *reference*. This deck is a better *opener*. That's the right division of labor.

Fix slide 10 first. Split slide 5 second. Tighten slide 7 third. Then this deck is ready for a room.
