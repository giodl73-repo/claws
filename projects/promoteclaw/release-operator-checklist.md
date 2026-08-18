# PromoteClaw release operator checklist

## Before flighting

- [ ] Version PR merged.
- [ ] Exact `main` Official build succeeded.
- [ ] Build number, source commit, and ACR digest recorded.
- [ ] Candidate 301 validated and deployed.
- [ ] Candidate 302 validated and deployed.
- [ ] Candidate application health confirmed.

## Flight selected users

- [ ] Process policy authored fail-closed with flight disabled.
- [ ] Role generation and both build identities match.
- [ ] New nonzero flight generation selected.
- [ ] Exact `(tenant_id, user_id)` audience reviewed and recorded.
- [ ] Per-user Candidate eligibility enabled.
- [ ] Flight enabled with a newer generation.
- [ ] Fresh-route Candidate version/build verified for each user.
- [ ] Container recycle and state continuity verified.
- [ ] Soak completed without unexplained failures.

## Promote to Active

- [ ] Candidate flight disabled with a newer generation.
- [ ] Exact-user eligibility removed after convergence.
- [ ] Active 301 validation succeeded.
- [ ] Active 301 deployment and health succeeded.
- [ ] Active 302 validation used the 301 deployment receipt.
- [ ] Active 302 deployment and health succeeded.
- [ ] New routes report the promoted version/build.
- [ ] Previous Active build and digest retained for rollback.

## References

- [Flight selected users to Candidate](candidate-flighting-guide.md)
- [Promote Candidate to Active](active-promotion-guide.md)
- Lobster source runbook:
  `docs/operations/promoteclaw-image-promotion.md`
- Lobster flight contract:
  `docs/design/2026-07-24-openclaw-per-user-image-flighting.md`
