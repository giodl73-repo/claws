# whisper-flow.lobster — workflow shipped by the whisper plugin

name: whisper-whisper-flow
description: media workflow

steps:
  - id: prepare
    pipeline: whisper/prepare
    out: prepared

  - id: act
    pipeline: whisper/transcribe
    in: prepared
    out: result
