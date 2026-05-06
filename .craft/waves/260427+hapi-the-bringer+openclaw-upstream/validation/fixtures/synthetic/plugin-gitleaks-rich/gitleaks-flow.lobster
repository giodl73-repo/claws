# gitleaks-flow.lobster — workflow shipped by the gitleaks plugin

name: gitleaks-gitleaks-flow
description: security workflow

steps:
  - id: prepare
    pipeline: gitleaks/prepare
    out: prepared

  - id: act
    pipeline: gitleaks/scan
    in: prepared
    out: result
