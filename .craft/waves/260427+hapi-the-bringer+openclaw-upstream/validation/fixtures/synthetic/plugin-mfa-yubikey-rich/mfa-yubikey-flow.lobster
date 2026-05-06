# mfa-yubikey-flow.lobster — workflow shipped by the mfa-yubikey plugin

name: mfa-yubikey-mfa-yubikey-flow
description: security workflow

steps:
  - id: prepare
    pipeline: mfa-yubikey/prepare
    out: prepared

  - id: act
    pipeline: mfa-yubikey/challenge
    in: prepared
    out: result
