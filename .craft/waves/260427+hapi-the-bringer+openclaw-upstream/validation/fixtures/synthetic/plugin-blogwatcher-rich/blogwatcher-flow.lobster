# blogwatcher-flow.lobster — workflow shipped by the blogwatcher plugin

name: blogwatcher-blogwatcher-flow
description: search workflow

steps:
  - id: prepare
    pipeline: blogwatcher/prepare
    out: prepared

  - id: act
    pipeline: blogwatcher/list-feeds
    in: prepared
    out: result
