# detox-flow.lobster — workflow shipped by the detox plugin

name: detox-detox-flow
description: mobile workflow

steps:
  - id: prepare
    pipeline: detox/prepare
    out: prepared

  - id: act
    pipeline: detox/run-test
    in: prepared
    out: result
