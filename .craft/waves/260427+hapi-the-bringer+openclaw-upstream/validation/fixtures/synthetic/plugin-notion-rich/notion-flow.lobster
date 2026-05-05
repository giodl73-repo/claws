# notion-flow.lobster — workflow shipped by the notion plugin

name: notion-notion-flow
description: productivity workflow

steps:
  - id: prepare
    pipeline: notion/prepare
    out: prepared

  - id: act
    pipeline: notion/read-page
    in: prepared
    out: result
