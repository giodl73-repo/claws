# Compliance: EU AI Act

<!-- atom:compliance-eu-ai-act (C72) -->

## The short version

`claws assess` classifies an AI system against the EU AI Act (Regulation 2024/1689) Article 6 risk categories: unacceptable, high, limited, or minimal. This is a system-level classification -- the entire AI deployment, not individual tools. It is fundamentally different from per-tool R1-R5 risk scoring. A system classified as "limited risk" under the EU AI Act may still contain R5 tools that require elicitation gates. The two classifications operate at different levels and serve different purposes.

---

## Article 6 risk categories

The EU AI Act classifies AI systems into four risk tiers. The classification determines which regulatory obligations apply.

| Category     | Definition                                                                                                                                                               | Obligations                                                                                                                                                    | Deadline           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Unacceptable | AI systems that pose an unacceptable risk to fundamental rights (social scoring, real-time biometric identification in public spaces, manipulation of vulnerable groups) | **Prohibited.** Cannot be deployed.                                                                                                                            | February 2, 2025   |
| High-risk    | AI systems listed in Annex III or used as safety components of products covered by Annex I                                                                               | Full conformity: risk management, data governance, technical documentation, record-keeping, transparency, human oversight, accuracy, robustness, cybersecurity | **August 2, 2026** |
| Limited      | AI systems that interact with people (chatbots), generate synthetic content, or perform emotion recognition                                                              | Transparency obligations: users must be informed they are interacting with AI                                                                                  | August 2, 2025     |
| Minimal      | All other AI systems                                                                                                                                                     | No mandatory requirements (voluntary codes of practice encouraged)                                                                                             | N/A                |

---

## R1-R5 is not Article 6

This distinction is critical for compliance officers. The two risk classifications operate at different levels:

| Dimension                       | R1-R5 (tool classification)                               | Article 6 (system classification)           |
| ------------------------------- | --------------------------------------------------------- | ------------------------------------------- |
| **What is classified**          | Individual tools (send-email, read-file, execute-command) | The entire AI system as deployed            |
| **Who defines it**              | claws governance policy                                   | EU AI Act, Article 6, Annex III             |
| **Purpose**                     | Determine governance controls per tool                    | Determine regulatory obligations per system |
| **Scale**                       | 5 levels (R1 observe through R5 transact)                 | 4 categories (minimal through unacceptable) |
| **A "limited" system can have** | R5 tools that require full elicitation gates              | Transparency obligations only               |

A customer service chatbot classified as "limited risk" under Article 6 may still use an R5 send-email tool that requires deny-default elicitation. The system-level classification does not reduce per-tool governance.

---

## Annex III: High-risk categories

Annex III lists the specific use cases that trigger high-risk classification. If an AI system falls under any of these categories, it is high-risk regardless of its tool-level classification.

| Annex III Category                               | Examples                                        | claws detection                                       |
| ------------------------------------------------ | ----------------------------------------------- | ----------------------------------------------------- |
| 1(a) Biometric identification                    | Facial recognition, voice identification        | Tool classification: biometric tools flagged as R4+   |
| 1(b) Biometric categorization                    | Emotion detection, demographic inference        | Data labels: biometric data classified RESTRICTED     |
| 3(a) Education: access and assessment            | Automated grading, admissions decisions         | Workspace context: education-sector template          |
| 4(a) Employment: recruitment and selection       | Resume screening, candidate ranking             | Workspace context: HR-sector template                 |
| 5(a) Essential services: credit scoring          | Loan approval, insurance underwriting           | Tool classification: financial decision tools flagged |
| 6(a) Law enforcement: individual risk assessment | Predictive policing, recidivism scoring         | Workspace context: law enforcement template           |
| 8(a) AI used as safety component                 | Medical device AI, autonomous vehicle component | Annex I product integration declared in config        |

`claws assess` checks the workspace configuration, tool inventory, and data labels against these categories. The classification includes a reasoning chain: "Classified as High-risk because: Annex III category 4(a) -- system performs candidate ranking for recruitment."

---

## Article obligations by classification

| Article | Obligation                | Minimal | Limited      | High         | claws evidence                                    |
| ------- | ------------------------- | ------- | ------------ | ------------ | ------------------------------------------------- |
| Art. 9  | Risk management system    | --      | Applicable   | **Required** | `claws assess risk` output                        |
| Art. 10 | Data governance           | --      | --           | **Required** | Data label inventory + flow records               |
| Art. 11 | Technical documentation   | --      | --           | **Required** | `claws scan manifest` (AIBOM)                     |
| Art. 12 | Record-keeping            | --      | --           | **Required** | Audit chain export                                |
| Art. 13 | Transparency              | --      | **Required** | **Required** | System description + capability disclosure        |
| Art. 14 | Human oversight           | --      | Applicable   | **Required** | Elicitation gate configuration + approval records |
| Art. 15 | Accuracy and robustness   | --      | --           | **Required** | Tool classification + fail-mode records           |
| Art. 17 | Quality management system | --      | --           | **Required** | Policy version history + drift detection records  |

"Applicable" means the article applies but with reduced obligations. "Required" means full conformity assessment is mandatory.

---

## The assessment output

`claws assess` produces a structured assessment:

| Section                        | Contents                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **System classification**      | Article 6 category (minimal/limited/high/unacceptable)                                                    |
| **Annex III match**            | Specific Annex III category, if applicable, with rationale                                                |
| **Reasoning chain**            | Why this classification was chosen, based on tool inventory, data labels, and workspace context           |
| **Article 13 transparency**    | System description, capabilities disclosed, limitations disclosed, human oversight description            |
| **Article 14 human oversight** | OBO gates configured, deny-default enabled, kill switch available, oversight level (full/partial/minimal) |
| **Applicable articles**        | Which articles apply at this classification level, with current compliance status                         |
| **Signature**                  | Ed25519 or HMAC signature over the assessment                                                             |

---

## Deadlines

| Obligation                                  | Deadline           | Status        |
| ------------------------------------------- | ------------------ | ------------- |
| Prohibited AI practices (unacceptable risk) | February 2, 2025   | **In effect** |
| GPAI model obligations                      | August 2, 2025     | **In effect** |
| Limited-risk transparency obligations       | August 2, 2025     | **In effect** |
| High-risk system conformity (Annex III)     | **August 2, 2026** | Approaching   |
| High-risk safety components (Annex I)       | August 2, 2027     | Future        |

For most enterprise AI deployments, the critical deadline is August 2, 2026 for Annex III high-risk systems.

---

## What to tell the board

The EU AI Act classifies AI systems at the system level, not the tool level. `claws assess` determines which category applies to each deployment and identifies the specific regulatory obligations. This is separate from per-tool governance -- a system classified as "limited risk" still enforces full governance on individual high-risk tools. The assessment includes a reasoning chain so the classification can be explained to regulators, and the output is signed for evidence integrity.

---

## Scenario-Driven Additions

### From compliance-evidence scenarios (48 findings applied)

- EU AI Act classification must be explicit configuration, not automated inference -- the system cannot self-classify its own risk level
- Article 14 human understanding assessment goes beyond gate configuration: evidence must demonstrate that the human oversight mechanism is comprehensible, not just present
- Per-tool risk contributes to system-level risk: evidence maps individual R1-R5 scores to the overall Article 6 system classification
- Annex III category-specific obligation checklists generated per workspace based on declared use case
- Fundamental rights impact assessment section required for high-risk systems, addressing specific rights potentially affected
- Article 14(4) specific requirements mapping: high-risk systems used in law enforcement, migration, or democratic processes have additional oversight obligations
- Unacceptable-risk system detection blocks evidence generation entirely -- prohibited systems cannot produce compliance evidence

## Related concepts

- [Tool Classification](tool-classification.md) -- R1-R5 per-tool scoring (different from Article 6)
- [Defense in Depth](defense-in-depth.md) -- the five governance layers that support Art. 9 risk management
- [Elicitation Gate](elicitation-gate.md) -- the human oversight mechanism for Art. 14
- [Compliance: SOC2](compliance-soc2.md) -- complementary evidence for US-based audits
- [Audit Chain](audit-chain.md) -- the record-keeping mechanism for Art. 12
