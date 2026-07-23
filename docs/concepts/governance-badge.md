# Governance Badge

ClawHub governance certification badge with three levels: DECLARED, TYPED, and VERIFIED.

## Overview

Governance badges are visual indicators of a workspace's governance maturity. When a workspace is published to ClawHub (the claws package registry), it receives a badge reflecting its governance level. The badge communicates trust to consumers: a VERIFIED workspace has passed automated verification, while a DECLARED workspace has only self-reported its governance posture.

## Badge Levels

| Level    | Requirement                                      | Trust                              |
| -------- | ------------------------------------------------ | ---------------------------------- |
| DECLARED | claws.json exists with governance declarations   | Low -- self-reported               |
| TYPED    | GovernanceIR compiles without errors             | Medium -- machine-validated syntax |
| VERIFIED | Full compliance suite passes with evidence chain | High -- automated verification     |

## Earning Badges

```
claws init          → DECLARED (governance declarations present)
claws build         → TYPED (governance compiles cleanly)
claws verify        → VERIFIED (compliance tests pass)
```

## Badge Display

On ClawHub, badges appear next to the workspace name:

```
lead-scoring v1.2.0  [VERIFIED]
support-triage v0.9.0  [TYPED]
experiment-alpha v0.1.0  [DECLARED]
```

## Badge Revocation

Badges are version-specific. A workspace can be VERIFIED at v1.2.0 and DECLARED at v1.3.0 if the new version breaks compliance. The badge reflects the most recent `claws verify` result for each version.

## Related

- [claws publish](claws-publish.md) -- publishing to ClawHub
- [Compliance Artifact](compliance-artifact.md) -- evidence for VERIFIED badge
- `design/claws/ATOMS.md` -- C42 `atom:governance-badge`
