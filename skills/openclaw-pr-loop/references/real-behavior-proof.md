# Real Behavior Proof

OpenClaw checks external PR bodies for a `Real behavior proof` section. Tests,
lint, typechecks, mocks, snapshots, and CI are supplemental only.

Use this exact shape:

```markdown
## Real behavior proof

Behavior or issue addressed:
<The changed user-visible or runtime behavior.>

Real environment tested:
<OS, checkout, source harness/live app, services, and dependencies.>

Exact steps or command run after this patch:
1. <Step or command>
2. <Step or command>

Evidence after fix:
<Screenshot, recording, terminal transcript, console output, redacted runtime log,
linked artifact, or copied live output.>

Observed result after fix:
<What happened after the patch.>

What was not tested:
<Known proof gaps, or "No known gaps".>
```

Notes:

- Use the full labels above. Do not shorten them to `behavior:` or
  `environment:`.
- `Evidence after fix` and `Observed result after fix` need a real evidence
  signal: screenshot, recording, terminal capture, console output, runtime log,
  linked artifact, or copied live output.
- A focused unit test can be included only as supporting proof. If the proof uses
  a source harness with mocked metadata, say that clearly in
  `Real environment tested` and `What was not tested`.

