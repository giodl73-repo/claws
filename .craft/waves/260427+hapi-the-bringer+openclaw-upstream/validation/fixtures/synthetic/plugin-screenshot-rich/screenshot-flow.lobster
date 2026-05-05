# screenshot-flow.lobster — workflow shipped by the screenshot plugin

name: screenshot-screenshot-flow
description: system workflow

steps:
  - id: prepare
    pipeline: screenshot/prepare
    out: prepared

  - id: act
    pipeline: screenshot/capture
    in: prepared
    out: result
