# Snapshot Diff

<!-- atom:snapshot-diff -->

## Overview

`claws snap diff` compares two governance snapshots (or a snapshot against the current workspace) and produces a semantic governance diff. Unlike a raw JSON diff, snapshot diff understands governance semantics -- it reports changes in terms of policy impact, trust tier shifts, and rule additions or removals. This makes diffs actionable for operators who need to understand what changed and why it matters.

---

## Semantic Governance Diff

Snapshot diff operates at the governance level, not the text level. Instead of showing line-by-line file changes, it reports:

| Change Type         | Example                            |
| ------------------- | ---------------------------------- |
| Trust tier change   | T2 -> T3 (escalation)              |
| Rule added          | G-A2A-TRUST now required           |
| Rule removed        | G-OUTPUT-02 URL validation dropped |
| Threshold change    | elicitation timeout 30s -> 60s     |
| Agent added/removed | finance-bot added to AGENTS.md     |
| Tool reclassified   | send-email R3 -> R5 (OBO)          |

Raw file diffs are available via `--raw` but the default output is semantic. _(Source: snapshot-lifecycle S02-F01)_

---

## Delta-Oriented Output

Diff output is structured around deltas -- what changed -- not full state dumps. Each delta includes:

```
[CHANGED] Trust tier: T2 -> T3
  Impact: 4 tools reclassified, 2 new elicitation gates required
  Source: claws.json line 12

[ADDED] Rule: G-A2A-FLOW
  Impact: Agent data flow labels now enforced
  Source: policy.yaml line 45

[REMOVED] Override: send-invoice.obo = false
  Impact: send-invoice now treated as OBO (R5)
  Source: claws.json line 28
```

Each delta has a type (CHANGED/ADDED/REMOVED), the specific change, its governance impact, and the source file location. _(Source: snapshot-lifecycle S02-F02)_

---

## Cross-Version IR Normalization

When comparing snapshots created by different claws versions, the IR schema may differ. Snapshot diff normalizes both snapshots to a common schema before comparison:

- Fields added in newer versions are treated as "absent" in the older snapshot
- Fields removed in newer versions are ignored in the older snapshot
- Schema migration is applied transparently

Without normalization, every schema field change would appear as a spurious diff, drowning real governance changes in noise. _(Source: snapshot-lifecycle S02-F03, P-188)_

---

## Format Options

Diff output supports multiple formats via `--format`:

| Format | Flag             | Use case                       |
| ------ | ---------------- | ------------------------------ |
| Text   | `--format text`  | Terminal display (default)     |
| JSON   | `--format json`  | Programmatic consumption       |
| SARIF  | `--format sarif` | Security toolchain integration |

All formats include the same semantic information. SARIF format aligns with drift findings for unified security dashboard consumption. _(Source: snapshot-lifecycle S02-F04)_

---

## Risk-Impact Categorization

Each delta in the diff is categorized by risk impact:

| Category     | Meaning                                                            | Visual |
| ------------ | ------------------------------------------------------------------ | ------ |
| **Critical** | Security boundary change (trust tier escalation, OBO gate removal) | Red    |
| **High**     | Policy weakening (threshold relaxation, rule removal)              | Orange |
| **Medium**   | Policy tightening (new rules, stricter thresholds)                 | Yellow |
| **Low**      | Neutral changes (formatting, reordering)                           | Gray   |

Risk categorization helps operators prioritize review. A diff with 50 changes but only 2 critical ones tells the operator exactly where to focus. _(Source: snapshot-lifecycle S02-F08)_

---

## Single-Argument Form

`claws snap diff <snapshot>` (one argument) compares the named snapshot against the current workspace state. This is the most common usage -- "what changed since I saved this snapshot?"

`claws snap diff <from> <to>` (two arguments) compares two named snapshots. Directional labeling in the output makes clear which is the "from" (baseline) and which is the "to" (target). _(Source: snapshot-lifecycle S02-F06, S02-F05)_

---

## Error Handling

| Condition                | Behavior                                        |
| ------------------------ | ----------------------------------------------- |
| Snapshot not found       | Error with available snapshot list              |
| Snapshot corrupt         | Error recommending `snap verify`                |
| Both snapshots identical | Clean exit with "no governance changes" message |

_(Source: snapshot-lifecycle S02-F07)_

---

## Related Concepts

- [Snapshot Save](snapshot-save.md) -- creates the snapshots that diff compares
- [Fleet Drift](fleet-drift.md) -- drift detection uses diff semantics at fleet scale
- [Snapshot Integrity](snapshot-integrity.md) -- integrity verified before diff
