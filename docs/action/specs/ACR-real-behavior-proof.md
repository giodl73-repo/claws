# ACR - real behavior proof gate

**Status**: Proposed - **Upstream target**: Lobster CI

## Package overview

The real behavior proof gate checks that pull requests include evidence from
the changed behavior running after the patch. It complements unit tests and CI:
tests say the code path is covered, while proof shows the maintainer what a user
or operator would actually see.

The gate is intentionally small. A PR author can provide terminal output,
screenshot evidence, log output, a recorded artifact, or another concrete result
from a real local or remote environment. Mock-only output is not enough by
itself, but isolated local state is allowed when the behavior should not touch
production resources.

## PR body contract

Pull requests that change user-visible behavior, command behavior, policy
behavior, integrations, or CI gates should include:

```md
## Real behavior proof

**Behavior addressed:** What changed, and which issue or user problem it fixes.

**Real environment tested:** Where the proof was produced.

**Exact steps or command run after this patch:** The command, workflow, or UI
steps run against the patched code.

**Evidence after fix:** Embedded output or a link to a durable artifact.

**Observed result after fix:** The result that proves the behavior now works.

**What was not tested:** Honest limits of the proof.
```

The checker should accept these exact fields first. It may also accept short
aliases for compatibility, but the canonical form above is what docs and PR
templates should teach.

## Evidence rules

- Unit tests and CI output can support the proof, but do not replace it.
- Local command output is valid when the command runs the patched product code.
- Screenshots are valid for UI, docs rendering, terminal UX, and visual changes.
- Network or third-party integrations may use a staging account, fixture tenant,
  or isolated workspace when production access would be unsafe.
- The `What was not tested` field is required so maintainers can judge residual
  risk without guessing.

## Labels and outcomes

The first implementation should mirror OpenClaw's behavior:

- `proof: supplied` when a proof section exists.
- `proof: sufficient` when the fields and evidence pass policy.
- `triage: needs-real-behavior-proof` when proof is missing.
- `triage: mock-only-proof` when proof only shows tests, mocks, or simulated
  behavior.
- `proof: override` as a maintainer escape hatch for low-risk or non-runtime
  changes.

The gate should fail only when the PR is in scope and proof is missing or
insufficient. Draft PRs may run the checker in warning mode until the repository
is ready to make it required.

## Implementation plan

1. Add this spec and the PR body guidance.
2. Port the checker policy from OpenClaw into `claws-action` in warning mode.
3. Add repository labels and teach the PR template to use the canonical fields.
4. Turn the gate on for behavior-changing PRs after the false-positive rate is
   low enough.

## Example

````md
## Real behavior proof

**Behavior addressed:** `claws policy check` now reports a clean attestation
when the workspace satisfies the configured policy.

**Real environment tested:** Local Windows checkout with an isolated temporary
workspace.

**Exact steps or command run after this patch:** Ran `claws policy check
--attest --json` after creating a passing policy fixture.

**Evidence after fix:**

```text
policy check exit=0
findings=0
attestationHash=sha256:...
```

**Observed result after fix:** The command exited 0, reported no findings, and
emitted an attestation hash.

**What was not tested:** No remote supervisor accepted the attestation in this
proof.
````

## Stability

Proposed. The PR body field names should be treated as stable once the gate is
enabled because contributors will copy them into PRs and automation will parse
them.
