# Synthetic: triggers oclint-rules-lobster-yaml-starter/step/duplicate-id.
# Two steps share `id: classify` — the second silently overwrites the
# first at runtime resolution; lint catches it before deploy.

name: ingest-and-classify
description: example workflow with a duplicate step id

steps:
  - id: fetch-source
    command: curl -L https://example.com/data.json
    out: data

  - id: classify
    pipeline: llm.invoke
    in: data
    out: classified-v1

  - id: classify
    pipeline: llm.invoke
    in: data
    out: classified-v2
