---
name: web-lookup
description: Search the web and summarize results for a given query
tools:
  - web-search
  - web-scrape
governance:
  audit: true
---

# Web Lookup

Search the public web for a topic and return a concise summary with source links.

## Usage

Provide a search query. The skill will:
1. Run a web search for the query
2. Scrape the top 3 results
3. Summarize findings with citations

## Governance

This skill is read-only (R1). All queries and results are logged to the audit trail.
No approval is required.

When published with `claws publish`, this skill earns the governance-verified badge at tier R1.
