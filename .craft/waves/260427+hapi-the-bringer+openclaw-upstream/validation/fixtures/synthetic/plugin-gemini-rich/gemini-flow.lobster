# gemini-flow.lobster — workflow shipped by the gemini plugin

name: gemini-gemini-flow
description: ai_ml workflow

steps:
  - id: prepare
    pipeline: gemini/prepare
    out: prepared

  - id: act
    pipeline: gemini/chat-complete
    in: prepared
    out: result
