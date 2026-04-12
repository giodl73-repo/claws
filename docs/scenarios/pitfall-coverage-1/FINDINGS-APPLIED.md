# FINDINGS-APPLIED — Pitfall-Coverage-1 Scenario Series

**Date**: 2026-04-11
**Filter**: Major and Warning findings only (notes excluded)

## Findings by Scenario

### S01 BOM and Line Endings (P-051, P-052)
| Finding | Severity | Applied To | As |
|---------|----------|-----------|-----|
| F01 | major | CL-04 constraints, claws-parse | Uniform BOM stripping constraint (P-100) |
| F02 | major | CL-04 constraints, claws-parse | Blanket BOM strip on all 9 files (P-100) |
| F03 | warning | CL-04 constraints, claws-parse | BOM+CRLF sequencing constraint |
| F04 | major | CL-04 constraints, claws-parse | Hash from normalized content (P-101) |
| F05 | warning | CL-04 constraints | Normalization layer placement |
| F06 | major | CL-04 constraints | git autocrlf hash comparison (P-101) |
| F08 | warning | CL-04 constraints, lossless-roundtrip guide | Internal normalization no mutation |

### S02 Parse Order Forward Ref (P-053)
| Finding | Severity | Applied To | As |
|---------|----------|-----------|-----|
| F01 | major | CL-04 constraints, claws-parse | Deferred resolution mandatory (P-102) |
| F02 | major | CL-04 constraints, claws-parse | File addition stability (P-102) |
| F03 | warning | CL-04 constraints, claws-parse | Extensible two-pass architecture |
| F04 | major | CL-04 constraints | Deny-tool association across passes |
| F05 | warning | CL-04 constraints, claws-parse | Full reference graph (AGENTS+SOUL+HEARTBEAT) |
| F07 | major | CL-04 constraints | Circular cross-file references |
| F08 | warning | CL-04 constraints | Symbol table O(1) performance |

### S03 Schedule Perpetual Denial (P-054)
| Finding | Severity | Applied To | As |
|---------|----------|-----------|-----|
| F01 | major | CL-04 constraints, claws-parse, claws-rules | Three-way conflict detection (P-103) |
| F02 | major | CL-02 A55, claws-rules, elicitation-gate guide | R4+ generalization (P-103) |
| F03 | major | CL-02 A56, claws-rules | R5 pre-auth warning |
| F04 | warning | claws-rules | Business hours config |
| F05 | warning | CL-02 A57, claws-rules | Audit chain pollution warning |
| F07 | major | CL-04 constraints | Compile-time prevents runtime dead loops |

### S04 OBO Elicit Severity (P-055)
| Finding | Severity | Applied To | As |
|---------|----------|-----------|-----|
| F01 | major | CL-04 constraints, claws-parse, claws-rules | Risk-conditional severity (P-104) |
| F02 | major | CL-04 constraints, claws-rules | Cross-spec invariant (P-104) |
| F03 | major | CL-04 constraints, claws-rules, elicitation-gate guide | R5 error, R3-R4 warning (P-104) |
| F04 | warning | CL-02 A58, claws-rules | Strict mode all-OBO error |
| F05 | warning | CL-02 A59, elicitation-gate guide | Empty policy = missing policy |
| F07 | major | CL-04 constraints, claws-parse | Per-tool error reporting |

### S05 Implicit Delegation Escalation (P-056)
| Finding | Severity | Applied To | As |
|---------|----------|-----------|-----|
| F01 | major | CL-04 constraints, claws-parse | 'all' token resolution (P-105) |
| F02 | major | CL-04 constraints, claws-parse, claws-rules | IMPLICIT-R4-DELEGATION warning (P-105) |
| F03 | major | CL-04 constraints, claws-parse | TOOLS.md change invalidation (P-105) |
| F04 | warning | CL-02 A60 | Suppression config per-agent |
| F05 | warning | CL-02 A61, claws-rules | Transitive 'all' expansion |
| F07 | major | CL-02 A62, claws-rules | Fleet per-workspace resolution |

### S06 Skill Phantom Tools (P-057)
| Finding | Severity | Applied To | As |
|---------|----------|-----------|-----|
| F01 | major | CL-04 constraints, claws-parse | NL tool reference extraction (P-106) |
| F02 | major | CL-04 constraints | Structured requires_tools metadata (P-106) |
| F03 | warning | CL-04 constraints, claws-parse | Conservative all-paths detection |
| F04 | major | CL-04 constraints | Tool name aliasing (P-106) |
| F05 | warning | CL-04 constraints, claws-parse | Grouped phantom reporting |
| F07 | major | CL-04 constraints, claws-emit | Runtime phantom tool interception |
| F08 | warning | CL-04 constraints, claws-emit | Skill update triggers recompilation |

### S07 Cross-Workspace Cycles (P-058)
| Finding | Severity | Applied To | As |
|---------|----------|-----------|-----|
| F01 | major | CL-02 A63, claws-rules | Fleet-level cycle detection |
| F02 | major | CL-02 A63, claws-rules | Merged delegation graph construction |
| F03 | major | CL-02 A64, claws-rules | Multi-hop cycle diagnostics |
| F04 | warning | CL-02 A65, claws-rules | Callback vs cycle distinction |
| F05 | warning | CL-02 A66, claws-rules | Unresolvable external delegation |
| F06 | major | CL-02 A67, claws-rules | Runtime delegation depth limit |
| F08 | warning | CL-02 A68, claws-rules | Efficient Tarjan's algorithm |

### S08 Transitive Data Flow (P-059)
| Finding | Severity | Applied To | As |
|---------|----------|-----------|-----|
| F01 | major | CL-02 A69, claws-rules | Transitive label propagation (P-107) |
| F02 | major | CL-02 A69, claws-rules | High water mark rule (P-107) |
| F03 | major | CL-02 A70, claws-rules | Declassification annotation (P-107) |
| F04 | warning | CL-02 A71, claws-rules | Multi-label ceiling evaluation |
| F05 | warning | CL-02 A72, claws-rules | Transitive flow performance |
| F06 | major | claws-rules | Cross-workspace transitive flows (fleet) |

### S09 Collect All Errors (P-060)
| Finding | Severity | Applied To | As |
|---------|----------|-----------|-----|
| F01 | major | CL-04 constraints, claws-parse | Collect-all-errors default (P-108) |
| F02 | major | CL-04 constraints, claws-parse | Per-file parser isolation (P-108) |
| F03 | warning | CL-04 constraints | Phase-gating with collected errors |
| F04 | major | CL-04 constraints, claws-parse | Intra-file error recovery (P-108) |
| F05 | warning | CL-04 constraints, claws-parse | Per-file error limit |
| F07 | warning | CL-04 constraints, claws-parse | --fail-fast flag |

### S10 Catch Clause Crash (P-070)
| Finding | Severity | Applied To | As |
|---------|----------|-----------|-----|
| F01 | major | CL-04 constraints, claws-emit | Single point of failure (P-109) |
| F02 | major | CL-04 constraints, claws-emit | Pre-computed risk map (P-109) |
| F03 | major | CL-02 A73, CL-04 constraints | Unknown tool = R5 default (P-109) |
| F04 | major | CL-04 constraints, claws-emit | Post-emit catch clause verifier (P-109) |
| F05 | warning | CL-04 constraints | Null/undefined toolName handling |
| F06 | warning | CL-04 constraints, claws-emit | Risk map immutability |
| F07 | major | CL-04 constraints, fail-mode guide | Defense-in-depth regardless of platform |
| F09 | warning | CL-02 A74, CL-04 constraints, fail-mode guide | Catch clause audit must not throw |

## New Pitfalls (P-100 through P-109)

| ID | Severity | Source | Title |
|----|----------|--------|-------|
| P-100 | Critical | S01-F01,F02 | UTF-8 BOM causes SOUL.md first constraint silently dropped |
| P-101 | High | S01-F04,F06 | GovernanceIR hash varies across OS due to git autocrlf |
| P-102 | Critical | S02-F01,F02 | Alphabetical parse order causes forward-reference failures |
| P-103 | Critical | S03-F01,F02 | Scheduled R4+ tool guaranteed to fail (perpetual denial) |
| P-104 | Critical | S04-F01,F02,F03 | OBO-WITHOUT-ELICIT warning contradicts R5 fail-closed |
| P-105 | High | S05-F01,F02,F03 | Implicit 'all tools' hides R5 trust escalation |
| P-106 | High | S06-F01,F02,F04 | Marketplace skills reference phantom tools (NL) |
| P-107 | Critical | S08-F01,F02,F03 | Transitive data flow violates sensitivity labels |
| P-108 | High | S09-F01,F02,F04 | Fail-fast hides errors in other files |
| P-109 | Critical | S10-F01,F02,F04 | Catch clause crash defeats R5 defense |
