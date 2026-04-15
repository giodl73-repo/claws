---
name: summarize
description: Read workspace files and produce a structured summary document
tools:
  - file-read
  - file-write
governance:
  audit: true
  approval: manager
---

# Summarize

Read one or more workspace files and produce a structured summary, saved as a new file.

## Usage

Provide a list of file paths. The skill will:
1. Read each file
2. Extract key points and action items
3. Write a summary document to the workspace

## Governance

This skill reads (R2) and writes (R3) workspace files. All file access is logged.
File writes require manager approval before execution.

When published with `claws publish`, this skill earns the governance-verified badge at tier R3.
