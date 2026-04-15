/**
 * SOC2 governance template — compliance policies for SOC2 Type II.
 *
 * Produces 5 policy files:
 * - require_section.yaml — mandatory section requirements
 * - tool_blocklist.yaml — prohibited tool patterns
 * - trust_tier_gate.yaml — trust tier enforcement gates
 * - pii_detection.yaml — PII pattern detection rules
 * - budget_ceiling.yaml — token/cost budget ceilings
 *
 * @module claws-sdk/init/templates/soc2
 */

import type { GovernanceTemplate } from './index.js';

export const soc2Template: GovernanceTemplate = {
  name: 'soc2',
  description: 'SOC2 Type II compliance — section requirements, tool blocklists, trust tier gates, PII detection, budget ceilings',
  configOverrides: {
    trustTier: 3,
    complianceFramework: 'soc2',
  },
  policies: [
    {
      name: 'require_section.yaml',
      content: `# SOC2 — Mandatory section requirements
# Ensures governance source files contain required sections.
policy: require_section
framework: soc2
level: error
rules:
  - section: security-controls
    description: "Security controls must be documented"
    required: true
  - section: access-management
    description: "Access management policies must be defined"
    required: true
  - section: change-management
    description: "Change management procedures must be documented"
    required: true
  - section: incident-response
    description: "Incident response plan must be present"
    required: true
  - section: monitoring
    description: "Monitoring and logging requirements must be specified"
    required: true
`,
    },
    {
      name: 'tool_blocklist.yaml',
      content: `# SOC2 — Tool blocklist
# Blocks tools that violate SOC2 data handling requirements.
policy: tool_blocklist
framework: soc2
level: error
rules:
  - pattern: "*/unencrypted-*"
    reason: "Unencrypted data transfer violates CC6.1"
  - pattern: "*/raw-exec"
    reason: "Unrestricted execution violates CC6.3"
  - pattern: "*/public-paste*"
    reason: "Public paste services violate CC6.7 data confidentiality"
`,
    },
    {
      name: 'trust_tier_gate.yaml',
      content: `# SOC2 — Trust tier enforcement gates
# Enforces minimum trust tiers for sensitive operations.
policy: trust_tier_gate
framework: soc2
level: error
rules:
  - operation: deploy
    min_tier: 3
    reason: "Production deployments require T3+ trust"
  - operation: data-export
    min_tier: 3
    reason: "Data exports require T3+ trust per CC6.7"
  - operation: config-change
    min_tier: 2
    reason: "Configuration changes require T2+ trust per CC8.1"
`,
    },
    {
      name: 'pii_detection.yaml',
      content: `# SOC2 — PII detection rules
# Detects personally identifiable information in governance artifacts.
policy: pii_detection
framework: soc2
level: warn
rules:
  - pattern: "\\\\b[A-Z][a-z]+ [A-Z][a-z]+\\\\b"
    type: full_name
    description: "Possible full name detected"
  - pattern: "\\\\b\\\\d{3}-\\\\d{2}-\\\\d{4}\\\\b"
    type: ssn
    description: "Possible SSN pattern detected"
    level: error
  - pattern: "\\\\b[\\\\w.+-]+@[\\\\w-]+\\\\.[\\\\w.-]+\\\\b"
    type: email
    description: "Email address detected"
  - pattern: "\\\\b\\\\d{3}[-.\\\\s]?\\\\d{3}[-.\\\\s]?\\\\d{4}\\\\b"
    type: phone
    description: "Possible phone number detected"
`,
    },
    {
      name: 'budget_ceiling.yaml',
      content: `# SOC2 — Budget ceilings
# Enforces token and cost limits per session and operation.
policy: budget_ceiling
framework: soc2
level: error
rules:
  - scope: session
    max_tokens: 1000000
    reason: "Session token limit per CC6.1 resource management"
  - scope: operation
    max_tokens: 100000
    reason: "Per-operation token limit for cost control"
  - scope: daily
    max_cost_usd: 500
    reason: "Daily cost ceiling per organizational budget controls"
`,
    },
  ],
};
