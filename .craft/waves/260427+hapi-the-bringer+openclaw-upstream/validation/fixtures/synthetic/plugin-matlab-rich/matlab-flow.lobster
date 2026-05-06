# matlab-flow.lobster — workflow shipped by the matlab plugin

name: matlab-matlab-flow
description: science workflow

steps:
  - id: prepare
    pipeline: matlab/prepare
    out: prepared

  - id: act
    pipeline: matlab/run-script
    in: prepared
    out: result
