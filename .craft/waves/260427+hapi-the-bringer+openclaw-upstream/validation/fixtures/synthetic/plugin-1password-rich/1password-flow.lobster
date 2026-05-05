# 1password-flow.lobster — workflow shipped by the 1password plugin

name: 1password-1password-flow
description: work workflow

steps:
  - id: prepare
    pipeline: 1password/prepare
    out: prepared

  - id: act
    pipeline: 1password/get-secret
    in: prepared
    out: result
