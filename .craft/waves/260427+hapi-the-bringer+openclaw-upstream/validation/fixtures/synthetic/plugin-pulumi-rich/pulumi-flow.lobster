# pulumi-flow.lobster — workflow shipped by the pulumi plugin

name: pulumi-pulumi-flow
description: infra workflow

steps:
  - id: prepare
    pipeline: pulumi/prepare
    out: prepared

  - id: act
    pipeline: pulumi/preview
    in: prepared
    out: result
