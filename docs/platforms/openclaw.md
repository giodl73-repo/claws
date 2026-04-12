# Platform: OpenClaw

<!-- atom:platform-openclaw (C11) -->

## Overview

OpenClaw is claws's native platform. Detection is marker-file-based, zero-config mode is supported, and enforcement is full -- every governance rule compiles to executable guard code that the OC Gateway runs at invocation time. OpenClaw workspaces are the only platform where R5 fail-closed is enforced at runtime rather than emitted as advisory text.

---

## Detection

OpenClaw detection relies on the presence of a `SOUL.md` file at the workspace root. However, filename alone is insufficient. A non-OC project may use `SOUL.md` as a mission statement or manifesto, triggering a false-positive detection that would run the full governance pipeline against a non-governance file.

**Structural validation**: claws validates the content of `SOUL.md` for OC-specific keywords and structure, not just its existence. Detection confirms OC marker content before proceeding. This prevents P-236 (false-positive OpenClaw detection from non-OC SOUL.md).

**Root-only scanning**: marker file scanning is limited to the workspace root. Nested `SOUL.md` files in subdirectories do not trigger detection.

---

## Zero-Config Mode

When a valid `SOUL.md` is detected but no `claws.json` exists, claws enters zero-config mode. The compiler synthesizes default configuration values:

- Trust tier: T1 (minimum governance)
- Target platform: OpenClaw (single-platform, no ambiguity)
- Risk classification: defaults per CL-02 baseline
- OBO detection: behavioral heuristics only (no overrides)

Zero-config mode ensures that any governed OpenClaw workspace can produce a valid compilation without requiring the developer to author configuration. This supports the adoption funnel: install claws, run `claws build`, get governance.

---

## Enforcement Model

OpenClaw enforcement is full, not advisory. Guard code emitted by `claws build` is executed by the OC Gateway before every tool invocation. The enforcement chain:

| Stage | What happens |
|-------|--------------|
| Compile-time | claws validates all 9 workspace files, emits guard skills |
| Gateway load | OC Gateway loads compiled guard skills into the skill registry |
| Invocation | Guard runs before the governed tool. Pass = proceed. Fail = block. |
| Audit | Every pass/fail decision is recorded with signed timestamps |

R5 tools are fail-closed unconditionally. If the guard skill crashes, the tool invocation is blocked. This is non-configurable on OpenClaw -- the compiler refuses to emit R5 fail-open. Advisory enforcement (as used on Cursor and Copilot) is never applied to OpenClaw targets.

---

## Multi-Platform Precedence

When an OpenClaw workspace also targets other platforms (e.g., Claude Code via `claws.json` targets), OpenClaw takes precedence for enforcement decisions. The rule: highest enforcement capability wins primary selection. Since OpenClaw has full enforcement and other platforms may be advisory-only, OpenClaw is always the primary platform when present.

If the marker file and `claws.json` targets disagree (marker says OpenClaw, config says Cursor-only), claws raises a diagnostic. The developer must resolve the conflict explicitly.

---

## Scenario Sources

- **S01**: OpenClaw detection and zero-config -- structural validation, false-positive prevention
- **S01-F01**: Non-OC SOUL.md false positive (P-236)
- **S01-F07**: Auto-detected vs explicit display (note, skipped)
- Platform-detection FINDINGS-APPLIED.md: CL-01 constraints (structural validation, zero-config synthetic defaults, root-only scanning)

---

## Related Concepts

- [Cursor](cursor.md) -- advisory-only enforcement for comparison
- [Lossless Guarantee](../architecture/lossless-guarantee.md) -- claws never modifies SOUL.md
- [Tool Classification](../governance/tool-classification.md) -- R1-R5 risk levels
