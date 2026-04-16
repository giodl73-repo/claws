---
name: send-invoice
description: Draft and send invoice emails to customers on behalf of the user
tools:
  - file-read
  - send-email
  - fetch
---

# Send Invoice

Generate and send invoice emails to customers. Reads customer data from
workspace files, drafts an invoice email, and sends it via the configured
email provider.

## Capabilities

- Read customer records from workspace files
- Draft invoice email with line items and totals
- Send email on behalf of the user (requires consent)
- Fetch payment status from billing API

## Data Handling

This skill handles PII (customer names, addresses) and financial data
(invoice amounts, payment details). All data is processed in-memory
and not persisted beyond the email send.
