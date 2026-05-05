# discord-flow.lobster — workflow shipped by the discord plugin

name: discord-discord-flow
description: communication workflow

steps:
  - id: prepare
    pipeline: discord/prepare
    out: prepared

  - id: act
    pipeline: discord/post-message
    in: prepared
    out: result
