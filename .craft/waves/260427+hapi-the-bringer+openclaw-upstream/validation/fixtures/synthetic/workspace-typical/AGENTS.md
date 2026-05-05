---
name: typical-workspace-agent
trust: internal-trusted
sdk-version: 0.1.0
---

# Agent

The canonical "good shape" openclaw workspace. Full set of MD authoring
files + a gateway.jsonc + policy.jsonc + 2 skill subdirectories. The
substrate train should produce ZERO noisy findings against this fixture.
If it does, that's a real bug.

## Boundaries

- Don't read files outside the workspace root.
- Don't shell out to commands that aren't on the allowlisted PATH.
- Don't send messages to addresses not on the IDENTITY-declared allowlist.
- Don't escalate to R5 tools without explicit operator approval.

The canonical tool list lives in `TOOLS.md` per openclaw convention; this
file does not duplicate it. (Including a stub `## Tools` section here
triggers `starter-v0/agents/empty-tools-section` — see findings.md F-008
for the rule-strictness discussion.)
