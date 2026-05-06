# postgres-flow.lobster — workflow shipped by the postgres plugin

name: postgres-postgres-flow
description: data workflow

steps:
  - id: prepare
    pipeline: postgres/prepare
    out: prepared

  - id: act
    pipeline: postgres/query
    in: prepared
    out: result
