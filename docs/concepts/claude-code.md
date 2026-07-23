# Platform: Claude Code

<!-- atom:platform-claude-code (C11) -->

## Overview

Claude Code is a dual-surface platform. claws emits governance to two targets: `CLAUDE.md` (natural-language instructions) and `.claude/settings.json` (structured tool permissions). This dual emission requires delimiter management for the markdown surface and merge strategies for the JSON surface. Like Cursor, enforcement is advisory -- but settings.json provides structural tool restrictions that are closer to enforceable than pure instruction injection.

---

## Detection

Claude Code workspaces are detected via the `.claude/` directory and the presence of `CLAUDE.md` or `.claude/settings.json`. Detection checks:

| Marker                  | Detection role                     |
| ----------------------- | ---------------------------------- |
| `CLAUDE.md`             | Primary content surface            |
| `.claude/settings.json` | Structured permission surface      |
| `.claude/` directory    | Directory presence (supplementary) |

When `CLAUDE.md` coexists with `SOUL.md`, both OpenClaw and Claude Code are detected. Multi-platform resolution applies: OpenClaw wins primary selection due to higher enforcement capability.

---

## Dual-Surface Emission

### CLAUDE.md

Governance instructions are injected into `CLAUDE.md` using delimiter-based section management, identical in principle to Cursor's `.cursorrules` injection:

```markdown
<!-- claws governance start -->

[generated governance instructions]
<!-- claws governance end -->
```

**Lossless guarantee**: user-authored content outside the delimiters is never modified. Delimiter collision detection prevents overwrites if the user's content contains the delimiter string. P-238 (CLAUDE.md user content overwritten by emit) is prevented by this mechanism.

### settings.json

Tool permissions are emitted as structured entries in `.claude/settings.json`. This surface supports:

- Allow/deny lists for tool access
- Permission scoping by tool name
- Schema version tracking for forward compatibility

**Merge strategy**: claws does not overwrite the entire settings.json file. It merges governance entries with existing user configuration using governance-first conflict resolution. When a user-configured tool restriction conflicts with a governance requirement, the governance restriction wins. P-239 (settings.json merge overwrites user tool restrictions) is prevented by merge-not-overwrite semantics.

**Schema version tracking**: claws records the settings.json schema version it targets. If Claude Code updates its schema, claws detects the version mismatch and warns rather than emitting incompatible JSON.

---

## Enforcement Characteristics

Claude Code enforcement is advisory for CLAUDE.md content (the LLM reads but is not bound by instructions) and structural for settings.json (tool restrictions are enforced by the Claude Code harness, not the LLM). This creates a split enforcement model:

| Surface       | Enforcement | Strength                           |
| ------------- | ----------- | ---------------------------------- |
| CLAUDE.md     | Advisory    | LLM may ignore instructions        |
| settings.json | Structural  | Harness enforces tool restrictions |

For R4-R5 tools, the settings.json surface is the primary governance mechanism. CLAUDE.md provides supplementary context but should not be relied upon for high-risk enforcement.

---

## Per-Platform OBO Context

Claude Code supports MCP tool discovery, which means the tool surface may change between builds. claws's OBO detection re-evaluates tool classification on each build, ensuring that newly discovered tools receive appropriate governance. OBO context rules are platform-specific: Claude Code's tool discovery mechanism is richer than static `.cursorrules` injection.

---

## Scenario Sources

- **S03**: Claude Code dual-surface emission
- **S03-F02**: CLAUDE.md user content overwritten by emit (P-238)
- **S03-F03**: settings.json merge overwrites user tool restrictions (P-239)
- **S03-F07**: MCP tool discovery (note, skipped)
- Platform-detection FINDINGS-APPLIED.md: CL-04 (delimiter safety, settings.json merge, schema version tracking), CL-01 (dual-surface emission)

---

## Related Concepts

- [Cursor](cursor.md) -- single-surface advisory for comparison
- [Lossless Guarantee](../architecture/lossless-guarantee.md) -- delimiter preservation
- [Tool Classification](../governance/tool-classification.md) -- risk levels and OBO
