# nano-pdf-flow.lobster — workflow shipped by the nano-pdf plugin

name: nano-pdf-nano-pdf-flow
description: media workflow

steps:
  - id: prepare
    pipeline: nano-pdf/prepare
    out: prepared

  - id: act
    pipeline: nano-pdf/extract-text
    in: prepared
    out: result
