/**
 * HIPAA governance template — compliance policies for healthcare data.
 *
 * Produces 4 policy files:
 * - data_labeling_mandatory.yaml — mandatory data classification labels
 * - phi_detection.yaml — PHI pattern detection rules
 * - audit_mandatory.yaml — mandatory audit trail requirements
 * - access_control.yaml — role-based access control enforcement
 *
 * @module claws-sdk/init/templates/hipaa
 */

import type { GovernanceTemplate } from './index.js';

export const hipaaTemplate: GovernanceTemplate = {
  name: 'hipaa',
  description: 'HIPAA Security Rule — mandatory data labeling, PHI detection, audit trails, access control',
  configOverrides: {
    trustTier: 3,
    complianceFramework: 'hipaa',
  },
  policies: [
    {
      name: 'data_labeling_mandatory.yaml',
      content: `# HIPAA — Mandatory data labeling
# All data sources must be classified per HIPAA Security Rule §164.312.
policy: data_labeling_mandatory
framework: hipaa
level: error
rules:
  - label: phi
    description: "Protected Health Information — requires encryption at rest and in transit"
    required_controls:
      - encryption_at_rest
      - encryption_in_transit
      - access_logging
  - label: pii
    description: "Personally Identifiable Information — requires access controls"
    required_controls:
      - access_logging
      - role_based_access
  - label: de-identified
    description: "De-identified data per Safe Harbor method — reduced controls"
    required_controls: []
  - label: public
    description: "Public information — no additional controls"
    required_controls: []
`,
    },
    {
      name: 'phi_detection.yaml',
      content: `# HIPAA — PHI detection rules
# Detects Protected Health Information per 18 HIPAA identifiers.
policy: phi_detection
framework: hipaa
level: error
rules:
  - pattern: "\\\\b\\\\d{3}-\\\\d{2}-\\\\d{4}\\\\b"
    type: ssn
    description: "Social Security Number (HIPAA identifier #1)"
  - pattern: "\\\\bMRN[:\\\\s]?\\\\d+\\\\b"
    type: medical_record
    description: "Medical Record Number (HIPAA identifier #4)"
  - pattern: "\\\\b\\\\d{3}[-.\\\\s]?\\\\d{3}[-.\\\\s]?\\\\d{4}\\\\b"
    type: phone
    description: "Phone number (HIPAA identifier #5)"
  - pattern: "\\\\b[\\\\w.+-]+@[\\\\w-]+\\\\.[\\\\w.-]+\\\\b"
    type: email
    description: "Email address (HIPAA identifier #7)"
  - pattern: "\\\\b\\\\d{1,2}[/-]\\\\d{1,2}[/-]\\\\d{2,4}\\\\b"
    type: date
    description: "Date pattern — potential date of birth/admission (HIPAA identifier #3)"
`,
    },
    {
      name: 'audit_mandatory.yaml',
      content: `# HIPAA — Mandatory audit trail
# Requires tamper-evident audit logging per §164.312(b).
policy: audit_mandatory
framework: hipaa
level: error
rules:
  - event: data_access
    description: "All PHI access must be logged"
    require_signed: true
  - event: data_modification
    description: "All PHI modifications must be logged with before/after"
    require_signed: true
    require_diff: true
  - event: policy_change
    description: "All governance policy changes must be logged"
    require_signed: true
  - event: access_grant
    description: "All access grants/revocations must be logged"
    require_signed: true
`,
    },
    {
      name: 'access_control.yaml',
      content: `# HIPAA — Access control enforcement
# Role-based access control per §164.312(a)(1).
policy: access_control
framework: hipaa
level: error
rules:
  - role: admin
    min_tier: 3
    permissions:
      - read
      - write
      - configure
      - audit
    description: "Admin requires T3+ with full audit capability"
  - role: operator
    min_tier: 2
    permissions:
      - read
      - write
    description: "Operator requires T2+ for read/write access"
  - role: viewer
    min_tier: 1
    permissions:
      - read
    description: "Viewer requires T1+ for read-only access"
  - role: auditor
    min_tier: 3
    permissions:
      - read
      - audit
    description: "Auditor requires T3+ with audit trail access"
`,
    },
  ],
};
