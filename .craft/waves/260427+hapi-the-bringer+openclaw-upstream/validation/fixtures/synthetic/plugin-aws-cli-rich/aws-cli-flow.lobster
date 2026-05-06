# aws-cli-flow.lobster — workflow shipped by the aws-cli plugin

name: aws-cli-aws-cli-flow
description: infra workflow

steps:
  - id: prepare
    pipeline: aws-cli/prepare
    out: prepared

  - id: act
    pipeline: aws-cli/describe
    in: prepared
    out: result
