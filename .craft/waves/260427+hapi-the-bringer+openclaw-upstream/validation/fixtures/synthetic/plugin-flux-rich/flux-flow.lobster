# flux-flow.lobster — workflow shipped by the flux plugin

name: flux-flux-flow
description: infra workflow

steps:
  - id: prepare
    pipeline: flux/prepare
    out: prepared

  - id: act
    pipeline: flux/reconcile
    in: prepared
    out: result
