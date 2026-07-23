# Platform: Cursor

<!-- atom:platform-cursor (C11) -->

## Overview

Cursor is an advisory-only enforcement platform. claws detects Cursor workspaces via `.cursorrules` marker files, emits governance as injected instruction sections, and defaults to T1 (minimum governance). Because Cursor's LLM may ignore injected instructions, enforcement is never guaranteed -- developers must understand that governance on Cursor is best-effort guidance, not runtime blocking.

---

## Detection

Cursor detection uses two markers:

| Marker         | Form      | Notes                                                 |
| -------------- | --------- | ----------------------------------------------------- |
| `.cursorrules` | File      | Primary detection marker                              |
| `.cursor/`     | Directory | Forward-compatible detection for future Cursor config |

Detection is case-sensitive on Linux. The `.cursor/` directory alone is detected for forward compatibility but does not override `.cursorrules`-based detection if both are present.

When Cursor is detected alongside other platforms, multi-platform ambiguity resolution applies. If no explicit target is set in `claws.json`, claws requires the developer to select a primary platform. Cursor never wins primary selection over a platform with full enforcement (e.g., OpenClaw).

---

## Advisory Enforcement

Cursor cannot execute guard code at runtime. The LLM reads `.cursorrules` as system-level instructions but is not bound by them. This creates a fundamental enforcement gap:

- **R1-R3 tools**: advisory governance is meaningful. The LLM will generally follow instructions for low-risk actions.
- **R4-R5 tools**: advisory governance is dangerous. The developer may believe high-risk tools are governed, but the LLM can ignore the instruction. P-237 (advisory platform R5 tools silently unenforced) is the critical pitfall.

claws addresses this with a prominent compile-time warning when R4+ tools are governed on an advisory platform. The warning names the specific tools and explains the enforcement gap. This warning cannot be suppressed by `--quiet`.

---

## Delimiter Injection

claws emits governance sections into `.cursorrules` using delimiter-based section management. The delimiters mark claws-managed content so that:

1. User-authored content outside delimiters is preserved (lossless guarantee)
2. Subsequent builds update only the claws-managed section
3. Delimiter collision detection prevents overwriting user content that happens to contain the delimiter string

```
# --- claws governance start ---
# [generated governance instructions]
# --- claws governance end ---
```

The delimiter format is stable across claws versions. If a user's `.cursorrules` already contains the delimiter string, claws raises a compile-time error rather than risk overwriting user content.

---

## T1 Default

Cursor workspaces default to T1 (minimum governance tier) because advisory enforcement cannot guarantee higher-tier compliance. The trust tier hierarchy for Cursor:

| Tier | Available?         | Constraint                                          |
| ---- | ------------------ | --------------------------------------------------- |
| T1   | Yes (default)      | Basic tool classification and advisory instructions |
| T2   | Yes (with warning) | Governance-aware but enforcement not guaranteed     |
| T3   | No                 | Enterprise enforcement requires runtime blocking    |

A developer can override to T2 via `claws.json`, but claws emits a warning that T2 compliance depends on LLM adherence to instructions. T3 is not available for Cursor targets.

---

## Guided Tier Selection

For developers unfamiliar with the trust tier system, `claws init` on a Cursor workspace provides guided trust tier selection. The guided flow explains the advisory enforcement limitation and recommends T1 for most use cases. If the developer selects T2, the flow explicitly states the enforcement gap.

---

## Scenario Sources

- **S02**: Cursor detection and advisory enforcement
- **S02-F05**: Advisory platform R5 tools silently unenforced (P-237)
- **S02-F08**: .cursor/ directory alone not a full marker (note, skipped)
- Platform-detection FINDINGS-APPLIED.md: CL-01 (case-sensitive matching, delimiter injection, T1 ceiling), CL-05 (advisory enforcement warning, guided tier selection)

---

## Related Concepts

- [OpenClaw](openclaw.md) -- full enforcement for comparison
- [Claude Code](claude-code.md) -- dual-surface advisory enforcement
- [OBO Boundary](../governance/obo-boundary.md) -- why R5 advisory is dangerous
