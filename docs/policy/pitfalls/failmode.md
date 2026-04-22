---
covers: [atom:POI/failmode]
---

# Pitfalls: fail-mode misconfiguration

The `FailMode<R>` type is tier-keyed for a reason: some tier/fail-mode
combinations are semantically broken. This page enumerates them.

## P-01 · R5 `failMode: 'open'`

**Declaration**: a tool marked `<!-- risk:R5 -->` with
`<!-- fail-mode:open -->` (or omitting fail-mode and inheriting a
host-level `open` default).

**Consequence**: guardrail provider crash → call proceeds without
review. R5 tool is the most dangerous class; silently proceeding is
the worst possible failure mode.

**Caught at**: compile time. `FailMode<'R5'>` is the type `'closed'`
— assigning `'open'` is a TypeScript error. At runtime, the
pre-merge registry guard (see
[`guardrails/specs/GRR-runtime.md`](../../guardrails/specs/GRR-runtime.md))
rejects any policy IR with an R5 tool at `failMode: 'open'`.

## P-02 · R4 `failMode: 'closed'` WITH `review`

**Declaration**: an R4 tool with `fail-mode: closed` and `review` in
its decision table.

**Consequence**: guardrail provider outage → all R4 calls hard-block
until provider recovers. Availability impact without security gain
(companion is also down if provider is down).

**Caught at**: compile time G-24 finding. `validate()` returns
`[BLOCK] G-24: R4 tool with failMode=closed AND review: use
failMode=open and escalate`.

## P-03 · R1 `failMode: 'closed'`

**Declaration**: low-risk read tool with `fail-mode: closed`.

**Consequence**: not unsafe, but annoying — every provider outage
blocks trivial reads. Almost always a mistake.

**Caught at**: compile time G-25 finding at `severity: WARN`. Tools
sometimes intentionally use closed at R1 (e.g., reading a secret) — so
it's a warning not a block.

## P-04 · Missing fail-mode annotation

**Declaration**: a tool with no `<!-- fail-mode:... -->` annotation
at all.

**Consequence**: host default applies. Host defaults are documented
per host; relying on them is fragile across hosts.

**Caught at**: compile time G-26 finding (WARN). Recommends explicit
annotation.

## P-05 · Host override of R5

**Declaration**: host sets `failMode: 'open'` in its global config,
intending to apply only to R1-R3, but the config is unscoped.

**Consequence**: R5 tools accidentally fall-open on outage.

**Fix**: `failMode` in host config is tier-scoped — `{ R3: 'open',
R4: 'closed' }`. R5 is never configurable. Pre-merge guard rejects
any policy IR that attempts R5 `'open'`.
