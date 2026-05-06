# trivy-flow.lobster — workflow shipped by the trivy plugin

name: trivy-trivy-flow
description: security workflow

steps:
  - id: prepare
    pipeline: trivy/prepare
    out: prepared

  - id: act
    pipeline: trivy/scan-image
    in: prepared
    out: result
