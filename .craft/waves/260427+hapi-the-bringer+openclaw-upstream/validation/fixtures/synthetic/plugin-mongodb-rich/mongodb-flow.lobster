# mongodb-flow.lobster — workflow shipped by the mongodb plugin

name: mongodb-mongodb-flow
description: data workflow

steps:
  - id: prepare
    pipeline: mongodb/prepare
    out: prepared

  - id: act
    pipeline: mongodb/find
    in: prepared
    out: result
