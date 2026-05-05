# stripe-flow.lobster — workflow shipped by the stripe plugin

name: stripe-stripe-flow
description: finance workflow

steps:
  - id: prepare
    pipeline: stripe/prepare
    out: prepared

  - id: act
    pipeline: stripe/create-charge
    in: prepared
    out: result
