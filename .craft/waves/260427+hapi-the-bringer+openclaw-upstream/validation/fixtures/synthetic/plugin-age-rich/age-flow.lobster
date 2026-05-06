# age-flow.lobster — workflow shipped by the age plugin

name: age-age-flow
description: security workflow

steps:
  - id: prepare
    pipeline: age/prepare
    out: prepared

  - id: act
    pipeline: age/encrypt
    in: prepared
    out: result
