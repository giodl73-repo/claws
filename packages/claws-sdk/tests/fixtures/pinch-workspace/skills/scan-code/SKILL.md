---
name: scan-code
description: Scan repository for security vulnerabilities and code quality issues
tools:
  - Bash
  - Read
  - Grep
risk_level: high
obo: true
data_classification: confidential
governance:
  rules:
    - id: G-CLASS-01
      weight: 0.9
      severity: critical
      text: "All tools must declare a risk classification"
      remediation: "Add risk_level to tool frontmatter"
    - id: G-PERM-01
      weight: 0.7
      severity: high
      text: "Bash tool requires explicit permission grant"
      remediation: "Add Bash to approved tool allowlist"
    - id: G-DATA-01
      weight: 0.5
      severity: medium
      text: "Confidential data requires encryption at rest"
      remediation: "Enable workspace encryption flag"
    - id: G-ELICIT-01
      weight: 0.3
      severity: low
      text: "OBO operations should log user confirmation"
      remediation: "Add elicit confirmation step"
    - id: G-INPUT-01
      weight: 0.15
      severity: low
      text: "Input validation should sanitize file paths"
      remediation: "Use path.normalize before fs operations"
  tensions:
    - pair: [G-CLASS-01, G-PERM-01]
      description: "Classification may require permissions not yet granted"
  obo_chain:
    - actor: user
      action: "initiated scan"
    - actor: agent
      action: "executed Bash command on behalf of user"
  audit_refs:
    - "AUDIT-2026-001: Initial workspace scan"
    - "AUDIT-2026-002: Quarterly compliance review"
  policy_links:
    - "https://internal.example.com/policy/agent-execution"
    - "https://internal.example.com/policy/data-handling"
  historical_notes:
    - "2026-01: Elevated from medium to high risk after incident IR-4421"
    - "2026-03: OBO chain extended to include delegation tracking"
  risk_decomposition:
    execution_risk: high
    data_risk: medium
    delegation_risk: low
---

# Scan Code

Scan the repository for security vulnerabilities, code quality issues,
and governance compliance gaps. Uses Bash for running static analysis
tools, Read for examining source files, and Grep for pattern matching.

## Capabilities

- Static analysis via external tools (eslint, semgrep)
- Dependency vulnerability scanning
- Code quality metric collection
- Governance rule compliance checking
