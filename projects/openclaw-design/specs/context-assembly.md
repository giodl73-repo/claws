# Context Assembly Facility

## Boundary

Context Assembly constructs the bounded, run-scoped model input from session
history, current prompt, bootstrap files, system instructions, hooks, tools,
memory, channel context, runtime annotations, and model limits.

It projects owner facts. It does not become the durable owner of transcripts,
memory, tools, channel messages, or model definitions.

## Core Objects

- context assembly epoch;
- restored and sanitized history;
- durable session prompt;
- model prompt;
- hidden runtime context;
- bootstrap/context files and budget analysis;
- prepared memory prompt section;
- tool projection;
- context-window information and admission decision;
- selected context engine and runtime settings.

## Current Guarantees

- Durable, model-only, hook-only, and hidden runtime prompt content are
  distinguished.
- History is sanitized and bounded before provider invocation.
- Bootstrap files have routing, injection, and size budgets.
- Memory prompt state is immutable and run-scoped.
- Context engines declare host requirements and selection mode.
- Invalid or failed engine assembly can fall back to the native pipeline.
- Context-window guards can warn or block before model work begins.

## Compaction Relationship

Compaction is a transcript transformation triggered by context pressure. It may
be context-engine-owned or use the native summarization path. Success may
produce a constrained successor session target; failure must retain the
original transcript.

## Open Gaps

- One inspectable provenance report for every included/excluded prompt input.
- Stable compatibility rules across context engines and alternate runtimes.
- Explicit privacy/trust treatment for hidden context and extension-provided
  prompt additions.
- Cost and cache consequences of each context source.

Source audit:
`../source-audit-sessions-context-memory-2026-08-01.md`.
