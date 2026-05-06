# terraform-flow.lobster — workflow shipped by the terraform plugin

name: terraform-terraform-flow
description: infra workflow

steps:
  - id: prepare
    pipeline: terraform/prepare
    out: prepared

  - id: act
    pipeline: terraform/plan
    in: prepared
    out: result
