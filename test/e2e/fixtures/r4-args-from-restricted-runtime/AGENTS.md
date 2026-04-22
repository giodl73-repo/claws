# r4-args-from-restricted-runtime fixture — AGENTS

## agent: chain-summarizer

- trustTier: R4
- declaredIntent: "Summarize outputs from prior tool-chain steps at runtime"
- allowedTools: [chain-summarize]

Single-tool R4 agent. The tool's input provenance is dynamic — SC-06
exercises the runtime classifier's ability to observe RESTRICTED
provenance at call-time and escalate the decision to R5 review despite
no compile-time signal.
