# Hosted Integration Project

Use this area to remove ProxyPipe through a three-branch decision:

1. use native Gateway, Channel, plugin-route, proxy, service-mesh, and lifecycle
   surfaces where they already own the operation;
2. promote missing semantics into an owner contract that prepares exact
   requests, trusted identity, credential slots, response policy, and replay
   behavior; and
3. add hosted physical dispatch only when the host must execute the
   owner-prepared request.

The four-area notes remain useful source audits. They are not four product
frameworks. The resulting design has no ClawBus, universal provider-adapter
registry, generic host method API, or V1 carrier catalog.

`OpenClawTransport` remains the public app SDK's client-to-Gateway
`request()`/`events()` abstraction. No hosted carrier turns it into a reverse
service bus or owns Channel, approval, lifecycle, continuity, or AgentHarness
semantics.

## Objective

Move each private Lobster semantic path into its canonical OpenClaw owner,
preserve local behavior, and expose an inactive hosted binding only where the
host supplies credentials or physical execution.

Make wiring as easy as ProxyPipe through one centrally registered host
integration bundle, typed references in owner configuration, Hosting Profiles
readiness, and one effective status/Doctor view. Owners retain activation,
generation fencing, and migration authority.

Deliver migrations as paired owner/adopter slices. Each pair must preserve
trusted identity, exact credential origins, policy intersection, replay safety,
rollback authority, and a named downstream deletion target.

## Active Notes

| Area                                                             | File                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Current session and resume state                                 | `SESSION.md`                                                                     |
| Canonical fork disposition and landing queue                     | `landing-ledger-2026-07-27.md`                                                   |
| Reviewer-facing decision and sales package                       | `decision-package.md`                                                            |
| Historical five-package fork review stack                        | `fork-review-stack.md`                                                           |
| Corrected source audit and ownership model                       | `source-audit-2026-07-11.md`                                                     |
| Internal and external comparison matrix                          | `comparison-matrix.md`                                                           |
| Runtime/operator/security/simplicity review                      | `role-review-2026-07-11.md`                                                      |
| Typed host composition and activation model                      | `host-wiring-model.md`                                                           |
| Central host integration bundle and distributed typed references | `host-integration-bundle.md`                                                     |
| Managed Configuration alignment and CAPI proof requirements      | `managed-configuration-alignment.md`                                             |
| Area 1: host integration and traffic governance                  | `area-1-host-integration-plane.md`                                               |
| Area 1 exec approval host contract                               | `area-1-exec-approval-host-contract.md`                                          |
| Area 1 Channel attachment contract                               | `area-1-channel-attachment-contract.md`                                          |
| Area 1 provider traffic governance                               | `area-1-provider-traffic-governance.md`                                          |
| Area 1 operations and attachment catalog                         | `area-1-operations-and-catalog.md`                                               |
| Area 1 focused role review                                       | `area-1-role-review-2026-07-11.md`                                               |
| Area 2: explicit host capability providers                       | `area-2-host-capability-providers.md`                                            |
| Area 2 provider-request dispatcher contract and evidence fixture | `area-2-provider-dispatch-contract.md`                                           |
| Area 2 provider-dispatch role review                             | `area-2-role-review-2026-07-11.md`                                               |
| Area 2 provider-dispatch paper evidence slice                    | `area-2-provider-dispatch-evidence-slice.md`                                     |
| Final `.craft/roles` provider assembly review                    | `provider-assembly-role-review-2026-07-11.md`                                    |
| Cross-repository implementation PR series                        | `implementation-pr-series.md`                                                    |
| Implementation PR series `.craft/roles` review                   | `implementation-pr-series-role-review-2026-07-11.md`                             |
| One-file execution plan for every PR                             | `pr-plans/README.md`                                                             |
| Final `.craft/roles` review of PR-exact plans                    | `pr-plans-role-review-2026-07-11.md`                                             |
| Restore-hold owner/adopter role review                           | `restore-hold-role-review-2026-07-12.md`                                         |
| `.craft/roles` review of the RFC PR pitch                        | `pr-body-role-review-2026-07-11.md`                                              |
| Area 3: host wiring and composition                              | `area-3-host-wiring-composition.md`                                              |
| Area 4: carrier options                                          | `area-4-carrier-options.md`                                                      |
| Area 4 provider-dispatch reverse carrier                         | `area-4-provider-dispatch-reverse-carrier.md`                                    |
| Reverse-carrier contract FACES review                            | `reverse-carrier-contract-review-2026-07-26.md`                                  |
| Reverse-carrier session admission FACES review                   | `reverse-carrier-session-admission-review-2026-07-27.md`                         |
| Reverse-carrier operation ownership FACES review                 | `reverse-carrier-operation-ownership-review-2026-07-27.md`                       |
| Reverse-carrier connection-owner FACES review                    | `reverse-carrier-connection-owner-review-2026-07-27.md`                          |
| Lobster reverse-carrier connection-owner adopter review          | `reverse-carrier-lobster-connection-owner-review-2026-07-28.md`                  |
| Lobster reverse-carrier deployment-authority review              | `reverse-carrier-lobster-deployment-authority-review-2026-07-28.md`              |
| Lobster reverse-carrier deployment-composition review            | `reverse-carrier-lobster-deployment-composition-review-2026-07-28.md`            |
| Lobster reverse-carrier deployment-selection review              | `reverse-carrier-lobster-deployment-selection-review-2026-07-28.md`              |
| Reverse-carrier generation-authority audit                       | `reverse-carrier-generation-authority-audit-2026-07-28.md`                       |
| Bounded reverse-carrier upstream landing packet                  | `bounded-reverse-carrier-owner-landing-packet-2026-07-29.md`                     |
| Bounded reverse-carrier local issue body                         | `bounded-reverse-carrier-owner-issue-body.md`                                    |
| Bounded reverse-carrier local PR body                            | `bounded-reverse-carrier-owner-pr-body.md`                                       |
| G4 Lobster runtime-peer lifecycle contract                       | `g4-lobster-runtime-peer-lifecycle-2026-07-29.md`                                |
| G4 atomic runtime-selection fork PR body                         | `g4-lobster-runtime-selection-pr-body.md`                                        |
| G4 cooldown/drain/runtime-owner fork PR body                     | `g4-lobster-runtime-owner-pr-body.md`                                            |
| Read-only status inventory FACES review                          | `status-inventory-review-2026-07-26.md`                                          |
| Lobster live status adopter review                               | `status-inventory-lobster-live-review-2026-07-26.md`                             |
| Doctor inventory FACES review                                    | `doctor-inventory-review-2026-07-27.md`                                          |
| Canonical profile runtime inventory FACES review                 | `profile-runtime-inventory-review-2026-07-27.md`                                 |
| Lobster canonical runtime inventory adopter review               | `profile-runtime-inventory-lobster-review-2026-07-27.md`                         |
| Lobster live Doctor adopter review                               | `doctor-inventory-lobster-live-review-2026-07-27.md`                             |
| Lobster reverse-carrier conformance review                       | `reverse-carrier-lobster-conformance-review-2026-07-26.md`                       |
| Cross-area ownership, lifecycle, and migration synthesis         | `four-area-architecture.md`                                                      |
| Overarching `.craft/roles` validation                            | `overarching-role-review-2026-07-11.md`                                          |
| Bundle-centered final role review                                | `bundle-centered-role-review-2026-07-11.md`                                      |
| ProxyPipe semantic and transport decomposition                   | `proxypipe-decomposition.md`                                                     |
| Candidate design and completed gates                             | `../layering-contracts/hosted-integration.md`                                    |
| OpenClawTransport fit audit                                      | `../layering-contracts/inventory/proxypipe-openclaw-transport-fit-2026-07-10.md` |
| `node.invoke` reuse decision                                     | `../layering-contracts/inventory/node-invoke-duplex-fit-2026-07-10.md`           |
| Hosted peer identity decision                                    | `../layering-contracts/inventory/hosted-peer-identity-2026-07-10.md`             |
| ProxyPipe frame inventory                                        | `../layering-contracts/inventory/proxy-pipe-frames-2026-07-10.md`                |
| Portfolio deletion ledger                                        | `../layering-contracts/lobster-deletion-ledger.md`                               |

## Active Work

| Repo                | PR                                                                    | Branch                                            | Status           | Purpose                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `giodl73-repo/rfcs` | [Fork PR 2](https://github.com/giodl73-repo/rfcs/pull/2)              | `user/giodl/rfc-duplex-transport`                 | Draft, fork-only | RFC 0020 now leads with native attachments, owner contracts, and optional hosted physical dispatch.                                          |
| `openclaw/openclaw` | [Landing ledger](landing-ledger-2026-07-27.md)                        | O1 and O4 upstream drafts; remaining fork sources | Drafts           | O1 and O4 are filed as issue-linked upstream drafts; promote later packages only after their named prerequisites and explicit authorization. |
| `giodl/lobster`     | [Landing ledger](landing-ledger-2026-07-27.md#lobster-landing-ledger) | External plugin/adopter sources                   | Draft, fork-only | Replay the inactive plugin and adopter implementation only after matching OpenClaw contracts merge and ship.                                 |

## Delivery Gates

1. Use a native owner surface before adding a hosted binding.
2. Keep semantic request preparation, identity, response handling, and replay
   policy with the owner.
3. Limit credentials to exact owner-declared origin-bound slots.
4. Keep hosted dispatch semantically empty and redirect-disabled.
5. Preserve `OpenClawTransport` and keep optional carrier mechanics below the
   dispatcher.
6. Prove local/hosted fixtures, least privilege, generations, uncertain
   outcomes, overload, redaction, and rollback.
7. Retire named private bridge mechanics in the paired adopter migration.

## Boundaries

Owners remain independent. The host integration bundle supplies packaging,
registration, and provenance; it does not replace owner configuration,
activation, readiness evidence, identity, or semantics. No dispatcher,
carrier, or readiness aggregator may widen owner authority or flatten the
contracts into a shared semantic catalog.

## Related Areas

- `projects/layering-contracts/README.md`
- `projects/managed-config/README.md`
- `projects/hosting-profiles/README.md`
- `projects/state-continuity/README.md`
