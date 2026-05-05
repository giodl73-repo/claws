# voice-call-flow.lobster — workflow shipped by the voice-call plugin

name: voice-call-voice-call-flow
description: communication workflow

steps:
  - id: prepare
    pipeline: voice-call/prepare
    out: prepared

  - id: act
    pipeline: voice-call/initiate-call
    in: prepared
    out: result
