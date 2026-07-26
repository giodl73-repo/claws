# RFC 0024 role review

Reviewed: 2026-07-24

Subject: OpenClaw RFC follow-up #49 at pre-fix head
`1fc88cb6bbdc577cb59f6d15f6c87b798e6cc3f4`.

Applied result: RFC head
`a6bb5d727543793b03e40ec91c9548017a32aa26`.

## Panel

| Role | Tension | Review focus |
| --- | --- | --- |
| `claws:new-hire` | Approachability over completeness | Can a first-time reader explain the target and workflow? |
| `claws:power-user` | Operational control over ceremony | Does automation replace manual translation work, including failures? |
| `claws:platform-eng` | Fleet consistency over autonomy | Are shared gates reusable without replacing owner workflows? |
| `claws:gateway-eng` | Runtime stability over governance overhead | Are rendering, fallback, and activation boundaries real? |
| `claws:founder` | Community trust over centralization | Does the proposal remain simple and owner-native? |
| `claws:ciso` | Security assurance over convenience | Are untrusted PR and trusted credential boundaries explicit? |
| `claws:lorant-reviewer` | Current-head correctness over optimistic approval | Do claims match implementation and current proof? |

## Findings and dispositions

### R1 — Target versus current state was implicit

- Roles: new-hire, founder.
- Severity: major clarity issue, not an architecture contradiction.
- Finding: the RFC clearly states 315/315 as the target but does not plainly
  state that current releases have uneven surface maturity. A casual reader can
  mistake the target for a shipped claim.
- Fix: add a short `Current state` section naming the established owner systems,
  the wizard's current three locales, remaining English/partial gaps, and the
  live tracker as the delivery source.

### R2 — Happy path omitted failure and recovery

- Roles: power-user, platform-eng, ciso.
- Severity: major operational clarity issue.
- Finding: the example shows automatic generation but not what happens when the
  provider, validation, or review fails.
- Fix: add a failure branch: publish nothing, retain English fallback, keep the
  affected target cells partial and visible, and reconcile from trusted state.

### R3 — Runtime availability appeared immediate after PR merge

- Roles: gateway-eng, lorant-reviewer.
- Severity: moderate fidelity issue.
- Finding: “after merge, the owner renders” elides the generated PR merge and
  owner artifact build/release boundary.
- Fix: show generated PR merge, owner artifact shipment, then presentation-edge
  rendering.

### R4 — “Same loop” could imply one central workflow

- Roles: platform-eng, founder.
- Severity: moderate ownership ambiguity.
- Finding: all 15 rows follow the same control loop, but UI, native, and docs do
  not use the same files or workflow name.
- Fix: say “same control loop” and explicitly preserve conforming owner
  workflows.

## Passed lenses

- The main RFC is short enough for a first read and routes detail to normative
  sidecars.
- The 15 release rows and 315-cell arithmetic are explicit and match the
  implementation evidence list.
- English source ownership, surface catalogs, rendering, publication, and
  review remain owner-controlled.
- Ordinary source PRs use credential-free detection; provider and publisher
  credentials exist only after merge on trusted protected `main`.
- Generated translations never approve or merge themselves, and safety copy
  retains stricter named review.
- Machine semantics, commands, identifiers, structured output, user data, and
  model output remain outside deterministic product translation.
- The wizard example uses real files, keys, values, workflow triggers, and
  runtime calls from OpenClaw PRs #112784 and #112801.

## Approval bar

After applying R1-R4, this panel has no remaining content blocker. RFC PR #49
still requires current-head maintainer review; this role review does not replace
Patrick's GitHub decision or the exact-head ClawSweeper result.
