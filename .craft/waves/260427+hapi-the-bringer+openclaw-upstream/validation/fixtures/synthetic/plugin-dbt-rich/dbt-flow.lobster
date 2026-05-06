# dbt-flow.lobster — workflow shipped by the dbt plugin

name: dbt-dbt-flow
description: data workflow

steps:
  - id: prepare
    pipeline: dbt/prepare
    out: prepared

  - id: act
    pipeline: dbt/run-model
    in: prepared
    out: result
