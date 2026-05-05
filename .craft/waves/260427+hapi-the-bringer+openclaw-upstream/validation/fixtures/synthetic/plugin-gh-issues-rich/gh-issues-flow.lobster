# gh-issues-flow.lobster — workflow shipped by the gh-issues plugin

name: gh-issues-gh-issues-flow
description: developer workflow

steps:
  - id: prepare
    pipeline: gh-issues/prepare
    out: prepared

  - id: act
    pipeline: gh-issues/create-issue
    in: prepared
    out: result
