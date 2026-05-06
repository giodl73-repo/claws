# jupyter-flow.lobster — workflow shipped by the jupyter plugin

name: jupyter-jupyter-flow
description: science workflow

steps:
  - id: prepare
    pipeline: jupyter/prepare
    out: prepared

  - id: act
    pipeline: jupyter/execute-cell
    in: prepared
    out: result
