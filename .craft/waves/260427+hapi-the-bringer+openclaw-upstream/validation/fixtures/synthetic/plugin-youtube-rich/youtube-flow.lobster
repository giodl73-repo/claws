# youtube-flow.lobster — workflow shipped by the youtube plugin

name: youtube-youtube-flow
description: media workflow

steps:
  - id: prepare
    pipeline: youtube/prepare
    out: prepared

  - id: act
    pipeline: youtube/search
    in: prepared
    out: result
