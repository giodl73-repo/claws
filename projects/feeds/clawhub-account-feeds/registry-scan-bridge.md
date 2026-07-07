# Registry And Scan Bridge

## Goal

Define how ClawHub account feeds become candidates for OpenClaw registry review
without bypassing scans, approval, or local policy.

## Product Behavior

- ClawHub can export account or publisher feed entries into an OpenClaw review
  lane.
- Registry systems can preserve ClawHub provenance and feed revision metadata.
- OpenClaw review and scans remain required before registry inclusion.
- Registry decisions can be reflected back to ClawHub as separate status, not
  as a replacement for ClawHub official state.

## Export Shape

Suggested exported facts:

- ClawHub feed id and feed revision
- account id and publisher id
- package id/version/source
- artifact URL and artifact digest
- ClawHub official state, if any
- ClawHub scan/review state, if any

## Boundaries

- ClawHub official status is source identity signal, not OpenClaw approval.
- OpenClaw registry inclusion is a downstream review result.
- Local approval is separate from OpenClaw registry inclusion.
- OpenClaw install eligibility remains gated by verified feed state, source
  profile trust, package integrity, and local policy.

## Role Review Requirements

- Export only explicit facts, not inferred trust. The receiving registry should
  make its own review decision from ClawHub provenance, scans, and source data.
- Include audit ids or export ids so a registry decision can be traced back to
  the exact ClawHub feed revision and export event.
- Define retry, duplicate submission, withdrawal, and resubmission behavior
  before wiring automation.
- Reflect registry decisions back into ClawHub as separate status fields, not as
  mutations of ClawHub official state.
- Treat ClawHub scans as useful input, not a replacement for OpenClaw security
  scans.

## Open Questions

- Which OpenClaw review API receives ClawHub candidates first?
- Should registry feedback be pulled by ClawHub or pushed into ClawHub?
- What scan states does ClawHub already produce?
- What minimum evidence package does the registry require for a first candidate?
