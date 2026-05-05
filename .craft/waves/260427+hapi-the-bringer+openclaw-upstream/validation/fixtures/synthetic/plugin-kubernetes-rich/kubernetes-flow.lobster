# kubernetes-flow.lobster — workflow shipped by the kubernetes plugin

name: kubernetes-kubernetes-flow
description: developer workflow

steps:
  - id: prepare
    pipeline: kubernetes/prepare
    out: prepared

  - id: act
    pipeline: kubernetes/list-pods
    in: prepared
    out: result
