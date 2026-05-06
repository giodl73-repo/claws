# hashicorp-vault-flow.lobster — workflow shipped by the hashicorp-vault plugin

name: hashicorp-vault-hashicorp-vault-flow
description: security workflow

steps:
  - id: prepare
    pipeline: hashicorp-vault/prepare
    out: prepared

  - id: act
    pipeline: hashicorp-vault/read-secret
    in: prepared
    out: result
