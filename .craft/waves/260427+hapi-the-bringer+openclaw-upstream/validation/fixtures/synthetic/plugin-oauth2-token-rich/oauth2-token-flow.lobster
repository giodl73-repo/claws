# oauth2-token-flow.lobster — workflow shipped by the oauth2-token plugin

name: oauth2-token-oauth2-token-flow
description: security workflow

steps:
  - id: prepare
    pipeline: oauth2-token/prepare
    out: prepared

  - id: act
    pipeline: oauth2-token/exchange-code
    in: prepared
    out: result
