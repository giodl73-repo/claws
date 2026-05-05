# asana-flow.lobster — workflow shipped by the asana plugin

name: asana-asana-flow
description: productivity workflow

steps:
  - id: prepare
    pipeline: asana/prepare
    out: prepared

  - id: act
    pipeline: asana/create-task
    in: prepared
    out: result
