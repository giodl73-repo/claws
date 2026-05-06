# helm-flow.lobster — workflow shipped by the helm plugin

name: helm-helm-flow
description: infra workflow

steps:
  - id: prepare
    pipeline: helm/prepare
    out: prepared

  - id: act
    pipeline: helm/list
    in: prepared
    out: result
