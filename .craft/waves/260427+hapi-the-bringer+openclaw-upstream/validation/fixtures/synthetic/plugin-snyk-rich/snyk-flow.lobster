# snyk-flow.lobster — workflow shipped by the snyk plugin

name: snyk-snyk-flow
description: security workflow

steps:
  - id: prepare
    pipeline: snyk/prepare
    out: prepared

  - id: act
    pipeline: snyk/scan
    in: prepared
    out: result
