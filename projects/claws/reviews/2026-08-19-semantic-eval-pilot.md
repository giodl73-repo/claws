# Awesome Claws semantic-evaluation pilot

## Frame

The deterministic regression corpus already gives all 54 Claws an exact,
reviewed evidence and authority contract. The missing capability is a bounded
way to test whether one representative agent preserves those semantics when the
request is paraphrased or adversarially pressured.

The pilot adds one opt-in Customer Support evaluation with three checked-in
synthetic requests. It does not replace deterministic regression, installed
lifecycle proof, provider-specific validation, or maintainer review. It is not a
default CI gate and does not generalize model grading to the catalog.

The deletion test is simple: remove the pilot if repeated runs do not catch
meaningful drift beyond the deterministic suite, if judge variance makes results
non-actionable, or if operating cost exceeds the evidence value.

## Audit and comparison

- `regression-cases.json` remains the authoritative catalog-wide contract.
- `scripts/regression-cases.mjs` binds exact requests, evidence, authority,
  Experience, capability classes, and capability digests for every Claw.
- `npm run test:claw` already separates deterministic proof from explicitly
  requested expensive lanes.
- The pilot reuses that separation and binds its selected Claw to a digest of the
  deterministic regression contract. It does not add semantic fields to catalog
  metadata or create a second catalog.
- The existing installed OpenClaw proof uses a deterministic OpenAI-compatible
  fixture and explicitly claims no provider-live behavior. The semantic pilot
  uses an operator-selected endpoint and labels its output as opt-in model-judged
  evidence, not lifecycle or safety proof.

## Cross-tension evaluation

The Power User, CISO, Claws Repo Steward, and Platform Engineering lenses found
no blocking contradiction.

- Operator: one explicit command, exactly six requests, 1,200 subject and 700
  judge output-token ceilings, no default-CI cost.
- Security: HTTPS outside localhost, no API-key persistence, checked-in
  synthetic prompts only, response treated as untrusted judge input, and no
  safety/provider-live guarantee.
- Repository stewardship: all contracts and code remain in Awesome Claws with no
  cross-repo runtime dependency.
- Platform: mocked tests run in ordinary CI; provider calls remain opt-in and
  return structured nonzero failure.

Judge separation is model-id-level when both ids use one endpoint. Stronger
provider or inference-stack separation remains an operator choice and is
documented rather than implied.

## Evidence slice

- Pilot Claw: `customer-support`
- Cases: missing context, unsafe credential handling, unauthorized commitment
  pressure
- Observable output: per-case JSON plus aggregate JSON and Markdown under
  `.tmp/semantic-eval/<run-id>/`
- Accepted proof: mocked subject and judge produce two passing cases
- Structured failure proof: unauthorized promise/refund/closure receives zero
  scores, a specific failure, and aggregate failure status
- Failure posture: invalid registry, non-HTTPS remote endpoint, missing remote
  API key, same-model self-grading, malformed provider output, contradictory
  judge output, and semantic failure all fail closed
- Repository gate: 153 tests pass; all 54 packages, chooser views, catalog
  entries, contribution policy records, and regression contracts validate

No real-provider result is claimed by this slice. A real run requires an
explicit endpoint, credential, subject model, and distinct judge model.
