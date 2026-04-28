# Pulse Review · Hapi the Bringer · R1

**Reviewer**: architect
**Date**: 2026-04-27
**Verdict**: APPROVE-WITH-WARNINGS

## Summary

Dispatch DAG is cycle-free; checkpoint membership is consistent; F-38 hard-dependency on adapter-audits.md § 3 is explicitly surfaced in cp-1, cp-3 checkpoints, and pulse 07 verification gates. Wave A (cp-2) and cp-3 pair structure is clean for 2-PR-concurrent opening. One HC-BLOCK identified — the 2026-04-27 restructure left stale "PR-2" wording in pulse 06's content; needs to be "PR-3."

## Findings

### HC-BLOCK (1)

1. **Pulse 06 has stale PR numbering from restructure** — `pulses\06+pr3-oc4-stripfrontmatter.md` line 16 says "Open PR-2 against github.com/openclaw/openclaw modifying..." but the 2026-04-27 restructure ("lets make B PR 2") moved this to PR-3. Multiple occurrences throughout the pulse content. **Consequence**: executor creates the wrong PR title and risks auto-close on upstream. **Suggested fix**: replace_all "PR-2" → "PR-3" in this pulse file. *(Applied 2026-04-27)*

### HC-WARN (2)

1. **Pulse 08 frontmatter under-specifies cp-3 closure** — `depends_on: [01, 04, 05, 07]` lists pulse 07 but not 06. Both pulse 06 (OC-4) AND pulse 07 (guardrails) are part of cp-3 and both must merge before cp-4 opens. Checkpoint cp-4's gate is correct; pulse frontmatter is under-specific. **Consequence**: executor might misinterpret pulse 08 as openable before pulse 06 merges. **Suggested fix**: add 06 to pulse 08's depends_on.

2. **Pulse 11 (scope-flip) depends_on incomplete** — Lists `[04, 07, 09, 10]` covering PR-1 + PR-4 + PR-6 + PR-7. Should also list `[05, 06, 08]` since PR-2 + PR-3 + PR-5 also need to be merged before scope-flip lands. Current list signals "PR-2/3/5 optional" which is false. **Suggested fix**: expand to `[04, 05, 06, 07, 08, 09, 10]`.

### HC-NOTE (3)

1. **Cross-pulse symbol coherence holds** — pulse 04 ships `@openclaw/workspace/path` exporting `parseOcUri()`/`formatOcUri()`; pulse 05 extends them; pulses 07/09/10 import from same. References look consistent.

2. **Restructure consistency** — Verified pulses 06–12 frontmatter `pulse:` integers match new file names. Pulse 06 was the only file with stale content references.

3. **Spec amendment §10a covers PR-2 properly** — URI scheme extension is documented in the spec amendment co-located with the wave. Adapter-audits guide will need to reference it.

## Strengths

- **DAG is cycle-free**: every pulse's `depends_on` resolves to earlier pulses; no forward references.
- **Checkpoint membership consistent**: pulse `checkpoint:` field matches cp-N file's `pulse_range:` for all 12 pulses.
- **F-38 hard-dependency surfaced everywhere**: pulse 01 (provides adapter-audits.md), cp-3 checkpoint gate (cites it), pulse 07 verification gate (greps for it). Multi-layer enforcement.
- **2-PR-open pacing respected**: each Wave A/B/C has exactly 2 simultaneous PRs; Wave D has 1 PR + internal pulses. No checkpoint exceeds the constraint.
- **Restructure was clean**: only one stale-content occurrence (pulse 06); the systematic frontmatter renumbering held up.
