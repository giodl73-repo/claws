## Opportunity

Direct callers and future workflow runners should not each reproduce skill resolution, policy admission, model validation, managed identity, and native child-run dispatch.

This POC extracts one canonical managed-skill dispatch boundary over OpenClaw's existing primitives.

## What this slice adds

`spawnManagedSkill` owns the shared admission path:

- resolve the requested visible skill;
- retain exact name, source, digest, and `metadata.remembers` hints;
- reject cross-agent targets and unsupported execution modes;
- apply existing model, tool, credential, sandbox, and child-session policy;
- create one managed invocation ID;
- dispatch through the existing native `sessions_spawn`/subagent path.

The existing model-facing `sessions_spawn` tool delegates to this boundary. A future runner or plugin can call the same boundary instead of copying its checks.

## Architecture boundary

This is not a workflow engine. It does not define ordered plans, expressions, retries, approvals, joins, loops, fan-out, or resume storage. It centralizes one accepted managed step so every runner receives the same OpenClaw policy and provenance.

Runner selection cannot widen execution authority. The caller still owns workflow policy and limits; the native child run still owns lifecycle and exact usage; Skill Memory still owns completed-work facts.

## Validation

Focused tests compare direct-tool and canonical-dispatch behavior for successful resolution, unavailable skills, cross-agent requests, non-background execution, allowed model forwarding, invocation identity, and memory declarations. The cumulative stack is exercised on Linux.

## POC series

- Design: [RFC 0022 — Skill Memory](https://github.com/giodl73-repo/rfcs/pull/6)
- [#97](https://github.com/giodl73-repo/openclaw/pull/97) — remember completed work
- [#98](https://github.com/giodl73-repo/openclaw/pull/98) — associate an exact managed skill run
- [#100](https://github.com/giodl73-repo/openclaw/pull/100) — recall a managed result
- [#109](https://github.com/giodl73-repo/openclaw/pull/109) — retain exact-run token usage
- [#113](https://github.com/giodl73-repo/openclaw/pull/113) — check an exact-run token limit
- **#114 — centralize managed skill dispatch**

Fork-only draft POC; not proposed upstream.
