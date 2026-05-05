# system-info-flow.lobster — workflow shipped by the system-info plugin

name: system-info-system-info-flow
description: system workflow

steps:
  - id: prepare
    pipeline: system-info/prepare
    out: prepared

  - id: act
    pipeline: system-info/get-cpu
    in: prepared
    out: result
