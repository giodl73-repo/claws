# sympy-flow.lobster — workflow shipped by the sympy plugin

name: sympy-sympy-flow
description: science workflow

steps:
  - id: prepare
    pipeline: sympy/prepare
    out: prepared

  - id: act
    pipeline: sympy/solve
    in: prepared
    out: result
