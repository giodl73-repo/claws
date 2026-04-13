# claws Acceptance Tests

Run: `cd claws-sdk && vitest run --project accept`

74 scenarios across 10 series. See SCORECARD.md for results.

Pattern: manifest-driven dispatch to 5 runner types.

## Series

| Series | Scenarios | Runner(s) |
|--------|-----------|-----------|
| compile-pipeline | 8 | compile-sim |
| governance-rules | 12 | pinch-sim |
| fail-mode | 6 | pinch-sim, security-sim |
| emit-artifacts | 8 | emit-sim |
| cross-file-conflicts | 7 | compile-sim |
| input-resolver | 6 | compile-sim |
| loss-aware-emission | 5 | compile-sim |
| pitfall-coverage-1 | 10 | compile-sim, pinch-sim, emit-sim |
| lossless-roundtrip | 5 | compile-sim |
| platform-detection | 7 | compile-sim |
