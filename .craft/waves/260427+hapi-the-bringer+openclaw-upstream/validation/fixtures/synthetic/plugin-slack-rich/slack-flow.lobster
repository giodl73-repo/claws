# slack-flow.lobster — workflow shipped by the slack plugin

name: slack-slack-flow
description: communication workflow

steps:
  - id: prepare
    pipeline: slack/prepare
    out: prepared

  - id: act
    pipeline: slack/post-message
    in: prepared
    out: result
