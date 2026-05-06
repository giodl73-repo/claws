# azure-cli-flow.lobster — workflow shipped by the azure-cli plugin

name: azure-cli-azure-cli-flow
description: infra workflow

steps:
  - id: prepare
    pipeline: azure-cli/prepare
    out: prepared

  - id: act
    pipeline: azure-cli/list-resources
    in: prepared
    out: result
