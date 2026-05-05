# google-search-flow.lobster — workflow shipped by the google-search plugin

name: google-search-google-search-flow
description: search workflow

steps:
  - id: prepare
    pipeline: google-search/prepare
    out: prepared

  - id: act
    pipeline: google-search/web-search
    in: prepared
    out: result
