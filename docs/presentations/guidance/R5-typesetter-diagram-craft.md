# R5 -- Typesetter / Diagram-Craft Review

**File**: `docs/presentations/why-craftworks.md`
**Reviewer**: diagram-craft subrole (typesetter)
**Focus**: Code blocks -- type, sizing, clarity, PPTX fit, format alternatives

---

## Inventory

The deck contains **8 code blocks** across 22 slides. Marp renders code blocks
in monospace at roughly 14-16pt in PPTX export; the safe column width is
approximately **72-76 characters** before clipping at standard 16:9 slide
dimensions with default Marp theme padding.

---

## Block-by-Block Analysis

### Block 1 -- Skills Landscape Grid (lines 21-26)

| Property | Value |
|----------|-------|
| Type | Formatted text layout (file/path listing) |
| Content lines | 4 |
| Max width | **81 chars** |
| Slide context | "The Skills Landscape Today" -- slide has 2 paragraphs above + 1 below |

**Clarify or clutter?** Clarifies. The visual scatter of filenames across a
2D grid instantly communicates "fragmentation." Prose could not do this. The
chaos *is* the message, and the layout delivers it.

**Fit?** No -- at 81 characters, line 22 will clip by 5-9 characters in PPTX
export. Lines 22-23 are the widest:
```
  CLAUDE.md            .cursor/rules/        .github/copilot-      AGENTS.md
  .claude/skills/      .cursor/rules/*.mdc   instructions.md       GEMINI.md
```
The rightmost entries (`AGENTS.md`, `GEMINI.md`) will be partially hidden.

**Alternative?** A table would destroy the visual impact. The grid layout
is the right call. Tighten the column spacing instead -- reduce inner gaps
from ~21 chars to ~16 chars. Target max width of 72 characters.

**Verdict: KEEP -- rework spacing to fit within 72 chars.**

---

### Block 2 -- 29 Targets Landscape (lines 88-101)

| Property | Value |
|----------|-------|
| Type | ASCII diagram (categorized grid with box-drawing lines) |
| Content lines | 12 |
| Max width | **77 chars** |
| Slide context | "29 Targets -- and Growing" -- heading + 1 intro paragraph above, 1 paragraph below |

**Clarify or clutter?** Clarifies strongly. The three-column categorization
(AI Coding / Agent Platforms / Eval & Marketplace) with the "EMERGING" band
at the bottom is the centerpiece of the slide. It makes the count of 29
tangible and scannable.

**Fit?** Borderline. At 77 characters, line 98 (the EMERGING separator) is
the widest at 67 chars, but line 89 (column headers) is 77 chars with
trailing spaces. The three-column layout will be tight but likely fits with
Marp's default 40px left/right padding. However, the full separator on
line 98 is 65 dashes -- if PPTX rendering adds any extra padding, it clips.

**Alternative?** A three-column table would work for the main body but lose
the "EMERGING" band as a visual break. The ASCII layout is better here.

The 12-line height is notable. Combined with the heading and flanking paragraphs,
this slide is dense but manageable because the block has generous whitespace
(line 96 is blank, the EMERGING section is visually distinct).

**Verdict: STRONG -- minor trim to ensure line 98 separator fits.**

---

### Block 3 -- Scout Namespace Compile Diagram (lines 136-142)

| Property | Value |
|----------|-------|
| Type | ASCII diagram (tree + arrow showing compilation) |
| Content lines | 5 |
| Max width | **73 chars** |
| Slide context | "How a Skill Gets Packaged" -- table above (6 rows), block below, 1 paragraph below block |

**Clarify or clutter?** Clarifies. This is the single most effective diagram
in the deck. The tree-to-arrow-to-output structure shows the compilation
flow in one glance. The tree characters communicate hierarchy; the long
arrow communicates transformation; the right side communicates output.

**Fit?** Tight. At 73 characters, this is right at the edge. Line 138 is
the widest:
```
  ├── /scout:competitors    ─────────────────────>    Auto-dispatcher
```
The long dash-arrow could lose its final characters. Shortening the arrow
by 4-5 dashes would bring it to a safe 68 characters without losing meaning.

**Alternative?** No. This diagram earns its place. A table cannot show
the tree-to-output transformation. Prose cannot show the namespace hierarchy.

**Verdict: STRONGEST BLOCK IN THE DECK -- trim arrow by ~5 chars for safety.**

---

### Block 4 -- FORMA Import CLI Output (lines 253-260)

| Property | Value |
|----------|-------|
| Type | CLI output (two commands with results) |
| Content lines | 6 |
| Max width | **50 chars** |
| Slide context | "The Pipeline Extends" -- table above (3 rows), block, 1 paragraph below |

**Clarify or clutter?** Clarifies. Two commands show import and build with
concrete numbers. The before/after fidelity percentages (35%->100%,
58%->100%) are the payoff line. The CLI format makes it feel real and
executable.

**Fit?** Yes, comfortably. At 50 characters this is well within safe bounds.
6 lines of height is compact.

**Alternative?** No. CLI output is the right format for demonstrating CLI
commands. A table would lose the command/response cadence.

**Verdict: STRONG -- no changes needed.**

---

### Block 5 -- Customer Intake Pipeline Workflow (lines 270-286)

| Property | Value |
|----------|-------|
| Type | Markdown example (prose workflow definition) |
| Content lines | 15 |
| Max width | **61 chars** |
| Slide context | "A Real Workflow: Prose In, Governed Pipeline Out" -- 1 paragraph above, nothing below (end of slide) |

**Clarify or clutter?** Clarifies, but at a cost. This is the longest single
block of its kind and sits alone on its slide as the primary content. It
demonstrates the "prose in" half of the slide's promise. The markdown
headers and bold key-value pairs are readable.

**Fit?** Width is fine at 61 chars. Height is the concern: 15 content lines
plus the paragraph above and the heading totals roughly 18-19 rendered lines.
This will fill the slide vertically but should not clip in standard Marp
16:9 with paginate enabled.

**Alternative?** The next slide (lines 293-300) shows the same pipeline as a
table with execution results. That creates a deliberate before/after pair:
"write it as prose" then "see it dispatched." Removing or shortening this
block would break the pairing. However, stage 1 could lose the blank line
after `**Budget**: 800 tokens` (line 275/276 boundary) and the block
between stages 2 and 3 (line 281/282 boundary) to save 2 lines.

The `markdown` language tag is smart -- it signals to the audience that
this is source input, not output.

**Verdict: EFFECTIVE -- consider removing inter-stage blank lines to save 2 lines of height.**

---

### Block 6 -- Fleet Status CLI Output (lines 308-321)

| Property | Value |
|----------|-------|
| Type | CLI output (three commands: status, approve, reject) |
| Content lines | 12 |
| Max width | **61 chars** |
| Slide context | "Fleet: One Human, Fifty Agents" -- heading, block, 1 paragraph below |

**Clarify or clutter?** Clarifies. This is a strong demo block. The `fleet
status` output reads like a real dashboard (workspace, status, tasks, budget,
compliance, last seen), and the two follow-up commands (approve, reject)
show the interaction model in three lines. The audience sees: "I can see
my agents, approve, and reject from a CLI."

**Fit?** Width is comfortable at 61 chars. The 12 content lines plus heading
and paragraph below puts this slide at moderate density. The blank line
after `$ fleet status` (line 310) and the blank line before `$ fleet approve`
(line 315/316) provide breathing room.

**Alternative?** Could split the status output and the approve/reject into
a table + block combo, but that would lose the unified CLI session feel.
The single block is better.

**Verdict: STRONG -- no changes needed.**

---

### Block 7 -- Guard Check + Budget CLI Output (lines 329-346)

| Property | Value |
|----------|-------|
| Type | CLI output (two commands: check, budget with progress bar) |
| Content lines | 16 |
| Max width | **58 chars** |
| Slide context | "Guard: Governance at Compile Time" -- heading, block, 1 paragraph below |

**Clarify or clutter?** Clarifies, but this is the densest code block in the
deck. 16 content lines of CLI output is substantial. The `guard check`
section (violations with fix suggestions) is strong -- it shows governance
catching real problems. The `guard budget` section with the ASCII progress
bar is a nice touch.

**Fit?** Width is fine at 58 chars. Height is the concern. With 16 content
lines, the heading, and the paragraph below (2 sentences about `guard comply`),
this slide is packed. At standard Marp rendering, it will be tight but
should fit. The slide below the block (line 348) has 1 sentence + parenthetical,
so the total is manageable.

The progress bar on line 345 is excellent visual communication:
```
  ████████████████████░░░░░░░░░░  68%
```
This is the kind of detail that makes CLI output feel real.

**Alternative?** Could split into two separate blocks (guard check / guard
budget), but that would require two slides and dilute the "Guard does both
compliance and budgeting" message. The single block is the right call.

Consider removing the blank line after `$ guard check` (line 330/331) to
save 1 line of height. The violations already provide visual separation.

**Verdict: EFFECTIVE -- consider removing 1 blank line to ease vertical pressure.**

---

### Block 8 -- FORMA Appendix CLI Output (lines 433-440)

| Property | Value |
|----------|-------|
| Type | CLI output (two commands: import, build) |
| Content lines | 6 |
| Max width | **67 chars** |
| Slide context | "FORMA: Any Format In, Any Format Out" (appendix slide) -- heading, block, 1 paragraph below |

**Clarify or clutter?** Clarifies, but this block is nearly identical to
Block 4 (lines 253-260). The differences: this one adds a `Warnings:` line
to `import` and changes `--target all` to `--target claude-code,codex,gemini`
with a slightly different output format.

**Fit?** Width is fine at 67 chars. Height is compact at 6 lines. This is
an appendix slide so density expectations are lower.

**Alternative?** Since this is the appendix deep-dive version of the
earlier slide, the overlap is intentional and appropriate. The added detail
(warnings, specific targets, file count, timing) gives the Q&A audience
more to discuss.

**Verdict: ADEQUATE -- acceptable as appendix elaboration of Block 4.**

---

## Summary Rankings

### Strongest Blocks (keep as-is or with minimal tweaks)

1. **Block 3** (lines 136-142) -- Scout namespace compile diagram. Best
   diagram in the deck. Tree-to-arrow-to-output is immediately readable.
   Only needs 5 chars trimmed from the arrow width.

2. **Block 6** (lines 308-321) -- Fleet CLI output. Clean three-command
   demo session. Good whitespace rhythm. No changes needed.

3. **Block 4** (lines 253-260) -- FORMA import CLI. Compact, punchy,
   concrete numbers. No changes needed.

4. **Block 2** (lines 88-101) -- 29 targets landscape. The categorized
   grid with the EMERGING band is visually distinctive. Minor separator
   trim only.

### Blocks Needing Rework

1. **Block 1** (lines 21-26) -- Skills landscape grid. **Clips at 81 chars.**
   Reduce column spacing from ~21 to ~16 characters. The four columns of
   filenames must all be visible; clipping the rightmost column (`AGENTS.md`,
   `GEMINI.md`, `.codex/`, `.windsurfrules`) defeats the purpose.

2. **Block 5** (lines 270-286) -- Customer intake pipeline. **15 lines is
   long for a single slide.** Remove 2 inter-stage blank lines (after line
   275 and after line 281) to bring it to 13 lines. The heading/subheading
   structure already provides visual separation between stages.

3. **Block 7** (lines 329-346) -- Guard check + budget. **16 lines is the
   longest block.** Remove 1 blank line (after line 330) to ease vertical
   pressure. The progress bar is excellent; protect it.

### No Rework Needed

4. **Block 8** (lines 433-440) -- FORMA appendix. Adequate for its role.
   Intentional overlap with Block 4 is fine in appendix context.

---

## Cross-Cutting Observations

**Width discipline**: Two blocks exceed the 72-76 char safe zone (Block 1
at 81, Block 2 at 77, Block 3 at 73). All three are on the first 5 slides
of the main content -- meaning the opening of the deck has the highest
clipping risk. Fix these first.

**Height discipline**: Blocks 5 and 7 (15 and 16 lines respectively) are
the tallest. Both are on slides that also carry heading + paragraph content.
Neither will clip with standard Marp settings, but both will look cramped
in PPTX export where font rendering may be slightly larger. The 2-3 line
savings from removing blank lines is worth it.

**No blocks that should be tables**: Every code block in this deck is the
right format for its content. The CLI outputs need to look like terminals.
The ASCII diagrams need spatial layout. The markdown example needs to show
source syntax. None would be better as tables or prose.

**No blocks that should be prose**: The closest candidate is Block 5 (the
workflow definition), but its role as the "input" half of an input/output
pair means it must remain a code block to contrast with the "output" table
on the next slide.

**Strongest visual moments in order**:
1. Block 3 (scout compile tree) -- instant comprehension
2. Block 7 line 345 (progress bar) -- visceral budget visualization
3. Block 2 (29 targets grid) -- quantity made tangible
4. Block 1 (fragmented filenames) -- chaos as visual argument
