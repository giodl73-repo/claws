# Compliance Artifact

SOC2, HIPAA, and EU AI Act evidence artifacts generated from the governance pipeline.

## Overview

Compliance artifacts are structured evidence documents that prove a workspace meets regulatory requirements. They are generated from the CGR chain, governance configuration, and capability manifest -- not authored manually. The artifacts are machine-generated, human-readable, and auditor-consumable.

## Artifact Types

| Framework    | Artifact            | Contents                                            |
| ------------ | ------------------- | --------------------------------------------------- |
| SOC2 Type II | Control matrix      | Per-control evidence with CGR references            |
| HIPAA        | Security assessment | PHI handling proof, encryption status, access logs  |
| EU AI Act    | Risk assessment     | Capability classification, human oversight evidence |
| All          | Audit trail export  | CGR chain extract for the assessment period         |

## Generation

```bash
claws comply --framework soc2 --output artifacts/
```

This produces:

- `soc2-control-matrix.md` -- control-by-control evidence
- `soc2-evidence-chain.json` -- machine-readable CGR references
- `soc2-summary.md` -- executive summary

## Evidence Linking

Each control in the compliance artifact links to specific CGR entries:

```markdown
## CC6.1: Logical Access Controls

**Status**: COMPLIANT

**Evidence**:

- Permission tier T2 enforced on all external tool access (CGR-2026-04-12-001)
- Guard gate G1 validates classification ceiling pre-compile (CGR-2026-04-12-003)
- 0 bypass events in assessment period
```

## Related

- [fleet comply](fleet-comply.md) -- fleet-wide compliance checking
- [Audit Chain](audit-chain.md) -- CGR chain integrity
- `design/claws/ATOMS.md` -- C15 `atom:compliance-artifact`
