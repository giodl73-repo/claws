# Hosted Integration PR Plan Role Review

## Scope

Review the execution briefs under `pr-plans/` as actual mergeable PR units,
not merely architecture milestones.

## Blocking Findings

### One file must map to one repository PR

The first draft still grouped several OpenClaw and Lobster changes into one
file. That defeats the purpose of PR-exact planning and hides cross-repository
ordering.

Required splits:

- B6 into Status inventory and Doctor integration;
- D2 and D3 into OpenClaw owner support and Lobster adoption;
- D4 by provider and repository;
- D5 by semantic owner and repository;
- E1-E3 into OpenClaw contract and Lobster implementation PRs.

### Activation and authority cutover must be ordered

F1 prepares and validates inactive selection configuration. It does not perform
the CAPI authority cutover. D2b owns the canary transition and rollback after
both repositories and traffic policy are ready.

### Managed Configuration cannot be a conditional merge gate

The ordinary OpenClaw configuration lane must prove Hosted Integration
independently. Managed Configuration exact-authority proof is a companion
integration and production recommendation, not a hidden prerequisite for the
portable interfaces.

## Gateway Engineer

Required consequences:

- split Status from Doctor to keep review surfaces bounded;
- add explicit event-loop, queue, memory, shutdown, and drain budgets to C2;
- keep binding preparation and registry discovery outside request hot paths;
- require cancellation coverage before dispatch and during stream waits.

**Verdict: approve after the PR splits and runtime budgets are explicit.**

## Lobster Container Engineer

Required consequences:

- D1b and C3 must name startup ordering, reconnect backoff, health probes,
  resource budgets, and clean shutdown behavior;
- each Lobster adoption PR must be independently deployable but inactive;
- authority cutover belongs in the final provider-specific Lobster PR;
- downstream deletion remains separate from adoption.

**Verdict: approve after operational lifecycle gates are added.**

## CISO

Required consequences:

- C2 needs explicit binding revocation and fleet disable behavior;
- credential and traffic-policy failures must remain fail-closed;
- every adoption PR must prove redaction and stable audit correlation;
- configuration, bundle, owner, and carrier generations must remain distinct;
- no optional dependency may silently bypass an authority check.

**Verdict: approve with fail-closed gates as merge criteria.**

## Platform Engineer

Required consequences:

- every wire or registration PR declares compatible versions and skew behavior;
- OpenClaw support lands inactive before Lobster emits or selects it;
- F1 prepares config, F2 owns fleet observation, and D2b owns initial canary
  authority;
- mixed-version and rollback evidence must identify the exact release floor.

**Verdict: approve after sequence correction.**

## Founder

Required consequences:

- local behavior remains the default and requires no host bundle;
- each upstream PR is independently useful outside Lobster;
- package installation never auto-activates hosted behavior;
- ordinary single-file config remains supported.

**Verdict: approve.**

## New Hire

Required consequences:

- plan titles name the owner and repository outcome;
- every failure proof names the expected operator-visible finding;
- the index separates foundational PRs, linked repository pairs, adoption, and
  cleanup.

**Verdict: approve after the index is expanded.**

## Lorant Reviewer

Required consequences:

- remove multi-repository "PR" files;
- make every dependency mechanical and acyclic;
- name the source-of-truth fixture owner;
- add negative-path proof, current-head proof, and docs updates to each PR body;
- do not accept optional cleanup language for security or lifecycle blockers.

**Verdict: blocked until the plan files map one-to-one to PRs.**

## Final Decision

The architecture remains approved. The first plan draft was not PR-exact, and
the review required revision before approval.

## Resolution

The plan set now:

1. maps all 37 files one-to-one to repository PRs;
2. splits B6, D2-D5, and E1-E3 at owner and repository boundaries;
3. places F1 inactive configuration before D2b authority cutover;
4. adds runtime, security, version-skew, redaction, revocation, and
   operator-visible proof gates;
5. keeps Managed Configuration as a companion integration rather than a hidden
   portable-interface dependency; and
6. leaves deletion in separate expiry-gated Lobster PRs.

**Final verdict: approved as the implementation planning baseline.**
