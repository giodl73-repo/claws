# trello-flow.lobster — workflow shipped by the trello plugin

name: trello-trello-flow
description: productivity workflow

steps:
  - id: prepare
    pipeline: trello/prepare
    out: prepared

  - id: act
    pipeline: trello/create-card
    in: prepared
    out: result
