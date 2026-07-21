# Signals foundation comparison

## Decision

Foundation slices 1 and 2 justify a shared contributor review pattern, but no
shared runtime or test helper.

## Comparison

| Boundary | Telegram draft delivery | Codex native tool results | Shared conclusion |
| --- | --- | --- | --- |
| Semantic owner | Telegram draft delivery | Codex-native tool runtime | Keep owner-local. |
| Authoritative boundary | Active draft stream stops after missing message id | App-server command/file completion | Test the exact owner transition. |
| Machine identity | Existing diagnostic type plus bounded error category | Existing structured result status and exit code | Preserve native owner fields; do not normalize into a shared envelope. |
| Projection | Trusted diagnostic event | Existing `after_tool_call` hook | Use the existing consumer matching the fact. |
| Correlation | Session and trusted trace context | Tool-call ID, run/session, cwd, channel | Preserve existing IDs; do not fabricate a common correlation object. |
| Privacy | Omit chat, content, token, raw response, exception | Keep result private to the hook; bound output; do not promote to diagnostics | Review public/private boundaries per projection. |
| Compatibility | Existing event family and open bounded category | Existing tool name, args, context, middleware behavior | Prove old consumer behavior locally. |
| Exactly once | Active generation only; fallback is a separate attempt | Join completion and PostToolUse; MCP remains relay-owned | Prove retries, supersession, and competing producers explicitly. |
| Disabled/cancelled behavior | Diagnostics-disabled owner behavior is unchanged | Aborted run suppresses deferred observation | Consumer lifecycle must not rewrite owner state. |
| Deletion | Verbose-only semantic collapse | Plugin text reconstruction | Name the workaround removed. |

## Reuse, adapt, avoid

- Reuse: owner-local accepted/failure fixtures, exactly-once proof, correlation,
  privacy review, compatibility proof, evidence revision, and deletion mapping.
- Adapt: each owner uses its existing event, result, hook, context, and failure
  terminology.
- Avoid: `SignalEnvelope`, global result enum, central test suite, runtime
  registry, mandatory helper, or cross-owner package.

## PR 3 shape

Add one contributor-facing section to the existing testing guide:

- name the owner fact and authoritative transition;
- test accepted and structured failure/unknown behavior near the owner;
- prove exactly-once, correlation, privacy, compatibility, and cancellation or
  disabled-consumer behavior when relevant;
- record the exact workaround deleted; and
- keep rendering/exporter assertions secondary to owner meaning.

No code helper is justified because the two slices share no identical emission,
projection, or lifecycle mechanism.
