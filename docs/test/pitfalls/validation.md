---
covers: [atom:TXA/min-count, atom:TXN/homoglyph]
---

# Pitfalls: validation

## Min-count cluster

### P-01 · Hidden files counted

**Scenario**: Series dir has 3 real files + `.DS_Store` (macOS
metadata). Min-count reports 4 files, not 3.

**Consequence**: operator's "one more scenario needed" impression
is actually wrong — they already have 3.

**Fix**: the runner filters out filenames starting with `.` before
counting. `.DS_Store`, `.gitkeep`, etc. don't count. Real scenarios
start with an alphabet character.

### P-02 · Directory bump without manifest update

**Scenario**: Operator adds a 4th scenario to WSP which was
previously min: 3. Manifest still says `min: 3`.

**Consequence**: accept-runner passes (still meets min). But
operator intended `min: 4` to prevent regression.

**Fix**: treat manifest as source of truth. If you add scenarios
intending them to be required, bump the min in the SAME commit.

### P-03 · Min higher than content

**Scenario**: manifest says `min: 5`, series dir has 3 files.

**Consequence**: BLOCK until 5 scenarios exist. Healthy signal —
operator sees the gap and writes the missing scenarios.

**NOT a pitfall, but worth noting**: this is WORKING AS DESIGNED.

## Homoglyph cluster

### P-04 · Cyrillic-a slip

**Scenario**: developer copies a quote from a word processor into
docs. The word processor's auto-correct converted "craftworks" to
`crаftworks` (Cyrillic а).

**Consequence**: to human eyes it reads "craftworks". Literal-string
match MIGHT miss it (depends on fold setting).

**Fix**: the homoglyph check NFKC-normalises + ASCII-folds before
comparing. The Cyrillic а becomes Latin 'a', matches the literal,
flagged.

### P-05 · BOM-prefixed string

**Scenario**: `﻿craftworks` (BOM-prefixed).

**Consequence**: literal-substring search MIGHT miss if it anchors
on ASCII 'c'.

**Fix**: the scanner strips BOM before content scan. Any file
starting with BOM is normalised first.

### P-06 · Allowlist bypass attempt

**Scenario**: Developer adds `packages/claws/**` to the allowlist
to "get things passing". Every claws source file now skips the
gate.

**Consequence**: entire package unchecked — defeats the gate's
purpose.

**Fix**: reviewer signoff on allowlist changes. Blanket patterns
like `packages/claws/**` are review smells — reject.

### P-07 · Upper-case ASCII

**Scenario**: Code contains `CRAFTWORKS`.

**Fix**: literal-match is case-insensitive. `CRAFTWORKS`,
`CraftWorks`, `craftworks` all match.

### P-08 · Path ambiguity

**Scenario**: Documentation mentions that some file lives at
`c:\src\craftworks\docs\...`. This is a literal path; is it a leak?

**Consequence**: flagged as BLOCK.

**Fix**: either (a) change the doc to use a relative path or
project name, or (b) if it genuinely must reference the
craftworks path (e.g., explaining cross-repo migration), add the
exact doc file to the allowlist with rationale.
