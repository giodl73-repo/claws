# R5 -- Typesetter (Table Design) Review

**Reviewer**: table-design subrole of typesetter  
**Artifact**: `docs/presentations/why-craftworks.md`  
**Date**: 2026-04-08  
**Scope**: Every table in the deck -- dimensions, 5-second test, header clarity, cell density, PPTX rendering

---

## Table-by-Table Audit

### T1. "Today: Every Step Is Ad Hoc" (lines 46-51)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 4 rows x 3 columns |
| **5-second test** | PASS -- scan left column for step names, right column tells you what's broken |
| **Header clarity** | Good. "Step / What teams do / What's missing" tells the full narrative arc |
| **Cell density** | Short, scannable. Longest cell is ~40 chars ("No cross-ref check, no diagnostics") |
| **PPTX rendering** | Fits comfortably. 3 columns, 4 data rows -- ideal table dimensions |

**Verdict**: Clean. No changes needed.

---

### T2. "Same Skill, Five Formats" (lines 60-64)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 3 rows x 6 columns (row-header + 5 platforms) |
| **5-second test** | FAIL -- the visual density is high and the empty first header cell makes the orientation unclear at a glance. The reader must study the column headers to understand this is a platform comparison |
| **Header clarity** | Weak. Headers are just platform names. They don't tell you "these are what change per target." The first column header is blank |
| **Cell density** | Too dense. "`.github/*.prompt.md`" and "`AGENTS.md` + `SKILL.md`" are long code fragments. "SKILL.md meta" vs "SKILL.md + TOML" requires close reading |
| **PPTX rendering** | PROBLEM -- 6 columns with code-formatted paths will overflow at standard font sizes. Marp will shrink text to ~10px or clip. At 1280px slide width, each column gets ~200px -- code paths will wrap or truncate |

**Issues**:
1. Line 60: blank first-column header -- fill with "Aspect" or "Layer" for orientation
2. Lines 62-64: code paths in cells are too long for 6-column layout. Consider abbreviating (e.g., `.claude/skills/` instead of `.claude/skills/SKILL.md`) or switching to a 2-column layout (Platform | Convention) with rows per platform
3. 6 columns is at the upper limit. With 3 rows the table is wider than it is tall -- it reads like a spreadsheet

**Recommendation**: Either reduce to 4 columns (drop Codex and Gemini into a footnote since they are the least established) or transpose to a vertical layout (platforms as rows, aspects as columns -- 5x4 instead of 3x6).

---

### T3. "Every Platform Speaks a Different Language" (lines 74-80)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 5 rows x 6 columns |
| **5-second test** | PASS -- left column lists capabilities, scan across to see fragmentation. The `*(prose)*` entries in Cursor column are immediately visible as "different" |
| **Header clarity** | Good. "Capability" + platform names is self-explanatory |
| **Cell density** | Acceptable. Most cells are 1 word or tool name. `Grep`, `Glob` is the densest at ~12 chars |
| **PPTX rendering** | MARGINAL -- 6 columns again, but cells are short (single tool names). Should render if font stays >= 14px. The `*(prose)*` italic markers may not render in all Marp themes |

**Issues**:
1. Line 74: first column header "Capability" is good but "What you need" would tell the story better
2. Line 80: `--` for "absent" is inconsistent with *(prose)* for "no named tool." Consider a legend or consistent notation

**Verdict**: Works but is at the width limit. Acceptable if font is constrained to >= 14px.

---

### T4. "A Makefile for Your AI Skills" (lines 111-117)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 4 rows x 3 columns |
| **5-second test** | FAIL -- the two column headers are file names (`program.yaml`, `craft.json`) which don't convey meaning to someone unfamiliar with the system. The rows (Controls, Skills, Organization, Quality, Targets) are clear, but the cells use em-dashes for "N/A" which forces the reader to decode absence |
| **Header clarity** | Weak. "program.yaml" and "craft.json" are implementation details, not narrative. Better: "Workspace Model (program.yaml)" and "Build Pipeline (craft.json)" -- the parenthetical is the detail, the lead is the concept |
| **Cell density** | Mixed. "What your workspace IS" is great. "Build units, dependency DAG" is jargon-heavy for a pitch deck |
| **PPTX rendering** | Fits well. 3 columns, 5 data rows (including the "Controls" row as a sub-header row). Comfortable |

**Issues**:
1. Line 111: blank first-column header -- needs "Layer" or "Concern"
2. Lines 111-112: headers should lead with concept, not filename
3. Line 116: "Build units, dependency DAG" -- "DAG" is engineer jargon; "build order" or "dependency chain" for a pitch audience

---

### T5. "How a Skill Gets Packaged" (lines 127-134)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 6 rows x 2 columns |
| **5-second test** | PASS -- simple lookup table. Source on left, contribution on right. Instant scan |
| **Header clarity** | Excellent. "Source / What it contributes" -- clear and narrative |
| **Cell density** | Good. Longest cell is "Machine-enforced rules (`no self-approval`, `receipt > $25`)" at ~55 chars. Acceptable for 2-column layout |
| **PPTX rendering** | Excellent. 2 columns with generous width. Will render cleanly at any reasonable font size |

**Verdict**: Best table in the deck for scannability. No changes needed.

---

### T6. "Because We Have a Compiler, We Can Optimize" (lines 164-168)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 3 rows x 3 columns |
| **5-second test** | PASS -- optimization name, mechanism, savings. Clear triad |
| **Header clarity** | Good. "Optimization / How it works / Savings" tells the story |
| **Cell density** | PROBLEM -- "How it works" cells are long. "43 IR passes eliminate redundancy, merge similar sections" is 60+ chars. "PRESS solver picks the optimal compression level per stage, per task type" is 70+ chars. These will wrap in a 3-column layout |
| **PPTX rendering** | Middle column will dominate width. The "Savings" column ("3 greeting variants -> 1 parameterized") is also long. Risk of text wrapping making the table 8+ visual rows instead of 3 |

**Issues**:
1. Lines 165-167: "How it works" cells need to be halved in length. Use the body text below for explanation -- the table should be the hook, not the full explanation
2. Line 165: "3 greeting variants -> 1 parameterized" belongs in "How it works," not "Savings." Savings should be a number: "~40%" or "3:1 reduction"

**Recommendation**: Shorten "How it works" to < 30 chars each. Move detail to surrounding prose.

---

### T7. "PRESS: Line Justification for Token Budgets" (lines 182-189)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 6 rows x 3 columns |
| **5-second test** | PASS -- level number increases, quality decreases. The gradient is immediately visible |
| **Header clarity** | Good. "Level / Quality / What happens" -- though "What happens" is vague. "Technique" or "Method" would be sharper |
| **Cell density** | Acceptable. Most cells are short. "LLM-assisted summarization" (25 chars) and "Aggressive truncation (penalized -- L3 is a dead zone)" (50 chars) are the extremes. The L3 parenthetical is too long |
| **PPTX rendering** | Good. 3 columns, 6 rows. The percentage ranges in "Quality" column create a clean visual gradient. Fits standard slide |

**Issues**:
1. Line 186: "(penalized -- L3 is a dead zone)" is editorial commentary in a data cell. Move to footnote or surrounding text
2. Consider alternating row shading in Marp CSS to emphasize the L0-L5 gradient

**Verdict**: Good table. Minor trim on L3 cell.

---

### T8. "Competitive Compilation: Let the Data Decide" (lines 203-207)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 3 rows x 5 columns |
| **5-second test** | PASS -- "concise" row is bold, has highest quality score. Winner jumps out |
| **Header clarity** | Good. "Profile / Optimization / Tokens / Quality / What changed" covers the comparison axes |
| **Cell density** | Acceptable. "3 variants -> 1 parameterized" at 30 chars is the longest. Token counts are clean numbers |
| **PPTX rendering** | Good. 5 columns but only 3 data rows. Width is manageable. Bold formatting on winner row helps |

**Issues**:
1. Line 203: "What changed" header is ambiguous -- changed from what? "Optimization applied" or "Technique" is clearer
2. The bold on "concise" row is good presentation technique -- keep it

**Verdict**: Effective comparison table. Minor header tweak.

---

### T9. "RELAX: Split the LLM Path from the Data Path" (lines 219-226)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 6 rows x 4 columns |
| **5-second test** | PASS -- five rows show "0 tokens, Xms" with RELAX engine, one row shows "5,000 tokens, 4s" with LLM. The contrast is stark and immediate |
| **Header clarity** | Good. "Section / Engine / Tokens / Time" is clean |
| **Cell density** | Excellent. Most cells are 1-2 words or a number. Shortest cells in the deck |
| **PPTX rendering** | Good. 4 columns, 6 rows. Repetition of "RELAX" and "0" creates a visual pattern that works even at smaller font sizes |

**Issues**:
1. The five RELAX rows could be collapsed into "5 data operations / RELAX / 0 / 15ms total" to reduce row count. But the repetition is arguably the point -- it emphasizes how much RELAX handles. Judgment call; current form works for impact

**Verdict**: One of the strongest tables in the deck. The visual repetition *is* the argument.

---

### T10. "The Pipeline Extends: FORMA + Workflows + Governance" (lines 248-251)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 3 rows x 3 columns |
| **5-second test** | PASS -- three extensions, what they add, where they fit. Compact and clear |
| **Header clarity** | Good. "Extension / What it adds / Where in pipeline" is narrative |
| **Cell density** | Acceptable. "Import from any existing harness -- .cursor, CLAUDE.md, AGENTS.md" at 55 chars is the longest. Could trim the examples |
| **PPTX rendering** | Good. 3x3 is the ideal table size |

**Issues**:
1. Line 249: the em-dash list ".cursor, CLAUDE.md, AGENTS.md" could be trimmed to "any existing harness format" since the CLI demo below shows the same info

**Verdict**: Clean. Minor density trim possible.

---

### T11. "The Pipeline Dispatches It" (lines 295-298)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 3 rows x 6 columns |
| **5-second test** | PASS -- three pipeline stages with their execution data. The gate column is the punchline |
| **Header clarity** | Good. "Stage / Role / Model / Tokens / Time / Gate" -- each header is a distinct concern |
| **Cell density** | PROBLEM -- cells like "780 / 800" and "**92** (pass >= 80)" combine data with threshold. "1. Gather requirements" is 22 chars with the numbering. Combined with 6 columns this is tight |
| **PPTX rendering** | MARGINAL -- 6 columns with mixed content (names, numbers, gates with bold + parentheticals). At 1280px, each column gets ~200px. "Compliance Officer" at 18 chars and "**92** (pass >= 80)" at 16 chars will fit, but barely. The stage names in column 1 need the numbering prefix which adds width |

**Issues**:
1. Line 295-298: consider abbreviating roles ("Acct Mgr", "Compliance", "Risk") since the prose above already introduced the full names
2. "Tokens" column shows "780 / 800" -- the budget is useful context but doubles the cell width. Consider "780" in the cell with budget as a column header annotation: "Tokens (of budget)"
3. 6 columns is the maximum for readability. This table is at the limit

**Verdict**: Functional but dense. Would benefit from abbreviation.

---

### T12. "The Progression: One Pipeline, Built in Three Steps" (lines 357-360)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 3 rows x 3 columns |
| **5-second test** | FAIL -- the "The pipeline" column contains long inline code arrows (`skill.md -> compile -> eval -> deploy (29 targets)`) that require horizontal scanning. The progression is the point but the pipeline strings are too long to compare at a glance |
| **Header clarity** | Good. "Step / What we added / The pipeline" is clear |
| **Cell density** | PROBLEM -- the pipeline column cells are 40-70 chars of arrow-separated terms. "import -> compile -> eval -> optimize -> deploy -> workflow -> govern" is 68 chars. In a 3-column table, this column will dominate and wrap |
| **PPTX rendering** | PROBLEM -- the pipeline strings will wrap to 2-3 lines each, making the table 6-9 visual rows. The progressive-reveal effect is lost when strings wrap at different points |

**Issues**:
1. Lines 358-360: the pipeline column is doing the work of a diagram, not a table cell. Consider replacing with a stacked ASCII diagram or three progressive bullet points outside the table
2. Alternative: use backtick code blocks inside cells -- Marp may render them in monospace which helps alignment, but also increases width

**Recommendation**: Replace the pipeline column with a visual (three stacked pipelines with color-coded additions) or shorten to abbreviations: "A -> C -> E -> D" with a legend.

---

### T13. "Nobody Covers All Three Columns" (lines 372-379)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 6 rows x 8 columns |
| **5-second test** | PASS -- despite the width, the Y/~/- pattern creates an instant visual. CraftWorks row is all bold Y. Competitors are mostly dashes. The contrast is overwhelming and immediate |
| **Header clarity** | WEAK -- headers are single words (Compile, Cross-platform, Budget, Boost, DAG, Fleet, Seal). "Seal" is unclear without context. "Budget" could mean anything. The headers work for insiders but not a first-time audience |
| **Cell density** | Excellent. Single characters (Y, ~, -). Cannot be more scannable |
| **PPTX rendering** | MARGINAL -- 8 columns is a spreadsheet by the standard rubric (7+ = spreadsheet). However, with single-character cells, the actual rendered width may be acceptable. The risk is that column headers ("Cross-platform" at 14 chars) force minimum column widths that push the table past slide boundaries |

**Issues**:
1. Line 372: 8 columns violates the 3-5 ideal, 7+ spreadsheet threshold. BUT: this is a competitive matrix where width IS the argument -- "we fill all columns, they don't." This is a legitimate exception to the guideline
2. Line 372: "Seal" header needs expansion or footnote. "Compliance Seal" or "Audit" would be clearer
3. Line 372: "Cross-platform" at 14 chars is the widest header and will force column width. Abbreviate to "X-Platform" or "Multi-target"
4. Consider using checkmark/X icons instead of Y/-/~ for PPTX visual impact (Marp supports unicode)

**Verdict**: Breaks the column-count rule but earns it. The visual pattern is the slide's argument. Fix headers.

---

### T14. "Which Business First?" (lines 399-404)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 4 rows x 4 columns |
| **5-second test** | PASS -- four go-to-market options with strength and risk. The bold lead column ("Toolchain", "Optimization", "Workflows", "Full platform") is immediately scannable |
| **Header clarity** | Excellent. "Lead with... / Natural buyer / Strength / Go-to-market risk" tells the complete decision framework in the headers alone |
| **Cell density** | MARGINAL -- "Feature, not product -- hard to monetize alone" is 45 chars. "Highest ASP, regulatory tailwind" is 33 chars. These are at the upper bound for 4-column scannability but contain valuable nuance |
| **PPTX rendering** | Good. 4 columns, 4 rows. The "Go-to-market risk" column will need the most width but should fit at >= 14px font |

**Issues**:
1. Lines 401-404: "Go-to-market risk" cells contain full sentences. Shorten: "Feature, not product" (drop "hard to monetize alone" -- implied). "Requires P1 first" (drop "solved"). "Long cycle, competitive" (drop rest)
2. This is one of the most important tables in the deck (the facilitation note says to pause here). It should be the cleanest

**Verdict**: Strong strategic table. Trim risk-column cells by ~30%.

---

### T15. "Next Steps" (lines 415-420)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 5 rows x 2 columns |
| **5-second test** | PASS -- simple navigation table. "Want X? Go to Y." Instant |
| **Header clarity** | Good. "If you want... / Go to..." is conversational and clear |
| **Cell density** | Excellent. Short phrases throughout |
| **PPTX rendering** | Excellent. 2 columns, 5 rows. Cannot fail |

**Verdict**: Perfect navigation table. No changes.

---

### T16. "Dreaming: Skills That Maintain Themselves" (lines 451-456)

| Metric | Assessment |
|--------|-----------|
| **Dimensions** | 4 rows x 3 columns |
| **5-second test** | PASS -- agent type on left, action in middle, example on right. The Production/Maker split is clear |
| **Header clarity** | Good. "Agent type / What it does / Example" is narrative |
| **Cell density** | MARGINAL -- example cells are long. "rewrite greeting for claude-sonnet-4.6" (37 chars) and "migrate .cursor/rules to MDC v2 schema" (39 chars) are acceptable but at the limit for 3 columns |
| **PPTX rendering** | Good. 3 columns, 4 rows. Comfortable fit |

**Issues**:
1. Lines 452-453: "Production" appears twice in the "Agent type" column. Consider using a visual grouping (merged cells or sub-header) rather than repeating the label. Marp may not support merged cells, so a sub-header row "**Production agents**" / "**Maker agents**" could work

**Verdict**: Good. Minor grouping improvement possible.

---

## Rankings: Best to Worst

| Rank | Table | Slide | Rationale |
|------|-------|-------|-----------|
| **1** | T5 | How a Skill Gets Packaged (L127) | 2-column, 6-row, perfect density -- the platonic ideal of a slide table |
| **2** | T9 | RELAX: Split LLM from Data (L219) | Visual repetition IS the argument; 0/0/0/0/0/5000 pattern is devastating |
| **3** | T15 | Next Steps (L415) | Flawless navigation table -- no wasted space, instant comprehension |
| **4** | T1 | Today: Every Step Is Ad Hoc (L46) | Clean 3-column, 4-row grid; headers tell the full story |
| **5** | T14 | Which Business First? (L399) | Best strategic table; minor density trim needed in risk column |
| **6** | T10 | Pipeline Extends (L248) | Compact 3x3; slight density in one cell |
| **7** | T8 | Competitive Compilation (L203) | Effective winner comparison; one ambiguous header |
| **8** | T7 | PRESS Levels (L182) | Good gradient visualization; L3 cell has editorial commentary leak |
| **9** | T16 | Dreaming (L451) | Clean but "Production" repeats; grouping would help |
| **10** | T3 | Every Platform Speaks... (L74) | 6 columns but short cells save it; at the width limit |
| **11** | T6 | Compiler Optimizations (L164) | "How it works" cells are too long for 3 columns; needs halving |
| **12** | T11 | Pipeline Dispatches It (L295) | 6 columns with mixed-length content; dense but functional |
| **13** | T13 | Nobody Covers All Columns (L372) | 8 columns breaks the rule, but single-char cells + competitive matrix earns the exception; headers need work |
| **14** | T4 | Makefile for AI Skills (L111) | Headers are filenames not concepts; blank first column; jargon in cells |
| **15** | T12 | The Progression (L357) | Pipeline strings are diagrams crammed into cells; will wrap and break |
| **16** | T2 | Same Skill, Five Formats (L60) | 6 columns of code paths; blank header; will overflow in PPTX rendering |

---

## Summary of Critical Findings

**Must fix (PPTX will break or key message is lost)**:
- **T2** (line 60): 6 columns of code paths will overflow. Transpose or reduce columns.
- **T12** (line 357): Pipeline arrow strings will wrap and destroy the progressive-reveal effect. Replace with stacked diagram.
- **T4** (line 111): Filename headers don't communicate to an external audience. Lead with concepts.

**Should fix (scannability or clarity issues)**:
- **T6** (line 164): "How it works" cells need 50% trim.
- **T13** (line 372): "Seal" and "Budget" headers need expansion for external audiences.
- **T14** (line 399): Risk-column cells need 30% trim -- this is the decision slide.
- **T11** (line 295): Abbreviate roles and simplify token display.

**Nice to fix (minor polish)**:
- **T7** (line 186): Remove L3 editorial parenthetical.
- **T8** (line 203): Rename "What changed" header.
- **T3** (line 74): Consider legend for `--` vs `*(prose)*`.
- **T16** (line 452): Group Production/Maker with sub-headers.
