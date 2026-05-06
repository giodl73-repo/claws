# redis-flow.lobster — workflow shipped by the redis plugin

name: redis-redis-flow
description: data workflow

steps:
  - id: prepare
    pipeline: redis/prepare
    out: prepared

  - id: act
    pipeline: redis/get
    in: prepared
    out: result
