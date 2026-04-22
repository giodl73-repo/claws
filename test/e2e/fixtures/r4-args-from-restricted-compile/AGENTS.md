# r4-args-from-restricted-compile fixture — AGENTS

## agent: secrets-summarizer

- trustTier: R4
- declaredIntent: "Summarize RESTRICTED-classified upstream output"
- allowedTools: [summarize-secrets]

Single-tool R4 agent. Tier stays R4; the **call's** effective tier lifts
to R5 because `args_from` binds the RESTRICTED-classifier. Generator
compiles this into `policy-ir.json` (SC-05 compile-axis).
