# zoom-flow.lobster — workflow shipped by the zoom plugin

name: zoom-zoom-flow
description: work workflow

steps:
  - id: prepare
    pipeline: zoom/prepare
    out: prepared

  - id: act
    pipeline: zoom/create-meeting
    in: prepared
    out: result
