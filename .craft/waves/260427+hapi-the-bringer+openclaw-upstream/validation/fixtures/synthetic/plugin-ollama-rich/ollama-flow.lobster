# ollama-flow.lobster — workflow shipped by the ollama plugin

name: ollama-ollama-flow
description: ai_ml workflow

steps:
  - id: prepare
    pipeline: ollama/prepare
    out: prepared

  - id: act
    pipeline: ollama/generate
    in: prepared
    out: result
