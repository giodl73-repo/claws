# sqlite-flow.lobster — workflow shipped by the sqlite plugin

name: sqlite-sqlite-flow
description: data workflow

steps:
  - id: prepare
    pipeline: sqlite/prepare
    out: prepared

  - id: act
    pipeline: sqlite/query
    in: prepared
    out: result
