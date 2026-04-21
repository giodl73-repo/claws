# @bic/openclaw-snap

## 0.2.0 — CP-5.5 close (horus)

CLI handler bodies wired end-to-end for every snap verb. The 11 snap subcommands (`status`, `stage`, `upload`, `list-http`, `diff`, `checkout`, `promote`, `rollback`, `discard-stage`, plus `serve` + session helpers) now route through `@bic/openclaw-snap/cli-handlers` rather than stub bodies.

- Handler bodies + `--endpoint` flag wired in pulse 47.4 (70e2e383).
- End-to-end proof in pulse 47.6 (bcf54104): every snap verb exercised across 4 CP-5 fixtures in both node-bin and tsx-src spawn modes.
- Pulse 47.7 (this release) removed the pulse-36 `policy-runner` override seam in the shared e2e harness — downstream suites that consume `@bic/openclaw-snap` integration helpers now run against the real binary.

## 0.1.0

Initial @bic scope release — SnapshotStore interface + in-memory/filesystem reference impls + HTTP server (9 endpoints).
