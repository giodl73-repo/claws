# sharepoint-flow.lobster — workflow shipped by the sharepoint plugin

name: sharepoint-sharepoint-flow
description: work workflow

steps:
  - id: prepare
    pipeline: sharepoint/prepare
    out: prepared

  - id: act
    pipeline: sharepoint/read-doc
    in: prepared
    out: result
