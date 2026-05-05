# openhue-flow.lobster — workflow shipped by the openhue plugin

name: openhue-openhue-flow
description: home workflow

steps:
  - id: prepare
    pipeline: openhue/prepare
    out: prepared

  - id: act
    pipeline: openhue/set-light
    in: prepared
    out: result
