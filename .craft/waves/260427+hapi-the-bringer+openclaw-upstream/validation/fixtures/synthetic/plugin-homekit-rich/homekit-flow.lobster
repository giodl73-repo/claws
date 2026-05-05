# homekit-flow.lobster — workflow shipped by the homekit plugin

name: homekit-homekit-flow
description: home workflow

steps:
  - id: prepare
    pipeline: homekit/prepare
    out: prepared

  - id: act
    pipeline: homekit/set-state
    in: prepared
    out: result
