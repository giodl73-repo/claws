# linear-flow.lobster — workflow shipped by the linear plugin

name: linear-linear-flow
description: productivity workflow

steps:
  - id: prepare
    pipeline: linear/prepare
    out: prepared

  - id: act
    pipeline: linear/create-issue
    in: prepared
    out: result
