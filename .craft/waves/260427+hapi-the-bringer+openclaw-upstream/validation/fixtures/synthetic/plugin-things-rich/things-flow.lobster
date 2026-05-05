# things-flow.lobster — workflow shipped by the things plugin

name: things-things-flow
description: productivity workflow

steps:
  - id: prepare
    pipeline: things/prepare
    out: prepared

  - id: act
    pipeline: things/create-todo
    in: prepared
    out: result
