# k6-flow.lobster — workflow shipped by the k6 plugin

name: k6-k6-flow
description: testing workflow

steps:
  - id: prepare
    pipeline: k6/prepare
    out: prepared

  - id: act
    pipeline: k6/run-load-test
    in: prepared
    out: result
