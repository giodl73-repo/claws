# fastly-flow.lobster — workflow shipped by the fastly plugin

name: fastly-fastly-flow
description: infra workflow

steps:
  - id: prepare
    pipeline: fastly/prepare
    out: prepared

  - id: act
    pipeline: fastly/purge
    in: prepared
    out: result
