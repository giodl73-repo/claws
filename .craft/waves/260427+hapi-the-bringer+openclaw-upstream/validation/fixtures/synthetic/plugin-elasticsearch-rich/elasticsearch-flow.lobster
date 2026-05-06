# elasticsearch-flow.lobster — workflow shipped by the elasticsearch plugin

name: elasticsearch-elasticsearch-flow
description: data workflow

steps:
  - id: prepare
    pipeline: elasticsearch/prepare
    out: prepared

  - id: act
    pipeline: elasticsearch/search
    in: prepared
    out: result
