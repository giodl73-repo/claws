# openai-flow.lobster — workflow shipped by the openai plugin

name: openai-openai-flow
description: ai_ml workflow

steps:
  - id: prepare
    pipeline: openai/prepare
    out: prepared

  - id: act
    pipeline: openai/chat-complete
    in: prepared
    out: result
