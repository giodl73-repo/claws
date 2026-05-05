# semantic-search-flow.lobster — workflow shipped by the semantic-search plugin

name: semantic-search-semantic-search-flow
description: search workflow

steps:
  - id: prepare
    pipeline: semantic-search/prepare
    out: prepared

  - id: act
    pipeline: semantic-search/index
    in: prepared
    out: result
