# obsidian-flow.lobster — workflow shipped by the obsidian plugin

name: obsidian-obsidian-flow
description: productivity workflow

steps:
  - id: prepare
    pipeline: obsidian/prepare
    out: prepared

  - id: act
    pipeline: obsidian/read-note
    in: prepared
    out: result
