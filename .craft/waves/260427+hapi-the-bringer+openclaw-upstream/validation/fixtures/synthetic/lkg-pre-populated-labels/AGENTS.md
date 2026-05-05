# Agent

Fixture for the LKG labels feature. After staging, run:

  openclaw-cage promote --label baseline scratch/lkg-pre-populated-labels
  openclaw-cage labels scratch/lkg-pre-populated-labels
  echo "broken bytes" > scratch/lkg-pre-populated-labels/AGENTS.md
  openclaw-cage rollback --label baseline scratch/lkg-pre-populated-labels

The rollback should restore THIS file's bytes.

## Boundaries

- example boundary
