# Synthetic: triggers oclint-rules-lobster-yaml-starter/step/shell-tool-collision.
# Two steps reference in-process tool names via `command:` — should fail at
# shell-exec time. Lint should flag both.

name: ingest-pipeline
description: example workflow exercising the shell-tool-collision rule

steps:
  - id: fetch-source
    command: openclaw.invoke fetch --url https://example.com/data.json
    out: data

  - id: classify
    command: llm_task.invoke classify --in data
    in: data
    out: classified

  - id: legitimate-shell
    command: jq '.results[]' classified.json
    in: classified
