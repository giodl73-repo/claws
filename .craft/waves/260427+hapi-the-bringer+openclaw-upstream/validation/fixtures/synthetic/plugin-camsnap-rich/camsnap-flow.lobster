# camsnap-flow.lobster — workflow shipped by the camsnap plugin

name: camsnap-camsnap-flow
description: system workflow

steps:
  - id: prepare
    pipeline: camsnap/prepare
    out: prepared

  - id: act
    pipeline: camsnap/take-photo
    in: prepared
    out: result
