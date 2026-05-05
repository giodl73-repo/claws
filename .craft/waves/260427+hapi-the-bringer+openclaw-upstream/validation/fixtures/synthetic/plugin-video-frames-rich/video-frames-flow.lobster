# video-frames-flow.lobster — workflow shipped by the video-frames plugin

name: video-frames-video-frames-flow
description: media workflow

steps:
  - id: prepare
    pipeline: video-frames/prepare
    out: prepared

  - id: act
    pipeline: video-frames/extract
    in: prepared
    out: result
