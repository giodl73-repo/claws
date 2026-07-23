# Command Catalog Pre-RFC

Status: superseded
Area: OpenClaw command inventory
Last updated: 2026-07-23

This local pre-RFC is superseded by
[RFC 0017](https://github.com/openclaw/rfcs/pull/32). The active proposal is a
read-only `openclaw commands list` / `openclaw commands inspect` inventory over
existing command-owned registries.

The discarded prototype used the broader `openclaw catalog` name and combined
command inventory with audit, summary, test-matrix, prompt, and ownerless-tool
adapters. That design is retained in Git history only; it is not normative and
must not be used as an implementation specification.

Current implementation review surfaces:

- [Foundation PR #100960](https://github.com/openclaw/openclaw/pull/100960)
- [Live node PR #104158](https://github.com/openclaw/openclaw/pull/104158)
- [Scoped prompt PR #104159](https://github.com/openclaw/openclaw/pull/104159)
- [Generated docs PR #104160](https://github.com/openclaw/openclaw/pull/104160)

The authoritative contracts, acceptance criteria, optional consumer prototypes,
and unresolved maintainer decisions now live in RFC 0017.
