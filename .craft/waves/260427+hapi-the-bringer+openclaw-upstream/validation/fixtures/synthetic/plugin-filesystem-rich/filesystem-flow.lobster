# filesystem-flow.lobster — workflow shipped by the filesystem plugin

name: filesystem-filesystem-flow
description: system workflow

steps:
  - id: prepare
    pipeline: filesystem/prepare
    out: prepared

  - id: act
    pipeline: filesystem/read
    in: prepared
    out: result
