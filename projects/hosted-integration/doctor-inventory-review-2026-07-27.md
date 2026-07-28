# Host integration Doctor inventory review — 2026-07-27

## Thesis and deletion target

Doctor should translate the running Gateway's existing
`host-integration-runtime-inventory/v1` snapshot into actionable findings. It
must not introduce another inventory schema, load plugins locally, activate
integrations, repair owner state, or make readiness a startup gate.

The deletion target is the operator's manual loop of reading raw status JSON,
finding every non-ready contribution, deciding how serious it is, and locating
the next diagnostic action.

## Source audit

- Runtime inventory ownership already lives in
  `src/plugins/host-integration-runtime-inventory.ts`.
- The public Gateway method is already consumed safely by
  `resolveStatusHostIntegrationSafe`; it catches unreachable/failing reads and
  avoids local plugin loading.
- Doctor's structured `HealthFinding` contract already provides severity,
  target, requirement, and fix-hint fields. A new schema is unnecessary.
- Doctor already diagnoses Gateway reachability. An absent inventory therefore
  stays silent instead of producing a duplicate reachability finding.
- Exec-backed Gateway credentials remain opt-in. The Doctor contribution skips
  this read unless exec SecretRefs are allowed.

## External analogues

- Kubernetes conditions use a closed status (`True`, `False`, `Unknown`) plus a
  reason and human-facing message. Doctor follows the same severity distinction:
  `False` is an error and `Unknown` is a warning. See the
  [Kubernetes Status API](https://kubernetes.io/docs/reference/kubernetes-api/definitions/status-v1-meta/).
- Terraform diagnostics separate errors from warnings and pair a concise
  summary with actionable detail. Doctor similarly emits a structured severity,
  requirement code, target, and fix hint. See
  [Terraform provider diagnostics](https://developer.hashicorp.com/terraform/plugin/framework/diagnostics).

## Stakeholder findings

- Gateway engineering: use one bounded read-only RPC and fail silent when the
  Gateway or optional surface is unavailable; add no startup or hot-path work.
- Power user: identify the exact bundle/contribution and give a direct next
  command or corrective action.
- Repository stewardship: project the existing inventory into the existing
  health contract; keep all readiness ownership in the plugin/Gateway layer.
- Security: do not echo owner-controlled readiness messages, plugin IDs, owners,
  endpoints, paths, or credential material. Preserve only framework reason codes;
  collapse owner reasons to `OwnerReportedFalse` or `OwnerReportedUnknown`.

## Bounded evidence slice

Fork branch: `user/giodl/hosted-integration-doctor-inventory`, based on exact
status-inventory head `6577d46070360883c03d5941ae479f6557f6019f`.

The slice contains:

- a pure inventory-to-finding projection;
- one Doctor contribution immediately after Gateway health;
- a three-second bounded public Gateway read;
- no repair function, activation, provider acquisition, or upstream issue;
- focused coverage for severity, ordering, reason closure, redaction, and RPC
  bounds.

## Canonical recomposition

The same bounded slice is now fork draft PR 178 on branch
`user/giodl/hosted-integration-profile-doctor-inventory`, head
`2921def00dfde3fcbd935d18f3a3e4718aab3af3`, based directly on canonical Status
PR 177 at `5bdb4354da1b87dd5624849122573704850f7762`. The Doctor contribution moved
into the refactored final-contributions owner module; no behavior or scope was
added.
