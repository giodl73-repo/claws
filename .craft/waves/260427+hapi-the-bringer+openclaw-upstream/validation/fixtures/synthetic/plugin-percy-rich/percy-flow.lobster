# percy-flow.lobster — workflow shipped by the percy plugin

name: percy-percy-flow
description: testing workflow

steps:
  - id: prepare
    pipeline: percy/prepare
    out: prepared

  - id: act
    pipeline: percy/snapshot
    in: prepared
    out: result
