# github-flow.lobster — workflow shipped by the github plugin

name: github-github-flow
description: developer workflow

steps:
  - id: prepare
    pipeline: github/prepare
    out: prepared

  - id: act
    pipeline: github/create-issue
    in: prepared
    out: result
