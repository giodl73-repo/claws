# aws-secrets-manager-flow.lobster — workflow shipped by the aws-secrets-manager plugin

name: aws-secrets-manager-aws-secrets-manager-flow
description: security workflow

steps:
  - id: prepare
    pipeline: aws-secrets-manager/prepare
    out: prepared

  - id: act
    pipeline: aws-secrets-manager/get-secret
    in: prepared
    out: result
