# gnuplot-flow.lobster — workflow shipped by the gnuplot plugin

name: gnuplot-gnuplot-flow
description: science workflow

steps:
  - id: prepare
    pipeline: gnuplot/prepare
    out: prepared

  - id: act
    pipeline: gnuplot/plot
    in: prepared
    out: result
