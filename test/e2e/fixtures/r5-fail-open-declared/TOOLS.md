# r5-fail-open-declared fixture — TOOLS

Intentionally-invalid fixture for SC-07: declares a tool that combines
`riskTier: R5` with `failOpen: true`. `claws policy generate` must reject
this at compile time per proposal §1.6 (R5 requires fail-closed semantics).

The header for `send-email-failopen` sits at line 12, column 5 so the
generator's R5FailOpenDiagnostic cites `TOOLS.md:12:5` exactly.

## Tools

### send-email-failopen # R5, COMMUNICATE, IRREVERSIBLE_EXTERNAL, failOpen

An R5 tool with `failOpen: true` — rejected at generate time.
