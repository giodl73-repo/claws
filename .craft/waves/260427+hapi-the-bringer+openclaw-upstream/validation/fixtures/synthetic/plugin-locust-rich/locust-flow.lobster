# locust-flow.lobster — workflow shipped by the locust plugin

name: locust-locust-flow
description: testing workflow

steps:
  - id: prepare
    pipeline: locust/prepare
    out: prepared

  - id: act
    pipeline: locust/start-load
    in: prepared
    out: result
