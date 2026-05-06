# clickhouse-flow.lobster — workflow shipped by the clickhouse plugin

name: clickhouse-clickhouse-flow
description: data workflow

steps:
  - id: prepare
    pipeline: clickhouse/prepare
    out: prepared

  - id: act
    pipeline: clickhouse/query
    in: prepared
    out: result
