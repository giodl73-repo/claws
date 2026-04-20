# Before Claws: Zero Governance

This workspace shows the same 12 tools **before any governance is applied**. It is a standalone example -- you do not need the parent workspace to understand it.

## What does "zero governance" mean?

Without governance, every tool runs freely:

- **Any tool executes without audit.** `send-email` fires with no log entry. If something goes wrong, there is no record of what happened or why.
- **Any agent delegates without restriction.** A subagent can call `shell-exec` or `deploy-trigger` with no approval gate. The primary agent has no way to limit what its delegates do.
- **Any skill executes without elicitation.** The `email-drafter` skill can send an email the user never reviewed. There is no "are you sure?" step.

## The 12 Tools

See `TOOLS.md` in this directory. All 12 tools are listed with descriptions but **no risk tiers, no governance rules, and no audit annotations**. Compare with the parent workspace's `TOOLS.md` to see what governance adds.

## What Claws Changes

Run `claws check` on this workspace and the parent workspace side by side:

```
claws check before-claws/    -->  0 violations, 0 audit rules
claws check .                 -->  7 violations, 29 rules applied
```

The difference is governance: deny constraints that catch dangerous tool combinations, risk tiers that gate approvals, and audit trails that log every action.

## Try It

```bash
# Check this workspace (no governance = no violations)
claws check before-claws/

# Check the governed workspace (7 violations found)
claws check .

# Build both and compare the output
claws build before-claws/ --out /tmp/before
claws build . --out /tmp/after
diff /tmp/before /tmp/after
```
