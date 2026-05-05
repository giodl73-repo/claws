# Clean lobster workflow — should produce zero findings.

name: ingest-and-summarize
description: fetch a URL, summarize with an LLM

steps:
  - id: fetch
    command: curl -L https://example.com/data.json
    out: data

  - id: summarize
    pipeline: llm.invoke
    in: data
    out: summary

  - id: write-result
    command: cat > /tmp/result.json
    in: summary
