# snowflake-flow.lobster — workflow shipped by the snowflake plugin

name: snowflake-snowflake-flow
description: data workflow

steps:
  - id: prepare
    pipeline: snowflake/prepare
    out: prepared

  - id: act
    pipeline: snowflake/query
    in: prepared
    out: result
