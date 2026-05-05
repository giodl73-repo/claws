# tts-flow.lobster — workflow shipped by the tts plugin

name: tts-tts-flow
description: media workflow

steps:
  - id: prepare
    pipeline: tts/prepare
    out: prepared

  - id: act
    pipeline: tts/synthesize
    in: prepared
    out: result
