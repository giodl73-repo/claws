# sonos-flow.lobster — workflow shipped by the sonos plugin

name: sonos-sonos-flow
description: media workflow

steps:
  - id: prepare
    pipeline: sonos/prepare
    out: prepared

  - id: act
    pipeline: sonos/play
    in: prepared
    out: result
