# @bic/claws-cli

## 0.37.0 — CP-5.5 close (horus)

Package-contract change: the shipping `claws` binary now routes every policy and snap verb through the real `@bic/openclaw-policy/cli-handlers` + `@bic/openclaw-snap/cli-handlers` library surfaces. No more stub handlers.

- `claws policy {check,generate,watch,comply,test,sim,report,verify,diff}` — wired in pulses 47.1 (generate + verify), 47.2 (check + diff + watch), 47.3 (comply + report + test + sim), and 47.5 (doctor + upgrade).
- `claws snap *` — handler bodies + `--endpoint` flag wired in pulse 47.4 (70e2e383).
- Library-layer gaps closed in pulse 47.5.5 (c49840c4 + 441180a2 + 3a065f34).
- End-to-end proof in pulse 47.6 (bcf54104): 22 verbs × 4 CP-5 fixtures × 2 spawn modes, all green.
- Pulse 47.7 (this release) removed the pulse-36 `test/e2e/harness/policy-runner` override seam; integration tests now spawn the shipping binary directly.

## 0.36.0 and earlier

See git history for pre-CP-5.5 revisions.
