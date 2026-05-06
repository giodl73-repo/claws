# cloudflare-flow.lobster — workflow shipped by the cloudflare plugin

name: cloudflare-cloudflare-flow
description: infra workflow

steps:
  - id: prepare
    pipeline: cloudflare/prepare
    out: prepared

  - id: act
    pipeline: cloudflare/list-zones
    in: prepared
    out: result
