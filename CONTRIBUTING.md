# Contributing to Claws CLI

This repository incubates a portable Claw parser and harness-neutral command.
OpenClaw remains authoritative for host policy, capability consent, mutation,
provenance, and lifecycle behavior.

Discuss changes to the portable schema, cross-harness outcome contract, package
identity, or public release model with OpenClaw maintainers before implementing
them. Keep adapter changes at the process boundary; do not import harness
implementation modules into the reference parser or reproduce host policy in
the standalone CLI.

## Validate a change

Use Node.js 22.22.3 or later and pnpm 10.33.2.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm proof:pack
```

Set `OPENCLAW_CLI_ENTRY` to a compatible OpenClaw entry point to include the
real delegated dry-run proof. The proof uses disposable state and must not read
or migrate an operator's normal OpenClaw state.

Keep pull requests focused. Describe the user problem, design boundary, user
impact, and validation evidence. Enable maintainer edits.

Contributions are licensed under the MIT License in [LICENSE](LICENSE).
