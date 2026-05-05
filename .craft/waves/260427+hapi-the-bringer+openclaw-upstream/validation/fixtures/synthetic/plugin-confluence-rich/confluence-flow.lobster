# confluence-flow.lobster — workflow shipped by the confluence plugin

name: confluence-confluence-flow
description: work workflow

steps:
  - id: prepare
    pipeline: confluence/prepare
    out: prepared

  - id: act
    pipeline: confluence/read-page
    in: prepared
    out: result
