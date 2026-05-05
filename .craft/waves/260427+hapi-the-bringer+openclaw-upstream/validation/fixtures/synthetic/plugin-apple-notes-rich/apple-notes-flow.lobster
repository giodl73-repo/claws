# apple-notes-flow.lobster — workflow shipped by the apple-notes plugin

name: apple-notes-apple-notes-flow
description: productivity workflow

steps:
  - id: prepare
    pipeline: apple-notes/prepare
    out: prepared

  - id: act
    pipeline: apple-notes/read-note
    in: prepared
    out: result
