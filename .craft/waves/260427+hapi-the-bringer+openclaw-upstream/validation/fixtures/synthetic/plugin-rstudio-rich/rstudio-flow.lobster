# rstudio-flow.lobster — workflow shipped by the rstudio plugin

name: rstudio-rstudio-flow
description: science workflow

steps:
  - id: prepare
    pipeline: rstudio/prepare
    out: prepared

  - id: act
    pipeline: rstudio/run-script
    in: prepared
    out: result
