# Agents

## root

- Model: claude-sonnet-4-20250514
- Description: Root agent handling CONFIDENTIAL customer data
- Tools: [customer-db, internal-report]
- Trust: T3
- DataCeiling: CONFIDENTIAL
- Delegates:
  - research-agent: customer data analysis

## research-agent

- Model: claude-haiku-4-5-20251001
- Description: Analyzes customer data and produces summaries
- Tools: [customer-db, internal-report]
- Trust: T2
- DataCeiling: CONFIDENTIAL
- Delegates:
  - public-reporter: summary generation

## public-reporter

- Model: claude-haiku-4-5-20251001
- Description: Generates and publishes public-facing summaries
- Tools: [publish-summary]
- Trust: T1
- DataCeiling: PUBLIC
