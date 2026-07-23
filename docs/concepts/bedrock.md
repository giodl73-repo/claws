# Platform: Bedrock

<!-- atom:platform-bedrock (C11) -->

## Overview

Amazon Bedrock is an explicit-detection platform. Unlike OpenClaw or Cursor, there is no marker file to discover -- the developer must declare Bedrock as a target in `claws.json`. claws emits governance as Bedrock Guardrail API JSON, targeting a specific API version. Enforcement is full when the guardrail is deployed, making Bedrock the strongest enforcement target outside of OpenClaw.

---

## Detection

Bedrock is never auto-detected. The developer declares it explicitly:

```json
{
  "targets": {
    "bedrock": {
      "guardrailId": "abc123",
      "apiVersion": "2024-04-12"
    }
  }
}
```

The `guardrailId` field is required for update workflows (patching an existing guardrail rather than creating a new one). The `apiVersion` field enables version-targeted emission so that claws generates JSON compatible with the specific Bedrock API the developer's infrastructure uses.

---

## Guardrail API Targeting

AWS updates the Bedrock CreateGuardrail API over time. If claws hardcodes a single API schema, guardrail creation may fail silently or be rejected when the API evolves. P-240 (Bedrock guardrail API version mismatch) addresses this:

- claws emits JSON targeting the declared `apiVersion`
- If the version is unknown to the current claws release, a warning is emitted
- The warning includes the known version range and suggests upgrading claws

**Model-provider-agnostic emission**: Bedrock guardrail JSON is not tied to a specific model provider (Anthropic, Cohere, Meta, etc.). The emitted governance applies regardless of which foundation model the guardrail protects.

---

## Governance Translation

Not all governance rules translate directly to Bedrock Guardrail concepts. claws maps governance model constructs to Bedrock equivalents:

| claws concept       | Bedrock equivalent            | Coverage                          |
| ------------------- | ----------------------------- | --------------------------------- |
| Tool deny list      | Content filter (topic policy) | Full                              |
| OBO boundary        | No direct equivalent          | Partial -- advisory annotation    |
| Risk classification | Guardrail strength levels     | Full                              |
| Trust tier          | N/A                           | Metadata only                     |
| Elicitation gate    | N/A                           | Not expressible in guardrail JSON |

When a governance rule has no Bedrock equivalent, claws emits a diagnostic noting the translation gap. The developer must implement the missing enforcement in application code. Governance model translation coverage is tracked per Bedrock API version.

---

## Deployment Instructions

Because Bedrock requires infrastructure deployment (not just file emission), claws's build output includes post-build deployment instructions:

1. **JSON output**: the guardrail definition file is emitted to `.claws/bedrock/guardrail.json`
2. **CLI command**: the build output includes the AWS CLI command to create or update the guardrail
3. **Validation**: `claws check` checks that the emitted JSON is valid against the declared API version
4. **Drift detection**: if the deployed guardrail diverges from the compiled definition, `claws scan` detects the drift

Deployment instructions appear in the build summary. They are not executed automatically -- claws does not call AWS APIs. The developer runs the deployment step.

---

## Cross-Compile

Bedrock can be a secondary target alongside OpenClaw or Claude Code. When cross-compiling, claws emits platform-specific artifacts for each target. The OpenClaw guard skills and the Bedrock guardrail JSON are generated from the same GovernanceIR, ensuring consistency.

An explicit platform override (`--target bedrock`) is valid for cross-compilation scenarios where the developer wants to emit only the Bedrock artifacts.

---

## Scenario Sources

- **S05**: Bedrock explicit detection and guardrail emission
- **S05-F02**: Bedrock guardrail API version mismatch (P-240)
- **S05-F07**: Explicit platform override valid for cross-compile (note, skipped)
- Platform-detection FINDINGS-APPLIED.md: CL-04 (model-provider-agnostic emission, governance translation coverage, API version targeting), CL-05 (post-build deployment instructions)

---

## Related Concepts

- [OpenClaw](openclaw.md) -- full enforcement comparison
- [LangGraph](langgraph.md) -- another explicit-detection platform
- [Three-Tier Packages](../architecture/three-tier-packages.md) -- where Bedrock support lives
