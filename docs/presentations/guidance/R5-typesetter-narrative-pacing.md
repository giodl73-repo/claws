# R5 Typesetter: Narrative Pacing Review

**Reviewer**: Typesetter (narrative-pacing subrole)
**Target**: `docs/presentations/why-craftworks.md`
**Slide count**: 28 (56 min at 2 min/slide; 25 main + 3 appendix)

---

## Pacing Map

```
Slide  1: LIGHT   — Title. Punchy tagline, sets tone.
Slide  2: HEAVY   — Landscape. Dense grid + two paragraphs of framing.
Slide  3: LIGHT   — Problem 1 section title. Breather.
Slide  4: HEAVY   — Ad-hoc table. 4-row table + prose + bold closer.
Slide  5: WALL    — Five-format comparison. 3-col x 6-row table, dense frontmatter jargon.
Slide  6: HEAVY   — Tool-name translation. 5x6 table, requires line-by-line reading.
Slide  7: HEAVY   — 29 Targets. ASCII block + prose. Visually dense.
Slide  8: HEAVY   — Makefile. 2-col table + 3 sentences explaining progression.
Slide  9: WALL    — How a Skill Gets Packaged. Table + ASCII diagram + bold paragraph. Two ideas crammed in.
Slide 10: LIGHT   — Problem 2 section title. Breather.
Slide 11: HEAVY   — Compiler optimizations. Table + dense paragraph with 10+ metrics.
Slide 12: WALL    — PRESS solver. Table + 2 explanatory paragraphs + bold callout. Needs math intuition.
Slide 13: MEDIUM  — Competitive compilation. Clean table, simple narrative arc.
Slide 14: HEAVY   — RELAX. 6-row table + before/after comparison + summary.
Slide 15: LIGHT   — Problem 3 section title. Breather.
Slide 16: HEAVY   — Pipeline extends. Table + code block + summary paragraph.
Slide 17: MEDIUM  — Workflow prose example. Mostly a code block the audience reads.
Slide 18: HEAVY   — Pipeline dispatches. Table + summary paragraph + bold closer.
Slide 19: MEDIUM  — Fleet. Clean CLI demo. Audience reads terminal output.
Slide 20: HEAVY   — Guard. Two CLI blocks + compliance paragraph. Dense.
Slide 21: MEDIUM  — Progression recap. Clean 3-row table. Good breathing room.
Slide 22: HEAVY   — Competitive matrix. 7-col table, lots of symbols.
Slide 23: LIGHT   — Closing title. Emotional beat.
Slide 24: HEAVY   — Business discussion. 4-row strategy table + facilitation note.
Slide 25: LIGHT   — Next steps. Simple link table.
Slide 26: LIGHT   — Appendix title.
Slide 27: MEDIUM  — FORMA deep dive. Code block + one-liner.
Slide 28: MEDIUM  — Dreaming. Clean table, future-looking.
```

---

## 1. Longest Run of HEAVY/WALL Without a Breather

**Slides 4-9: SIX consecutive HEAVY/WALL slides.**

```
4: HEAVY  — Ad-hoc table
5: WALL   — Five formats
6: HEAVY  — Tool names
7: HEAVY  — 29 targets
8: HEAVY  — Makefile
9: WALL   — Skill packaging
```

This is the Problem 1 section. It is a six-slide wall of tables. The audience has no place to rest between the Problem 1 title (slide 3) and the Problem 2 title (slide 10). By slide 7 the room has stopped reading tables.

**Runner-up**: Slides 11-14 (HEAVY, WALL, MEDIUM, HEAVY) -- three of four are dense. Problem 2 is almost as bad.

---

## 2. Where the Deck Drags

- **Slides 5 + 6**: Both are "look at this comparison table" slides about format differences. The audience gets the point from one. Two in a row feels like the same slide twice.
- **Slides 17 + 18**: The workflow example (prose) followed by its dispatch (table) are conceptually one idea split across two slides. The second feels like an answer key for the first -- low energy.
- **Slides 21 + 22**: Progression recap then competitive matrix. Both are summary/positioning slides back-to-back. The audience has already been sold; two recap slides stalls momentum before the close.

---

## 3. Where the Deck Rushes

- **Slide 9 (Skill Packaging)**: Table of 6 sources + ASCII diagram + bold summary. At 2 min/slide the presenter will either skip the diagram or rush the table. This is 3-4 minutes of content in a 2-minute slot.
- **Slide 12 (PRESS)**: The MCKP solver concept, 6 density levels, per-stage quality scores, and the "dead zone" aside. This needs 3+ minutes to land. At 2 min the audience gets the table but not the insight.
- **Slide 11 (Compiler Optimizations)**: Three optimization techniques + savings math + the "30 passes, 13 context passes" paragraph. The paragraph alone has ~12 distinct claims. Presenter will speed-read.
- **Slide 2 (Landscape)**: The opening salvo. ASCII grid of 12 tools + two paragraphs + bold question. For slide 2 this is too much -- the audience is still settling in.

---

## 4. Natural "Short Version" Cut Points (20-min meeting)

A 20-min meeting supports ~10 slides. Cut strategy:

| Keep | Slide | Why |
|------|-------|-----|
| Y | 1 | Title |
| Y | 2 | Landscape (trim ASCII grid to 4 tools) |
| Y | 3 | Problem 1 title |
| Y | 4 | Ad-hoc table (the pain slide) |
| CUT | 5 | Five formats -- merge one row into slide 6 |
| Y | 6 | Tool translation (the "aha" slide) |
| CUT | 7 | 29 targets -- mention verbally |
| CUT | 8 | Makefile -- mention verbally |
| CUT | 9 | Skill packaging -- too dense for short version |
| Y | 10 | Problem 2 title |
| Y | 11 | Compiler optimizations (trim the metrics paragraph) |
| CUT | 12 | PRESS -- appendix |
| CUT | 13 | Competitive compilation -- appendix |
| CUT | 14 | RELAX -- appendix |
| CUT | 15 | Problem 3 title -- fold into slide 16 |
| Y | 16 | Pipeline extends (covers P3 thesis) |
| CUT | 17-20 | Workflow + Fleet + Guard -- appendix |
| Y | 21 | Progression recap (the "one pipeline" slide) |
| CUT | 22 | Competitive matrix -- appendix |
| Y | 23 | Closing title |
| Y | 24 | Business discussion (the conversation starter) |

**Short version**: 1, 2, 3, 4, 6, 10, 11, 16, 21, 23, 24 = 11 slides, ~22 min with discussion.

The facilitation note on slide 24 already says "If 20 min meeting, stop here" -- good. But the problem is getting *to* slide 24 in 20 minutes with the current density.

---

## 5. Top 3 Pacing Fixes

### Fix 1: Insert a breather after slide 6 to break the 6-slide wall

Add a single "what this means" slide between slides 6 and 7. Something visual -- a before/after diagram, a single quote, or a one-sentence "so what." The Problem 1 section needs an internal rest stop. Without it, slides 4-9 are a death march of tables.

Alternatively: merge slides 5+6 into one slide (both are "format differences" -- pick the stronger table) and move slide 7 (29 targets) to after slide 9 as a crescendo moment. This naturally creates breathing room.

### Fix 2: Thin slides 9, 11, and 12 -- the three worst rushers

- **Slide 9**: Move the ASCII diagram to the appendix. Keep the 6-source table only.
- **Slide 11**: Kill the "30 passes, 13 context passes" paragraph. The table already sells the point. The metrics paragraph is showing off, not persuading.
- **Slide 12**: Cut the "dead zone" aside (L3 commentary) and the final paragraph. Let the table and the "line justification" metaphor do the work.

Each of these slides has one clear idea buried under two layers of proof. Strip to one layer.

### Fix 3: Merge slides 17+18 into one slide

The prose workflow (slide 17) and its dispatch table (slide 18) are one idea. Show the prose on the left, the dispatch summary on the right (or the dispatch as a 3-line summary below the prose). This frees a slot for a breather before Fleet/Guard, which are also dense.

---

## Summary Rhythm Profile

```
Current:  L H | L H W H H H W | L H W M H | L H M H M H M H | L H L | L M M
Section:  Intro | Problem 1     | Problem 2  | Problem 3        | Close | Appendix
```

**Problem 1 is the crisis.** Six dense slides with no break. Problem 2 is passable. Problem 3 alternates better but still has no true LIGHT slide between 15 and 23.

Target rhythm: `H L H M H L H M` -- never more than 2 dense slides in a row.
