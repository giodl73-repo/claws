/**
 * EU AI Act governance template — compliance policies for EU AI regulation.
 *
 * Produces 3 policy files:
 * - risk_classification_mandatory.yaml — AI system risk classification per Article 6
 * - human_oversight_gates.yaml — human oversight enforcement per Article 14
 * - transparency.yaml — transparency requirements per Article 13
 *
 * @module claws-sdk/init/templates/eu-ai-act
 */

import type { GovernanceTemplate } from './index.js';

export const euAiActTemplate: GovernanceTemplate = {
  name: 'eu-ai-act',
  description: 'EU AI Act — mandatory risk classification, human oversight gates, transparency requirements',
  configOverrides: {
    trustTier: 3,
    complianceFramework: 'eu-ai-act',
  },
  policies: [
    {
      name: 'risk_classification_mandatory.yaml',
      content: `# EU AI Act — Risk classification
# Mandatory risk classification per Article 6 categories.
policy: risk_classification_mandatory
framework: eu-ai-act
level: error
rules:
  - classification: unacceptable
    description: "Banned AI practices per Article 5 — social scoring, real-time biometrics"
    action: deny
  - classification: high-risk
    description: "High-risk AI per Annex III — requires conformity assessment"
    action: require_assessment
    required_documentation:
      - risk_management_system
      - data_governance
      - technical_documentation
      - record_keeping
      - transparency_info
      - human_oversight_measures
      - accuracy_robustness
  - classification: limited-risk
    description: "Limited-risk AI — transparency obligations apply"
    action: require_transparency
  - classification: minimal-risk
    description: "Minimal-risk AI — voluntary codes of conduct"
    action: allow
`,
    },
    {
      name: 'human_oversight_gates.yaml',
      content: `# EU AI Act — Human oversight gates
# Enforcement of human oversight per Article 14.
policy: human_oversight_gates
framework: eu-ai-act
level: error
rules:
  - gate: deployment
    description: "Human approval required before AI system deployment"
    risk_levels:
      - high-risk
      - unacceptable
    require_human_approval: true
  - gate: autonomous_action
    description: "Human review required for autonomous actions on high-risk systems"
    risk_levels:
      - high-risk
    require_human_review: true
    max_autonomous_actions: 0
  - gate: data_processing
    description: "Human oversight of training data processing"
    risk_levels:
      - high-risk
    require_human_review: true
  - gate: output_review
    description: "Output review for limited and high-risk systems"
    risk_levels:
      - high-risk
      - limited-risk
    require_human_review: true
`,
    },
    {
      name: 'transparency.yaml',
      content: `# EU AI Act — Transparency requirements
# Transparency obligations per Article 13.
policy: transparency
framework: eu-ai-act
level: error
rules:
  - requirement: ai_disclosure
    description: "Users must be informed they are interacting with an AI system"
    applies_to:
      - high-risk
      - limited-risk
  - requirement: capability_documentation
    description: "AI capabilities and limitations must be documented"
    applies_to:
      - high-risk
  - requirement: decision_explanation
    description: "AI-assisted decisions must include explanation of reasoning"
    applies_to:
      - high-risk
  - requirement: data_provenance
    description: "Training data sources must be documented and traceable"
    applies_to:
      - high-risk
  - requirement: version_tracking
    description: "AI system versions must be tracked and documented"
    applies_to:
      - high-risk
      - limited-risk
`,
    },
  ],
};
