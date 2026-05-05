# ssh-flow.lobster — workflow shipped by the ssh plugin

name: ssh-ssh-flow
description: system workflow

steps:
  - id: prepare
    pipeline: ssh/prepare
    out: prepared

  - id: act
    pipeline: ssh/exec-remote
    in: prepared
    out: result
