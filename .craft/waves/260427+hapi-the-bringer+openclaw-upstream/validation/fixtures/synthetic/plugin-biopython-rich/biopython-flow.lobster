# biopython-flow.lobster — workflow shipped by the biopython plugin

name: biopython-biopython-flow
description: science workflow

steps:
  - id: prepare
    pipeline: biopython/prepare
    out: prepared

  - id: act
    pipeline: biopython/fetch-gene
    in: prepared
    out: result
