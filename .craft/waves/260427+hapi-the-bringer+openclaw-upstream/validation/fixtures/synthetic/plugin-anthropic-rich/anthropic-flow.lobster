# anthropic-flow.lobster — workflow shipped by the anthropic plugin

name: anthropic-anthropic-flow
description: ai_ml workflow

steps:
  - id: prepare
    pipeline: anthropic/prepare
    out: prepared

  - id: act
    pipeline: anthropic/chat-complete
    in: prepared
    out: result
