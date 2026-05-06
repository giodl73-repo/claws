# airflow-flow.lobster — workflow shipped by the airflow plugin

name: airflow-airflow-flow
description: data workflow

steps:
  - id: prepare
    pipeline: airflow/prepare
    out: prepared

  - id: act
    pipeline: airflow/trigger-dag
    in: prepared
    out: result
