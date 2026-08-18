# Flight selected users to OpenClaw Candidate

Use this guide after the OpenClaw version PR has merged, the exact
`Lobster-OpenClaw-Official` build from `main` has succeeded, and that build has
been deployed to the Candidate PlexService in both FRE islands.

Candidate flighting is an operator-managed exact-user rollout. It is not an
end-user preference, percentage flight, custom image header, or direct Redis
override.

## Values to record

Record these before changing ECS:

| Value | Source |
|---|---|
| Official build run ID | Successful `Lobster-OpenClaw-Official` run URL |
| Build identity | Exact build number, for example `YY.DDD.RR-openclaw-official` |
| Image digest | `csbuildartifactsacr.azurecr.io/lobster/openclaw:<build>` |
| Source commit | Official build's `refs/heads/main` source version |
| Role generation | `lobster.openclaw_image_roles.generation` |
| New flight generation | A nonzero value greater than every prior flight generation |
| Candidate 301/302 receipts | Successful validation and deployment run URLs |
| Test identities | Reviewed exact `(tenant_id, user_id)` pairs |

Do not continue if the build identity, digest, artifacts, or receipts disagree.

## 1. Deploy the exact build to Candidate

The Candidate release pipelines are manual and default to validation only:

- `Lobster-OpenClaw-Candidate-Prod-301-FRE`
- `Lobster-OpenClaw-Candidate-Prod-302-FRE`

Their authoritative definitions are
`.pipelines/lobster_openclaw/Prod-301-FRE-Candidate.Release.yml` and
`Prod-302-FRE-Candidate.Release.yml`.

For each run, pin the same completed `main` Official build. The pipelines consume
`drop_BuildCandidateEv2_BuildEv2` and deploy the
`lobsteropenclawcandidate` PlexService.

1. Queue 301 with `validateOnly=true`.
2. Confirm every EV2 validation stage succeeds and references the exact build.
3. Queue 301 with `validateOnly=false`.
4. Confirm deployment and application health.
5. Repeat validation and deployment for 302.
6. Record all four run URLs and the health evidence.

Never queue 301 and 302 deployment together. Do not change Active or Previous.

## 2. Prepare a fail-closed flight

In the ECS portal, author the process settings as one reviewed change while the
flight remains disabled:

```json
{
  "lobster.openclaw_image_roles": {
    "generation": "<current-role-generation>",
    "active": "runtime",
    "previous": "reserve",
    "candidate": "candidate"
  },
  "lobster.openclaw_candidate_build_identity": "<exact-build-identity>",
  "lobster.openclaw_candidate_flight_enabled": false,
  "lobster.openclaw_candidate_flight_generation": "<new-nonzero-generation>",
  "lobster.openclaw_candidate_flight_role_generation": "<current-role-generation>",
  "lobster.openclaw_candidate_flight_build_identity": "<exact-build-identity>"
}
```

The role generation and both build identities must match exactly. Missing,
malformed, stale, or mismatched values route to Active.

Do not rotate `openclaw_image_roles` to promote an image. The current production
promotion authority is the guarded 301/302 Active deployment flow.

## 3. Add exact users

For each reviewed `(tenant_id, user_id)` identity, author:

```text
lobster.openclaw_candidate_user_enabled = true
```

Keep the process flight disabled while building the audience. Record owner,
reason, tenant, user, expected duration, and removal time for every entry.

## 4. Enable Candidate admission

Publish a newer nonzero flight generation with all bindings repeated and:

```text
lobster.openclaw_candidate_flight_enabled = true
```

Candidate admission requires one fresh policy snapshot containing:

- the valid role map;
- the exact staged Candidate build;
- enabled flight state;
- matching flight, role, and build bindings; and
- exact-user eligibility.

Existing routes do not move merely because the audience changed. Arrange a
controlled route recycle/drain through the existing operator path when immediate
pickup is required. Without that action, the established route can remain durable
for 24 hours. Do not edit Redis or permit callers to select a slot.

## 5. Verify each user

For every flighted identity:

1. Start a fresh OpenClaw route.
2. Confirm routing selected the Candidate physical slot.
3. Confirm the reported OpenClaw version and build match the recorded Candidate.
4. Exercise Gateway startup, chat, streaming, tools, Teams delivery, cron, and
   workspace/state restore paths relevant to the release.
5. Recycle the Candidate container and prove state continuity.
6. Record correlation IDs, timestamps, and pass/fail results.

Stop expanding the audience on any unexplained mismatch.

## Stop or abort the flight

1. Publish a **newer** flight generation with
   `lobster.openclaw_candidate_flight_enabled=false`.
2. Confirm subsequent route resolution selects Active. The authoritative disable
   drains established Candidate routes on their next resolve.
3. Set each exact-user `lobster.openclaw_candidate_user_enabled=false`.
4. Preserve the Candidate deployment and receipts until promotion or quarantine
   is decided.

Do not reuse a prior generation to resume. Resuming requires another newer
generation bound to the current role generation and exact Candidate build.

## Exit criteria

- Candidate 301 and 302 deployment receipts are green.
- Every flighted user is recorded and removable.
- Exact version/build routing is proven.
- Container recycle and state compatibility are proven.
- No unexplained errors remain through the agreed soak.
- The flight can be disabled and users converge to Active.

Then follow [Promote Candidate to Active](active-promotion-guide.md).
