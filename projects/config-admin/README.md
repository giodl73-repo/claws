# Config Admin Project

Use this area for the shared Lobster/OpenClaw admin-config UX framework:
settings descriptors, preview-first save flows, OpenClaw schema/policy bridges,
doctor-style findings, and Scout CLI parity.

This is the convergence lane across Policy UX, Scout feeds admin, and future
tenant/deployment settings. Keep implementation in Lobster or OpenClaw
worktrees; use this folder for operating notes and PR stack shape.

## Active Notes

| Area            | File         |
| --------------- | ------------ |
| Session handoff | `SESSION.md` |

## Initial Direction

The first implementation slice should be small and reusable:

1. Add a typed settings descriptor registry for Lobster admin surfaces.
2. Replace ad hoc Policy UX controls with registry-backed sections.
3. Require each editable control to declare an OpenClaw policy/config path,
   doctor/check id, exposure, apply mode, and save behavior.
4. Preserve the preview-first flow: generate JSON/state, show findings/diff,
   block unsafe saves, then persist only through governed Lobster/MOS3 state.
5. Extend the same shell to Scout feed source selection and hosted admin
   mutations with dry-run/JSON/verify parity.

## Active Work

| Repo        | PR / Issue | Branch | Status   | Purpose                                                                                   |
| ----------- | ---------- | ------ | -------- | ----------------------------------------------------------------------------------------- |
| bic/lobster | TBD        | TBD    | Planning | Shared settings descriptor registry and preview/save shell for Policy and Scout admin UX. |

## Related Areas

- `projects/admin/README.md` for admin spaces, policy baseline state, and Partner Center notes.
- `projects/ux-state/README.md` for gated preview routes and design-review posture.
- `projects/policy/README.md` for OpenClaw policy conformance and doctor findings.
- `projects/feeds/README.md` and `projects/lobster/feeds-scout.md` for Scout feed contracts and admin composition.
