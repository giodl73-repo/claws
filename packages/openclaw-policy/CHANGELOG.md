# @bic/openclaw-policy

## 0.2.0 — CP-5.5 close (horus)

CLI handler wiring complete. `@bic/openclaw-policy/cli-handlers` now dispatches every policy verb (`check`, `generate`, `watch`, `comply`, `test`, `sim`, `report`, `verify`, `diff`) through the library surfaces rather than stub handlers.

- Handler wiring across pulses 47.1 (generate + verify), 47.2 (check + diff + watch), 47.3 (comply + report + test + sim), and 47.5 (doctor + upgrade).
- Library-layer gaps closed in pulse 47.5.5: real `generate` fs pipeline with hash-chain audit manifest (c49840c4), SARIF/in-memory scenarios/migrator/snapshot loader (441180a2), and workspace-routed generate+watch (3a065f34).
- End-to-end proof in pulse 47.6 (bcf54104): real `claws policy generate` exercised across 4 CP-5 fixtures with dual-spawn gate (dist + source).
- Pulse 47.7 (this release) removed the pulse-36 `policy-runner` override seam — tests now spawn the real binary.

## 0.1.0

Initial @bic scope release.
