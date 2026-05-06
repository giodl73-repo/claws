# cosign-flow.lobster — workflow shipped by the cosign plugin

name: cosign-cosign-flow
description: security workflow

steps:
  - id: prepare
    pipeline: cosign/prepare
    out: prepared

  - id: act
    pipeline: cosign/sign-image
    in: prepared
    out: result
