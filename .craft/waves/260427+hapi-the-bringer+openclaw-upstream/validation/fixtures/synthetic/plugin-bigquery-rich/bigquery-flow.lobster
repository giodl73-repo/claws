# bigquery-flow.lobster — workflow shipped by the bigquery plugin

name: bigquery-bigquery-flow
description: data workflow

steps:
  - id: prepare
    pipeline: bigquery/prepare
    out: prepared

  - id: act
    pipeline: bigquery/query
    in: prepared
    out: result
