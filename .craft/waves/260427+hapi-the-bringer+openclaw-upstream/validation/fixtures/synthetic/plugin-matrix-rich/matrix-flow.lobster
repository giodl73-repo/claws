# matrix-flow.lobster — workflow shipped by the matrix plugin

name: matrix-matrix-flow
description: communication workflow

steps:
  - id: prepare
    pipeline: matrix/prepare
    out: prepared

  - id: act
    pipeline: matrix/send-message
    in: prepared
    out: result
