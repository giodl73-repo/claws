# brave-search-flow.lobster — workflow shipped by the brave-search plugin

name: brave-search-brave-search-flow
description: search workflow

steps:
  - id: prepare
    pipeline: brave-search/prepare
    out: prepared

  - id: act
    pipeline: brave-search/web-search
    in: prepared
    out: result
