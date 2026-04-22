# r4-fail-open-slow fixture — AGENTS

## agent: leak-summarizer

- trustTier: R4
- declaredIntent: "Summarize an arbitrary input; provenance unknown until runtime"
- allowedTools: [summarize-leak]

Single-tool R4 agent. The runtime classifier inspects each call's
provenance and escalates to R5 when RESTRICTED. The agent itself is
tier-unchanged; the **call's** effective tier is what moves.
