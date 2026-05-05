# shell-flow.lobster — workflow shipped by the shell plugin

name: shell-shell-flow
description: system workflow

steps:
  - id: prepare
    pipeline: shell/prepare
    out: prepared

  - id: act
    pipeline: shell/exec
    in: prepared
    out: result
