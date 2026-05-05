# npm-flow.lobster — workflow shipped by the npm plugin

name: npm-npm-flow
description: developer workflow

steps:
  - id: prepare
    pipeline: npm/prepare
    out: prepared

  - id: act
    pipeline: npm/publish
    in: prepared
    out: result
