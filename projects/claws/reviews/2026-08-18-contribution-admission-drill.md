# Awesome Claws contribution admission drill

- Date: 2026-08-18
- Source: `awesome-claws@f02c6ed99c`
- Merged system: Awesome Claws #27, `d02527a8f9`
- Fixture artifacts: Copilot session `files/contribution-drill/`

## Thesis

The contribution system should route realistic proposals into all four
maintainer outcomes without treating lexical similarity as the product
decision. Only a proposal judged to be a new Claw should reach scaffolding, and
its temporary copied screenshot should remain a structured validation failure.

## Results

| Proposal | Nearest signal | Maintainer decision | Reason |
| --- | --- | --- | --- |
| Deployment release readiness | Release Coordinator 27.4%; Change Control Operator 17.6%; QA Lead 15.6% | **Improve an existing Claw** | It repeats Release Coordinator's user, evidence, workflow, outputs, and approval boundary. |
| Healthcare compliance reviewer | Compliance Reviewer 47.7% | **Variant, not catalog material** | HIPAA and healthcare terms specialize the setting but do not change the operating contract. A reusable example may improve Compliance Reviewer instead. |
| Model evaluation adjudicator | Procurement Evaluator 11.4%; Delegation Coordinator 9.9%; Compliance Reviewer 9.4% | **New Claw** | Blinded rubric calibration, inter-rater disagreement, adjudication, and model-selection boundaries form a distinct repeatable job and evidence model. This was a drill decision, not catalog admission or implementation. |
| Claw contribution curator | Data Governance Steward 10.0%; Procurement Evaluator 8.9%; Accessibility Review Coordinator 8.7% | **Needs product decision** | The contract is distinct, but a self-governing catalog Claw and any future ClawSweeper relationship require explicit product direction. |

## End-to-end proof

`run-drill.mjs` strictly validated all four completed contribution packets.
Only Model Evaluation Adjudicator advanced to the isolated scaffolder. The
scaffolder created the X3 source package and contribution record, after which
contribution validation rejected the copied Executive Assistant screenshot as
intended. No catalog, issue, PR, or repository state was mutated.

Success marker:

```json
{
  "completeDecisionPackets": 4,
  "scaffoldedCandidate": "model-evaluation-adjudicator",
  "expectedStructuredFailure": "duplicate scaffold screenshot rejected"
}
```

## Observed friction

- The workflow cleanly separates similarity evidence from the maintainer
  verdict: the 27.4% duplicate still required human rejection, while two
  low-overlap proposals required different product decisions.
- The report's shared terms include generic words such as `the`, `not`, and
  `one`; the simple suffix normalizer also renders words such as `assess` and
  `readiness` awkwardly. This is cosmetic and did not change any decision.
  Recalibrate only after real contribution data demonstrates ranking harm.
- Do not reopen ClawSweeper #1209 or enable its profile from this drill.

## Next evidence gate

Use the first real external proposal as the next calibration point. Preserve
the current thresholds until observed rankings misroute a real comparison.
Model Evaluation Adjudicator is a viable future proposal, but it still requires
an actual maintainer issue decision before catalog work.
