# clickup-flow.lobster — workflow shipped by the clickup plugin

name: clickup-clickup-flow
description: productivity workflow

steps:
  - id: prepare
    pipeline: clickup/prepare
    out: prepared

  - id: act
    pipeline: clickup/create-task
    in: prepared
    out: result
