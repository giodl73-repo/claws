# spotify-flow.lobster — workflow shipped by the spotify plugin

name: spotify-spotify-flow
description: media workflow

steps:
  - id: prepare
    pipeline: spotify/prepare
    out: prepared

  - id: act
    pipeline: spotify/play-track
    in: prepared
    out: result
