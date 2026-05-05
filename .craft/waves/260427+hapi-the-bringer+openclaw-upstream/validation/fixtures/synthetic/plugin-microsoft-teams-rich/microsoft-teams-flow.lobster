# microsoft-teams-flow.lobster — workflow shipped by the microsoft-teams plugin

name: microsoft-teams-microsoft-teams-flow
description: work workflow

steps:
  - id: prepare
    pipeline: microsoft-teams/prepare
    out: prepared

  - id: act
    pipeline: microsoft-teams/send-message
    in: prepared
    out: result
