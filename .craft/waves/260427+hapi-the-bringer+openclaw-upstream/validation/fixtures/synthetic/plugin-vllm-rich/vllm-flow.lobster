# vllm-flow.lobster — workflow shipped by the vllm plugin

name: vllm-vllm-flow
description: ai_ml workflow

steps:
  - id: prepare
    pipeline: vllm/prepare
    out: prepared

  - id: act
    pipeline: vllm/generate
    in: prepared
    out: result
