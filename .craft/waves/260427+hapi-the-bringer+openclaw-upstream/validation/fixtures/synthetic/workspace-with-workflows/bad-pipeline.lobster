# Demonstrates 2 issues lobster-yaml-starter rules catch:
# (1) shell-tool-collision: step[0].command refs in-process tool name
# (2) duplicate-step-id: step[1] and step[2] share id `classify`

name: ingest-classify-broken
description: example workflow with 2 lint failures

steps:
  - id: fetch-source
    command: openclaw.invoke fetch --url https://example.com/data.json
    out: data

  - id: classify
    pipeline: llm.invoke
    in: data
    out: classified

  - id: classify
    pipeline: llm.invoke
    in: data
    out: classified-v2
