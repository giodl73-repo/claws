# mcporter-flow.lobster — workflow shipped by the mcporter plugin

name: mcporter-mcporter-flow
description: developer workflow

steps:
  - id: prepare
    pipeline: mcporter/prepare
    out: prepared

  - id: act
    pipeline: mcporter/list-mcp-servers
    in: prepared
    out: result
