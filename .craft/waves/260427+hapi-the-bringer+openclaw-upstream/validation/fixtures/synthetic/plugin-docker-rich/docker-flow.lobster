# docker-flow.lobster — workflow shipped by the docker plugin

name: docker-docker-flow
description: developer workflow

steps:
  - id: prepare
    pipeline: docker/prepare
    out: prepared

  - id: act
    pipeline: docker/build-image
    in: prepared
    out: result
