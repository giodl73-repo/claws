# R5 Typesetter: Slide Design Review

**Reviewer**: typesetter / slide-design subrole
**Artifact**: `docs/presentations/why-craftworks.md`
**Lens**: verify + simplify (one anchor per slide, squint test, density, hierarchy)

---

## Slide-by-Slide Verdicts

| # | Title | Verdict |
|---|-------|---------|
| 1 | Title slide | **PASS** -- single bold statement anchor, subtitle supports it. |
| 2 | The Skills Landscape Today | **NEEDS WORK** -- two competing anchors (ASCII grid + bold question block). The code block and the bold closing paragraph both demand first-look. Cut the prose paragraph to one line or drop the bold formatting so the grid is the sole anchor. |
| 3 | Problem 1 divider | **PASS** -- section title, no content to conflict. |
| 4 | Today: Every Step Is Ad Hoc | **PASS** -- single table anchor. Lead-in and closer are subordinate. |
| 5 | Same Skill, Five Formats | **NEEDS WORK** -- the 5-column table is dense and the columns are narrow enough that frontmatter values wrap. Cells like "SKILL.md meta" vs "SKILL.md + TOML" are indistinguishable at squint distance. Reduce to 3 representative targets (Claude Code, Copilot, Cursor) or transpose the table. |
| 6 | Every Platform Speaks a Different Language | **NEEDS WORK** -- same problem as slide 5: 5-column table with short cryptic cells. At squint distance "Read" vs "read_file" vs "(prose)" is noise. The takeaway is "the compiler translates" but the eye gets lost in the grid. Reduce columns to 3 or use a before/after diff instead of a full matrix. |
| 7 | 29 Targets -- and Growing | **PASS** -- single ASCII block anchor. The grouping (AI Coding / Agent / Eval / Emerging) reads well. Closing sentence lands. |
| 8 | A Makefile for Your AI Skills | **NEEDS WORK** -- two anchors compete: the 2-column comparison table AND the 4-line prose paragraph below it. The paragraph introduces 3 new concepts (CREST files, profiles, eval gates) that aren't in the table. Either fold those into the table or cut the paragraph to one sentence. |
| 9 | How a Skill Gets Packaged | **SPLIT** -- two distinct anchors (6-row source table + ASCII pipeline diagram) making two separate points (what goes in vs. what comes out). Split into "What Goes Into a Skill" (table) and "What Comes Out" (diagram + closing line). |
| 10 | Problem 2 divider | **PASS** -- clean section break. |
| 11 | Because We Have a Compiler, We Can Optimize | **SPLIT** -- three anchoring numbers ($108/month, 50%, $5,400/month) plus a 3-row table plus a dense paragraph listing "30 skill passes, 13 context passes, 3 optimization levels, bipartite stage split, codebook compression, cache-aware costing, pre-materialization." That paragraph is a feature dump competing with the table. Move the $5,400 payoff to its own slide or cut the enumeration paragraph. |
| 12 | PRESS: Line Justification for Token Budgets | **NEEDS WORK** -- the analogy (word processor / token budget) is the anchor but the 6-row density table plus the closing paragraph create a second anchor. The L0-L5 table is fine on its own; cut or shrink the two prose paragraphs flanking it so the table dominates. |
| 13 | Competitive Compilation | **PASS** -- single table anchor with clear winner highlight (bold 0.82). Takeaway is one sentence. |
| 14 | RELAX: Split the LLM Path from the Data Path | **NEEDS WORK** -- two anchoring number pairs compete: the per-row "0 tokens / 2ms" column AND the summary comparison "45,000 vs 5,000 tokens, 89% reduction." The per-row detail doesn't add value beyond the summary. Replace the 6-row table with a 2-row before/after (LLM-only vs RELAX) and let the 89% number be the sole anchor. |
| 15 | Problem 3 divider | **PASS** -- clean break. |
| 16 | The Pipeline Extends: FORMA + Workflows + Governance | **NEEDS WORK** -- two anchors (3-row extension table + code block with CLI output). Both say the same thing differently. Pick one. The CLI block is more visceral; drop the table or reduce it to a single inline sentence. |
| 17 | A Real Workflow: Prose In, Governed Pipeline Out | **PASS** -- single code block anchor. The markdown-as-workflow example is the point, and it dominates. |
| 18 | The Pipeline Dispatches It | **PASS** -- single table anchor with clear gate pass/fail indicators. Bold closing line reinforces without competing. |
| 19 | Fleet: One Human, Fifty Agents | **PASS** -- single CLI block anchor. The intervention levels sentence is subordinate. |
| 20 | Guard: Governance at Compile Time | **SPLIT** -- two CLI blocks (`guard check` + `guard budget`) plus a closing sentence about `guard comply`. Three distinct features on one slide. Split into "Guard: Policy Enforcement" (check block) and "Guard: Budget + Compliance" (budget block + comply line). |
| 21 | The Progression: One Pipeline, Built in Three Steps | **PASS** -- single 3-row table anchor. Clean narrative callback. |
| 22 | Nobody Covers All Three Columns | **NEEDS WORK** -- the 7-column comparison matrix is the right anchor but 7 columns is too wide; at render the Y/~/- cells will be tiny. Merge related columns (e.g., "Compile + Cross-platform" into "Compiler", "DAG + Fleet" into "Orchestration") to get to 4-5 columns max. |
| 23 | Closing title slide | **PASS** -- bold statement, no competing elements. |
| 24 | Which Business First? | **PASS** -- single table anchor with clear column structure. Facilitation note is appropriately de-emphasized in a comment. |
| 25 | Next Steps | **PASS** -- simple routing table. |
| 26 | Appendix divider | **PASS** -- clean break. |
| 27 | FORMA: Any Format In, Any Format Out | **PASS** -- single CLI block anchor. |
| 28 | Dreaming: Skills That Maintain Themselves | **PASS** -- single table anchor. Roadmap caveat is appropriately italicized. |

---

## Top 5 Fixes (Ranked by Impact)

1. **SPLIT slide 11 (Compiler Optimization)** -- Three anchoring numbers, a feature-dump paragraph, and a table all compete. This is the money slide for Problem 2 and it lands as noise. Split into "Compiler Optimization" (table + one headline number) and "The Cost Math" ($108/skill x 50 skills = $5,400/month). Highest impact because this is the ROI slide buyers will screenshot.

2. **SPLIT slide 9 (How a Skill Gets Packaged)** -- The source table and the pipeline diagram serve different purposes (composition vs. output). Splitting lets each breathe. The pipeline diagram is the "aha" visual for the toolchain story and deserves its own slide.

3. **REDUCE columns on slides 5 + 6 (Five Formats / Tool Names)** -- 5-column tables with 3-word cells are unreadable in PPTX at any reasonable font size. Cut to 3 representative targets. The point is "the compiler handles this" -- proving it for 3 platforms is as convincing as 5, and the audience can actually read it.

4. **SIMPLIFY slide 14 (RELAX)** -- The per-row "0 tokens, 2ms" detail undermines the 89% headline. Replace the 6-row breakdown with a 2-row before/after. The 89% number is the anchor; everything else should support it, not dilute it.

5. **SPLIT slide 20 (Guard)** -- Three Guard features (check, budget, comply) crammed into one slide. Each is a selling point. The `guard check` violation example is visceral on its own; `guard budget` with the progress bar is a separate visual. Give each room.

---

**Summary**: 16 PASS, 8 NEEDS WORK, 3 SPLIT. The deck's narrative arc is strong. The main pattern issue is information-dense slides where two visual anchors compete -- particularly the compiler/optimization slides (11, 14) and the multi-column comparison tables (5, 6, 22). Splitting 3 slides adds ~3 slides to the deck but each one lands harder.
