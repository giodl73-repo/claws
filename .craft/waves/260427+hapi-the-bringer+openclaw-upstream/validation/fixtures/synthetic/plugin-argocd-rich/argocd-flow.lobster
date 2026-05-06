# argocd-flow.lobster — workflow shipped by the argocd plugin

name: argocd-argocd-flow
description: infra workflow

steps:
  - id: prepare
    pipeline: argocd/prepare
    out: prepared

  - id: act
    pipeline: argocd/sync
    in: prepared
    out: result
