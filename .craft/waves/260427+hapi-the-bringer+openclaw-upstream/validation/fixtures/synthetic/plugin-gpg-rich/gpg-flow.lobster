# gpg-flow.lobster — workflow shipped by the gpg plugin

name: gpg-gpg-flow
description: security workflow

steps:
  - id: prepare
    pipeline: gpg/prepare
    out: prepared

  - id: act
    pipeline: gpg/encrypt
    in: prepared
    out: result
