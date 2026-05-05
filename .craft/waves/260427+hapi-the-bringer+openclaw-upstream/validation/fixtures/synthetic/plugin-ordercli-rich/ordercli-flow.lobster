# ordercli-flow.lobster — workflow shipped by the ordercli plugin

name: ordercli-ordercli-flow
description: finance workflow

steps:
  - id: prepare
    pipeline: ordercli/prepare
    out: prepared

  - id: act
    pipeline: ordercli/place-order
    in: prepared
    out: result
